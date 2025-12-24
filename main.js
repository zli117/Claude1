const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const yahooFinance = require('yahoo-finance2').default;
const Store = require('electron-store');

// Initialize persistent storage
const store = new Store({
    defaults: {
        alerts: [],
        settings: {
            sma1Period: 20,
            sma2Period: 50,
            sma3Period: 200,
            ema1Period: 12,
            ema2Period: 26,
            rsiPeriod: 14,
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
            bollingerPeriod: 20,
            bollingerStdDev: 2
        },
        watchlist: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
    }
});

let mainWindow;
let alertCheckInterval;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#ffffff'
    });

    mainWindow.loadFile('renderer/index.html');

    // Start alert monitoring
    startAlertMonitoring();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (alertCheckInterval) {
        clearInterval(alertCheckInterval);
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers

// Fetch stock quote
ipcMain.handle('get-quote', async (event, symbol) => {
    try {
        const quote = await yahooFinance.quote(symbol);
        return { success: true, data: quote };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Fetch historical data
ipcMain.handle('get-historical', async (event, { symbol, period, interval }) => {
    try {
        const queryOptions = {
            period1: getStartDate(period),
            interval: interval
        };

        const result = await yahooFinance.chart(symbol, queryOptions);

        if (result && result.quotes) {
            return { success: true, data: result.quotes };
        }
        return { success: false, error: 'No data returned' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Search for symbols
ipcMain.handle('search-symbol', async (event, query) => {
    try {
        const results = await yahooFinance.search(query);
        return { success: true, data: results.quotes || [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Settings management
ipcMain.handle('get-settings', () => {
    return store.get('settings');
});

ipcMain.handle('save-settings', (event, settings) => {
    store.set('settings', settings);
    return { success: true };
});

// Alert management
ipcMain.handle('get-alerts', () => {
    return store.get('alerts');
});

ipcMain.handle('add-alert', (event, alert) => {
    const alerts = store.get('alerts');
    alert.id = Date.now();
    alert.triggered = false;
    alerts.push(alert);
    store.set('alerts', alerts);
    return { success: true, alerts };
});

ipcMain.handle('remove-alert', (event, alertId) => {
    let alerts = store.get('alerts');
    alerts = alerts.filter(a => a.id !== alertId);
    store.set('alerts', alerts);
    return { success: true, alerts };
});

ipcMain.handle('clear-triggered-alerts', () => {
    let alerts = store.get('alerts');
    alerts = alerts.filter(a => !a.triggered);
    store.set('alerts', alerts);
    return { success: true, alerts };
});

// Watchlist management
ipcMain.handle('get-watchlist', () => {
    return store.get('watchlist');
});

ipcMain.handle('save-watchlist', (event, watchlist) => {
    store.set('watchlist', watchlist);
    return { success: true };
});

// Helper function to calculate start date based on period
function getStartDate(period) {
    const now = new Date();
    switch (period) {
        case '1d':
            return new Date(now.setDate(now.getDate() - 1));
        case '5d':
            return new Date(now.setDate(now.getDate() - 5));
        case '1mo':
            return new Date(now.setMonth(now.getMonth() - 1));
        case '3mo':
            return new Date(now.setMonth(now.getMonth() - 3));
        case '6mo':
            return new Date(now.setMonth(now.getMonth() - 6));
        case '1y':
            return new Date(now.setFullYear(now.getFullYear() - 1));
        case '2y':
            return new Date(now.setFullYear(now.getFullYear() - 2));
        case '5y':
            return new Date(now.setFullYear(now.getFullYear() - 5));
        case 'max':
            return new Date('1970-01-01');
        default:
            return new Date(now.setMonth(now.getMonth() - 1));
    }
}

// Alert monitoring system
function startAlertMonitoring() {
    // Check alerts every 30 seconds
    alertCheckInterval = setInterval(async () => {
        const alerts = store.get('alerts');
        const activeAlerts = alerts.filter(a => !a.triggered);

        if (activeAlerts.length === 0) return;

        // Group alerts by symbol
        const symbolAlerts = {};
        activeAlerts.forEach(alert => {
            if (!symbolAlerts[alert.symbol]) {
                symbolAlerts[alert.symbol] = [];
            }
            symbolAlerts[alert.symbol].push(alert);
        });

        // Check each symbol
        for (const symbol of Object.keys(symbolAlerts)) {
            try {
                const quote = await yahooFinance.quote(symbol);
                const currentPrice = quote.regularMarketPrice;

                symbolAlerts[symbol].forEach(alert => {
                    let shouldTrigger = false;

                    if (alert.condition === 'above' && currentPrice >= alert.price) {
                        shouldTrigger = true;
                    } else if (alert.condition === 'below' && currentPrice <= alert.price) {
                        shouldTrigger = true;
                    }

                    if (shouldTrigger) {
                        // Show notification
                        new Notification({
                            title: `Price Alert: ${symbol}`,
                            body: `${symbol} is now $${currentPrice.toFixed(2)} (${alert.condition} $${alert.price.toFixed(2)})`,
                            icon: path.join(__dirname, 'renderer/icon.png')
                        }).show();

                        // Mark alert as triggered
                        alert.triggered = true;
                        alert.triggeredAt = new Date().toISOString();
                        alert.triggeredPrice = currentPrice;
                    }
                });
            } catch (error) {
                console.error(`Error checking alert for ${symbol}:`, error.message);
            }
        }

        // Save updated alerts
        store.set('alerts', alerts);

        // Notify renderer of triggered alerts
        if (mainWindow) {
            mainWindow.webContents.send('alerts-updated', alerts);
        }
    }, 30000);
}
