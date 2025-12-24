const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('stockAPI', {
    // Stock data
    getQuote: (symbol) => ipcRenderer.invoke('get-quote', symbol),
    getHistorical: (options) => ipcRenderer.invoke('get-historical', options),
    searchSymbol: (query) => ipcRenderer.invoke('search-symbol', query),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // Alerts
    getAlerts: () => ipcRenderer.invoke('get-alerts'),
    addAlert: (alert) => ipcRenderer.invoke('add-alert', alert),
    removeAlert: (alertId) => ipcRenderer.invoke('remove-alert', alertId),
    clearTriggeredAlerts: () => ipcRenderer.invoke('clear-triggered-alerts'),
    onAlertsUpdated: (callback) => {
        ipcRenderer.on('alerts-updated', (event, alerts) => callback(alerts));
    },

    // Watchlist
    getWatchlist: () => ipcRenderer.invoke('get-watchlist'),
    saveWatchlist: (watchlist) => ipcRenderer.invoke('save-watchlist', watchlist)
});
