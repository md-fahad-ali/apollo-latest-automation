const { app } = require('electron');
const { connect } = require("puppeteer-real-browser");
const path = require('path');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class ScraperEngine {
    constructor() {
        this.isRunning = false;
        this.browser = null;
        this.page = null;
        this.callbacks = {
            onLog: () => { },
            onStats: () => { },
            onStatus: () => { }
        };
    }

    on(event, callback) {
        if (event === 'log') this.callbacks.onLog = callback;
        if (event === 'stats') this.callbacks.onStats = callback;
        if (event === 'status') this.callbacks.onStatus = callback;
    }

    log(message) {
        console.log(message);
        this.callbacks.onLog({ type: 'log', message });
    }

    updateStats(stats) {
        this.callbacks.onStats({ type: 'stats', stats });
    }

    updateStatus(status) {
        this.callbacks.onStatus({ type: 'status', status });
    }

    async stop() {
        this.isRunning = false;
        this.updateStatus('stopping');
        this.log('🛑 Stop signal received... Finishing current action...');
    }

    async start(config) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.updateStatus('running');

        try {
            this.log("Starting browser session...");

            const { page, browser } = await connect({
                headless: false,
                defaultViewport: false,
                args: ["--start-maximized", "--disable-blink-features=AutomationControlled"],
                turnstile: true,
                disableXvfb: true,
            });

            this.browser = browser;
            this.page = page;

            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1
            });


            // Set zoom level to 75% to show more content
            try {
                const client = await page.target().createCDPSession();
                await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.0 });
            } catch (e) {
                // Fallback if CDP fails
                await page.evaluate(() => { document.body.style.zoom = '100%' });
            }

            // 1. Navigate First to set context
            this.log("Navigating to Apollo.io...");
            await page.goto("https://app.apollo.io/", { waitUntil: 'domcontentloaded', timeout: 60000 });

            // 2. Load and Set Cookies
            const cookiePath = path.join(app.getPath('userData'), 'apollo-cookies.json');
            if (fs.existsSync(cookiePath)) {
                try {
                    const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
                    const sanitizedCookies = this.sanitizeCookies(cookies);

                    if (sanitizedCookies.length > 0) {
                        await page.setCookie(...sanitizedCookies);
                        this.log(`✅ Loaded and set ${sanitizedCookies.length} cookies`);
                    }
                } catch (e) {
                    this.log(`⚠️ Error loading cookies: ${e.message}`);
                }
            }

            // 3. Reload to apply cookies
            this.log("Reloading page to apply cookies...");
            await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
            await delay(3000); // Wait for app to initialize

            // 4. Verify Login
            this.log("Verifying login status...");
            const isLoggedIn = await this.checkLoginState(page);

            if (!isLoggedIn) {
                this.log("⚠️ Login check failed. Please log in manually in the browser window.");
                this.log("Waiting for manual login...");

                // Wait for user to login
                await this.waitForLogin(page);

                // Save new cookies
                this.log("Login detected! Saving cookies...");
                const newCookies = await page.cookies();
                const sanitizedNewCookies = this.sanitizeCookies(newCookies);
                fs.writeFileSync(cookiePath, JSON.stringify(sanitizedNewCookies, null, 2));
                this.log("✅ New cookies saved successfully!");
            } else {
                this.log("✅ Login verified!");
            }

            // Navigate to target URL
            let targetUrl = config.url || 'https://app.apollo.io/#/people';
            // Force page 1
            if (targetUrl.includes('page=')) {
                targetUrl = targetUrl.replace(/page=\d+/, 'page=1');
            } else if (targetUrl.includes('?')) {
                targetUrl += '&page=1';
            } else {
                targetUrl += '?page=1';
            }

            this.log(`Navigating to target: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // Wait for list to load
            await delay(5000);

            // Check for CAPTCHA
            const hasCaptcha = await page.evaluate(() => {
                return document.querySelector('iframe[src*="captcha"]') !== null ||
                    document.querySelector('iframe[src*="recaptcha"]') !== null;
            });

            if (hasCaptcha) {
                this.log('⚠️ CAPTCHA detected! Please solve it manually in the browser.');
                this.log('Waiting 30 seconds for manual solution...');
                await delay(30000);
            }

            // Initialize CSV in Downloads folder
            const csvPath = path.join(app.getPath('downloads'), 'apollo-leads.csv');

            // Delete old CSV if exists (Fresh Start)
            if (fs.existsSync(csvPath)) {
                try {
                    fs.unlinkSync(csvPath);
                    this.log('🗑️ Deleted old CSV file to start fresh.');
                } catch (e) {
                    this.log('⚠️ Could not delete old CSV file: ' + e.message);
                }
            }

            const csvWriter = createObjectCsvWriter({
                path: csvPath,
                header: [
                    { id: 'name', title: 'Name' },
                    { id: 'email', title: 'Email' },
                    { id: 'jobTitle', title: 'Job Title' },
                    { id: 'company', title: 'Company' },
                    { id: 'location', title: 'Location' },
                    { id: 'industry', title: 'Industry' },
                    { id: 'linkedinUrl', title: 'LinkedIn URL' }
                ]
            });

            let allLeads = [];
            let currentPage = 1;
            const targetLeadCount = config.targetLeads || 200;

            while (this.isRunning && allLeads.length < targetLeadCount) {
                this.log(`\n========== Page ${currentPage} ==========`);
                this.updateStats({ leads: allLeads.length, page: currentPage });

                // Process page
                const pageLeads = await this.processCurrentPage(page);
                allLeads = allLeads.concat(pageLeads);

                await csvWriter.writeRecords(allLeads);
                this.log(`💾 Saved ${allLeads.length} leads total`);
                this.updateStats({ leads: allLeads.length, page: currentPage });

                if (allLeads.length >= targetLeadCount) break;

                // Next page
                const hasNext = await this.goToNextPage(page);
                if (!hasNext) break;

                currentPage++;
            }

            this.log('✅ Scraping complete!');
            this.updateStatus('idle');

        } catch (error) {
            this.log(`❌ Error: ${error.message}`);
            this.updateStatus('idle');
        } finally {
            this.isRunning = false;
        }
    }

    sanitizeCookies(cookies) {
        return cookies.map(cookie => {
            const sanitized = { ...cookie };

            // Fix sameSite - must be 'Strict', 'Lax', 'None', or undefined
            if (sanitized.sameSite) {
                // Convert to string if it's a number or other type
                let sameSiteValue = String(sanitized.sameSite).toLowerCase().trim();

                // Map known invalid values to valid ones
                if (['unspecified', 'no_restriction', '0'].includes(sameSiteValue)) {
                    sanitized.sameSite = 'None';
                } else if (sameSiteValue === '1') {
                    sanitized.sameSite = 'Lax';
                } else if (sameSiteValue === '2') {
                    sanitized.sameSite = 'Strict';
                } else if (['strict', 'lax', 'none'].includes(sameSiteValue)) {
                    // Capitalize first letter for valid values
                    sanitized.sameSite = sameSiteValue.charAt(0).toUpperCase() + sameSiteValue.slice(1);
                } else {
                    // Remove completely invalid values
                    delete sanitized.sameSite;
                }
            } else {
                delete sanitized.sameSite;
            }

            // Ensure secure is true if sameSite is None (required by modern browsers)
            if (sanitized.sameSite === 'None') {
                sanitized.secure = true;
            }

            return sanitized;
        }).filter(cookie => cookie.name && cookie.value);
    }

    async checkLoginState(page) {
        try {
            // Check for common elements that appear only when logged in
            return await page.evaluate(() => {
                // Check for user profile icon, nav bar, or specific dashboard elements
                const selectors = [
                    '.zp_user-profile',
                    '[data-cy="user-menu"]',
                    'div[data-testid="global-nav"]',
                    'a[href*="/settings"]'
                ];
                return selectors.some(s => document.querySelector(s) !== null) &&
                    !document.querySelector('a[href*="/login"]'); // Ensure no login link
            });
        } catch (e) {
            return false;
        }
    }

    async waitForLogin(page) {
        const maxRetries = 60; // Wait up to 3 minutes (60 * 3s)
        for (let i = 0; i < maxRetries; i++) {
            if (!this.isRunning) break;

            if (await this.checkLoginState(page)) {
                return true;
            }

            if (i % 5 === 0) this.log("   ⏳ Waiting for login...");
            await delay(3000);
        }
        throw new Error("Login timeout. Please try again.");
    }

    async processCurrentPage(page) {
        this.log('🔍 Processing current page...');
        await this.dismissPopup(page);
        await delay(2000);

        // Get all rows
        const rows = await page.$$('div[role="row"]');
        this.log(`   Found ${rows.length - 1} contacts on page`); // -1 for header

        let revealedCount = 0;

        // Iterate rows to check for emails
        for (let i = 1; i < rows.length; i++) { // Start at 1 to skip header
            if (!this.isRunning) break;
            const row = rows[i];

            try {
                // Check if email is already visible
                const hasEmail = await page.evaluate(row => {
                    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
                    return emailRegex.test(row.innerText);
                }, row);

                if (hasEmail) {
                    // Email already there, skip
                    continue;
                }

                // Email missing, look for "Access email" button IN THIS ROW
                const button = await row.$('button[data-cta-variant="secondary"]');
                if (button) {
                    const buttonText = await page.evaluate(el => el.innerText.trim(), button);
                    if (buttonText.includes('Access email')) {
                        this.log(`   📧 [${i}/${rows.length - 1}] Revealing email...`);
                        await button.click();
                        revealedCount++;
                        await delay(1500); // Wait for reveal

                        // Dismiss popup if it appears
                        if (revealedCount % 3 === 0) await this.dismissPopup(page);
                    }
                }
            } catch (e) {
                // Ignore errors for individual rows
            }
        }

        if (revealedCount > 0) {
            this.log(`   ✨ Revealed ${revealedCount} new emails`);
            await this.dismissPopup(page);
            this.log('   ⏳ Waiting for emails to load...');
            await delay(3000);
        } else {
            this.log('   ⏩ No new emails to reveal');
        }

        return await this.extractDataFromPage(page);
    }

    async extractDataFromPage(page) {
        // ... extraction logic ...
        const rows = await page.$$('div[role="row"]');
        const extractedData = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            try {
                const rowData = await page.evaluate((row) => {
                    const data = {};
                    const nameElement = row.querySelector('div[data-testid="contact-name-cell"] a');
                    data.name = nameElement ? nameElement.textContent.trim() : '';

                    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
                    const emailMatch = row.textContent.match(emailRegex);
                    data.email = emailMatch ? emailMatch[0] : '';

                    // ... other fields ...
                    const jobTitleElement = row.querySelector('.zp_YGDgt .zp_FEm_X');
                    data.jobTitle = jobTitleElement ? jobTitleElement.textContent.trim() : '';

                    const companyElement = row.querySelector('.zp_PaniY a span');
                    data.company = companyElement ? companyElement.textContent.trim() : '';

                    const locationElement = row.querySelector('div[aria-colindex="9"] .zp_FEm_X');
                    data.location = locationElement ? locationElement.textContent.trim() : '';

                    const linkedinElement = row.querySelector('a[href*="linkedin.com"]');
                    data.linkedinUrl = linkedinElement ? linkedinElement.getAttribute('href') : '';

                    const industryElement = row.querySelector('div[aria-colindex="11"] .zp_z4aAi');
                    data.industry = industryElement ? industryElement.textContent.trim() : '';

                    return data;
                }, row);

                if (rowData.name) extractedData.push(rowData);
            } catch (e) { }
        }
        return extractedData;
    }

    async dismissPopup(page) {
        try {
            const selectors = [
                'button:has-text("OK")',
                'button:has-text("Ok")',
                'div.zp_rhCaT button',
                'div.zp_HO5Jn button',
                'button[aria-label="Close"]'
            ];
            for (const selector of selectors) {
                const button = await page.$(selector);
                if (button) {
                    const isVisible = await page.evaluate(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0;
                    }, button);
                    if (isVisible) {
                        await button.click();
                        await delay(1000);
                        return true;
                    }
                }
            }
        } catch (e) { }
        return false;
    }

    async goToNextPage(page) {
        try {
            const nextButton = await page.$('button[aria-label="Next"]');
            if (!nextButton) return false;
            const isDisabled = await page.evaluate(btn => btn.disabled, nextButton);
            if (isDisabled) return false;

            await nextButton.click();
            await delay(5000);
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = ScraperEngine;
