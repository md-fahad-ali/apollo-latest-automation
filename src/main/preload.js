const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    startScrape: (config) => ipcRenderer.send('start-scrape', config),
    stopScrape: () => ipcRenderer.send('stop-scrape'),
    onLog: (callback) => ipcRenderer.on('log-update', (event, data) => callback(data)),
    saveCookies: (cookies) => ipcRenderer.send('save-cookies', cookies),
    loadCookies: (callback) => {
        ipcRenderer.send('load-cookies');
        ipcRenderer.once('cookies-loaded', (event, data) => callback(data));
    },
    downloadCsv: () => ipcRenderer.send('download-csv'),
});
