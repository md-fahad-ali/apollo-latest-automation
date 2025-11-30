const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ScraperEngine = require('../scraper/engine');

let mainWindow;
const scraper = new ScraperEngine();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Scraper Events
scraper.on('log', (data) => {
    if (mainWindow) mainWindow.webContents.send('log-update', data);
});
scraper.on('stats', (data) => {
    if (mainWindow) mainWindow.webContents.send('log-update', data);
});
scraper.on('status', (data) => {
    if (mainWindow) mainWindow.webContents.send('log-update', data);
});

// IPC Handlers
ipcMain.on('start-scrape', (event, config) => {
    scraper.start(config);
});

ipcMain.on('stop-scrape', () => {
    scraper.stop();
});

ipcMain.on('save-cookies', (event, cookies) => {
    const cookiePath = path.join(app.getPath('userData'), 'apollo-cookies.json');

    // Sanitize cookies before saving
    const sanitizedCookies = cookies.map(cookie => {
        const sanitized = { ...cookie };

        // Fix sameSite - must be 'Strict', 'Lax', 'None', or undefined
        if (sanitized.sameSite !== undefined && sanitized.sameSite !== null) {
            // Convert to string if it's a number or other type
            let sameSiteValue = String(sanitized.sameSite).toLowerCase().trim();

            // Map known invalid values to valid ones
            if (sameSiteValue === 'unspecified' || sameSiteValue === 'no_restriction' || sameSiteValue === '0') {
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
        }

        // Ensure secure is true if sameSite is None (required by modern browsers)
        if (sanitized.sameSite === 'None') {
            sanitized.secure = true;
        }

        return sanitized;
    }).filter(cookie => cookie.name && cookie.value);

    fs.writeFileSync(cookiePath, JSON.stringify(sanitizedCookies, null, 2));
    if (mainWindow) mainWindow.webContents.send('log-update', {
        type: 'log',
        message: `✅ Cookies saved successfully (${sanitizedCookies.length} cookies)`
    });
});

ipcMain.on('load-cookies', (event) => {
    const cookiePath = path.join(app.getPath('userData'), 'apollo-cookies.json');
    let cookies = null;
    if (fs.existsSync(cookiePath)) {
        try {
            cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
        } catch (e) {
            console.error('Error loading cookies:', e);
        }
    }
    event.reply('cookies-loaded', cookies);
});

ipcMain.on('download-csv', async () => {
    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save CSV',
        defaultPath: 'apollo-leads.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (filePath) {
        const sourcePath = path.join(process.cwd(), 'apollo-leads.csv');
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, filePath);
            if (mainWindow) mainWindow.webContents.send('log-update', { type: 'log', message: `✅ CSV saved to ${filePath}` });
        } else {
            if (mainWindow) mainWindow.webContents.send('log-update', { type: 'log', message: '❌ No CSV file found to save' });
        }
    }
});
