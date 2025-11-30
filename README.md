# Apollo Automation App

A powerful, automated lead scraper for Apollo.io, built with Electron, React, and Puppeteer.

## 🚀 Features

- **Automated Scraping**: Navigates Apollo.io to find and extract lead information.
- **Smart Email Revealing**:
    - Checks if an email is already visible before clicking "Access email".
    - Saves credits by skipping already revealed contacts.
- **Robust Login System**:
    - Supports automated cookie-based login.
    - Falls back to manual login if cookies are expired.
    - **Auto-Save**: Automatically saves new cookies after a successful manual login.
- **Duplicate Prevention**:
    - Clears the previous CSV file at the start of a new run to ensure fresh data.
- **Cross-Platform**: Runs on Windows and Linux.

## 🛠️ Installation

### Prerequisites
- **Node.js** 16.x or higher ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download here](https://git-scm.com/))

### Quick Install (Recommended)

#### For Linux/Mac:
```bash
# Clone the repository
git clone https://github.com/md-fahad-ali/apollo-latest-automation.git
cd apollo-latest-automation

# Run the installation script
chmod +x install.sh
./install.sh
```

#### For Windows:
```powershell
# Clone the repository
git clone https://github.com/md-fahad-ali/apollo-latest-automation.git
cd apollo-latest-automation

# Run the installation script (PowerShell)
.\install.ps1
```

> **Note**: On Windows, you may need to enable script execution:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### Manual Installation

If the automated scripts don't work, you can install manually:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/md-fahad-ali/apollo-latest-automation.git
    cd apollo-latest-automation
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## 💻 Development

To run the application in development mode (with hot-reload):

```bash
npm run start-app
```

> **Note**: Developer Tools are disabled by default. Uncomment `mainWindow.webContents.openDevTools()` in `src/main/main.js` to enable them.

## 📦 Building for Production

To create a distributable application (executable):

```bash
npm run dist
```

### Output Locations
- **Linux**: `dist-electron/Apollo Automation-0.0.0.AppImage`
- **Windows**: `dist-electron/Apollo Automation-0.0.0.exe` (requires building on Windows)

## 📂 File Locations

When running the installed application:

- **Leads CSV**: Saved to your **Downloads** folder (`~/Downloads/apollo-leads.csv`).
- **Cookies**: Saved to the application data directory:
    - **Linux**: `~/.config/Apollo Automation/apollo-cookies.json`
    - **Windows**: `%APPDATA%\Apollo Automation\apollo-cookies.json`

## 🔧 Troubleshooting

- **Browser doesn't open**: Ensure you have a stable internet connection. The app uses `puppeteer-real-browser` which may need to download a specific Chrome version on the first run.
- **Login fails**: If the app gets stuck on the login page, log in manually. The app will detect the login and save your session for next time.
- **CSV is empty**: Ensure the scraper is actually running and finding leads. Check the logs in the application dashboard.
