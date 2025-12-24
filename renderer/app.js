// Global state
let currentSymbol = 'AAPL';
let currentPeriod = '1y';
let currentInterval = '1d';
let settings = {};
let priceChart = null;
let volumeChart = null;
let priceSeries = null;
let volumeSeries = null;
let sma1Series = null;
let sma2Series = null;
let sma3Series = null;
let ema1Series = null;
let bbUpperSeries = null;
let bbLowerSeries = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadWatchlist();
    await loadAlerts();
    initializeCharts();
    setupEventListeners();
    loadStock(currentSymbol);

    // Listen for alert updates from main process
    window.stockAPI.onAlertsUpdated((alerts) => {
        renderAlerts(alerts);
    });
});

// Load settings from storage
async function loadSettings() {
    settings = await window.stockAPI.getSettings();
    updateSettingsUI();
    updateIndicatorLabels();
}

// Update settings UI
function updateSettingsUI() {
    document.getElementById('setSMA1').value = settings.sma1Period;
    document.getElementById('setSMA2').value = settings.sma2Period;
    document.getElementById('setSMA3').value = settings.sma3Period;
    document.getElementById('setEMA1').value = settings.ema1Period;
    document.getElementById('setEMA2').value = settings.ema2Period;
    document.getElementById('setBBPeriod').value = settings.bollingerPeriod;
    document.getElementById('setBBStdDev').value = settings.bollingerStdDev;
    document.getElementById('setRSIPeriod').value = settings.rsiPeriod;
    document.getElementById('setMACDFast').value = settings.macdFast;
    document.getElementById('setMACDSlow').value = settings.macdSlow;
    document.getElementById('setMACDSignal').value = settings.macdSignal;
}

// Update indicator labels in the UI
function updateIndicatorLabels() {
    document.getElementById('sma1Label').textContent = settings.sma1Period;
    document.getElementById('sma2Label').textContent = settings.sma2Period;
    document.getElementById('sma3Label').textContent = settings.sma3Period;
    document.getElementById('ema1Label').textContent = settings.ema1Period;
}

// Initialize TradingView Lightweight Charts
function initializeCharts() {
    const priceContainer = document.getElementById('priceChart');
    const volumeContainer = document.getElementById('volumeChart');

    // Price chart
    priceChart = LightweightCharts.createChart(priceContainer, {
        layout: {
            background: { type: 'solid', color: '#ffffff' },
            textColor: '#333',
        },
        grid: {
            vertLines: { color: '#e1e1e1' },
            horzLines: { color: '#e1e1e1' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#e1e1e1',
        },
        timeScale: {
            borderColor: '#e1e1e1',
            timeVisible: true,
        },
        handleScroll: true,
        handleScale: true,
    });

    // Candlestick series
    priceSeries = priceChart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
    });

    // SMA series
    sma1Series = priceChart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        title: `SMA ${settings.sma1Period}`,
    });

    sma2Series = priceChart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 1,
        title: `SMA ${settings.sma2Period}`,
    });

    sma3Series = priceChart.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 1,
        title: `SMA ${settings.sma3Period}`,
    });

    ema1Series = priceChart.addLineSeries({
        color: '#06b6d4',
        lineWidth: 1,
        title: `EMA ${settings.ema1Period}`,
    });

    // Bollinger Bands
    bbUpperSeries = priceChart.addLineSeries({
        color: 'rgba(100, 149, 237, 0.6)',
        lineWidth: 1,
        title: 'BB Upper',
    });

    bbLowerSeries = priceChart.addLineSeries({
        color: 'rgba(100, 149, 237, 0.6)',
        lineWidth: 1,
        title: 'BB Lower',
    });

    // Volume chart
    volumeChart = LightweightCharts.createChart(volumeContainer, {
        layout: {
            background: { type: 'solid', color: '#ffffff' },
            textColor: '#333',
        },
        grid: {
            vertLines: { color: '#e1e1e1' },
            horzLines: { color: '#e1e1e1' },
        },
        rightPriceScale: {
            borderColor: '#e1e1e1',
        },
        timeScale: {
            borderColor: '#e1e1e1',
            visible: false,
        },
        handleScroll: false,
        handleScale: false,
    });

    volumeSeries = volumeChart.addHistogramSeries({
        color: '#3b82f6',
        priceFormat: {
            type: 'volume',
        },
    });

    // Sync time scales
    priceChart.timeScale().subscribeVisibleTimeRangeChange(() => {
        const timeRange = priceChart.timeScale().getVisibleRange();
        if (timeRange) {
            volumeChart.timeScale().setVisibleRange(timeRange);
        }
    });

    // Handle resize
    const resizeCharts = () => {
        priceChart.applyOptions({ width: priceContainer.clientWidth, height: priceContainer.clientHeight });
        volumeChart.applyOptions({ width: volumeContainer.clientWidth, height: volumeContainer.clientHeight });
    };

    window.addEventListener('resize', resizeCharts);
    resizeCharts();
}

// Setup event listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('symbolSearch');
    const searchResults = document.getElementById('searchResults');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 1) {
            searchResults.classList.remove('active');
            return;
        }

        searchTimeout = setTimeout(async () => {
            const result = await window.stockAPI.searchSymbol(query);
            if (result.success && result.data.length > 0) {
                renderSearchResults(result.data);
            } else {
                searchResults.classList.remove('active');
            }
        }, 300);
    });

    searchInput.addEventListener('blur', () => {
        setTimeout(() => searchResults.classList.remove('active'), 200);
    });

    // Time range buttons
    document.getElementById('timeRangeButtons').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#timeRangeButtons button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentPeriod = e.target.dataset.period;
            currentInterval = e.target.dataset.interval;
            loadStock(currentSymbol);
        }
    });

    // Indicator toggles
    ['showSMA1', 'showSMA2', 'showSMA3', 'showEMA1', 'showBB', 'showVolume'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => updateChartVisibility());
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('active');
    });

    // Add alert button
    document.getElementById('addAlertBtn').addEventListener('click', () => {
        document.getElementById('alertSymbol').value = currentSymbol;
        document.getElementById('alertModal').classList.add('active');
    });

    // Clear triggered alerts
    document.getElementById('clearTriggeredBtn').addEventListener('click', async () => {
        const result = await window.stockAPI.clearTriggeredAlerts();
        if (result.success) {
            renderAlerts(result.alerts);
        }
    });
}

// Render search results
function renderSearchResults(results) {
    const container = document.getElementById('searchResults');
    container.innerHTML = results.slice(0, 10).map(item => `
        <div class="search-result-item" data-symbol="${item.symbol}">
            <div class="symbol">${item.symbol}</div>
            <div class="name">${item.shortname || item.longname || ''}</div>
        </div>
    `).join('');

    container.classList.add('active');

    container.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const symbol = item.dataset.symbol;
            document.getElementById('symbolSearch').value = '';
            container.classList.remove('active');
            addToWatchlist(symbol);
            loadStock(symbol);
        });
    });
}

// Load watchlist
async function loadWatchlist() {
    const watchlist = await window.stockAPI.getWatchlist();
    renderWatchlist(watchlist);
}

// Render watchlist
async function renderWatchlist(symbols) {
    const container = document.getElementById('watchlist');
    container.innerHTML = '<div class="loading">Loading...</div>';

    const items = await Promise.all(symbols.map(async (symbol) => {
        const result = await window.stockAPI.getQuote(symbol);
        if (result.success) {
            const quote = result.data;
            const change = quote.regularMarketChangePercent || 0;
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changeSign = change >= 0 ? '+' : '';
            return `
                <div class="watchlist-item ${symbol === currentSymbol ? 'active' : ''}" data-symbol="${symbol}">
                    <div>
                        <div class="symbol">${symbol}</div>
                        <div class="change ${changeClass}">${changeSign}${change.toFixed(2)}%</div>
                    </div>
                    <div class="price">$${(quote.regularMarketPrice || 0).toFixed(2)}</div>
                </div>
            `;
        }
        return `
            <div class="watchlist-item" data-symbol="${symbol}">
                <div class="symbol">${symbol}</div>
                <div class="price">--</div>
            </div>
        `;
    }));

    container.innerHTML = items.join('');

    container.querySelectorAll('.watchlist-item').forEach(item => {
        item.addEventListener('click', () => {
            const symbol = item.dataset.symbol;
            loadStock(symbol);
            container.querySelectorAll('.watchlist-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// Add to watchlist
async function addToWatchlist(symbol) {
    let watchlist = await window.stockAPI.getWatchlist();
    if (!watchlist.includes(symbol)) {
        watchlist.push(symbol);
        await window.stockAPI.saveWatchlist(watchlist);
        renderWatchlist(watchlist);
    }
}

// Load stock data
async function loadStock(symbol) {
    currentSymbol = symbol;

    // Update header
    document.getElementById('stockName').textContent = 'Loading...';
    document.getElementById('stockSymbol').textContent = symbol;
    document.getElementById('currentPrice').textContent = '--';
    document.getElementById('priceChange').textContent = '--';

    // Fetch quote
    const quoteResult = await window.stockAPI.getQuote(symbol);
    if (quoteResult.success) {
        updateQuoteDisplay(quoteResult.data);
    }

    // Fetch historical data
    const histResult = await window.stockAPI.getHistorical({
        symbol,
        period: currentPeriod,
        interval: currentInterval
    });

    if (histResult.success) {
        updateCharts(histResult.data);
    }
}

// Update quote display
function updateQuoteDisplay(quote) {
    document.getElementById('stockName').textContent = quote.shortName || quote.longName || quote.symbol;
    document.getElementById('stockSymbol').textContent = quote.symbol;

    const price = quote.regularMarketPrice || 0;
    const change = quote.regularMarketChange || 0;
    const changePercent = quote.regularMarketChangePercent || 0;
    const changeClass = change >= 0 ? 'positive' : 'negative';
    const changeSign = change >= 0 ? '+' : '';

    document.getElementById('currentPrice').textContent = `$${price.toFixed(2)}`;

    const priceChangeEl = document.getElementById('priceChange');
    priceChangeEl.textContent = `${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
    priceChangeEl.className = `price-change ${changeClass}`;

    // Update details
    document.getElementById('detailOpen').textContent = `$${(quote.regularMarketOpen || 0).toFixed(2)}`;
    document.getElementById('detailHigh').textContent = `$${(quote.regularMarketDayHigh || 0).toFixed(2)}`;
    document.getElementById('detailLow').textContent = `$${(quote.regularMarketDayLow || 0).toFixed(2)}`;
    document.getElementById('detailVolume').textContent = formatNumber(quote.regularMarketVolume || 0);
    document.getElementById('detailMarketCap').textContent = formatMarketCap(quote.marketCap);
    document.getElementById('detailPE').textContent = quote.trailingPE ? quote.trailingPE.toFixed(2) : '--';
    document.getElementById('detail52High').textContent = `$${(quote.fiftyTwoWeekHigh || 0).toFixed(2)}`;
    document.getElementById('detail52Low').textContent = `$${(quote.fiftyTwoWeekLow || 0).toFixed(2)}`;
}

// Update charts with data
function updateCharts(data) {
    if (!data || data.length === 0) return;

    // Format candlestick data
    const candleData = data.map(d => ({
        time: Math.floor(new Date(d.date).getTime() / 1000),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
    })).filter(d => d.open && d.high && d.low && d.close);

    // Format volume data
    const volumeData = data.map((d, i) => ({
        time: Math.floor(new Date(d.date).getTime() / 1000),
        value: d.volume,
        color: d.close >= d.open ? '#10b98166' : '#ef444466',
    })).filter(d => d.value);

    // Set data
    priceSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // Calculate and set indicators
    const closes = data.map(d => d.close).filter(c => c);

    // SMA 1
    const sma1Data = calculateSMA(data, settings.sma1Period);
    sma1Series.setData(sma1Data);

    // SMA 2
    const sma2Data = calculateSMA(data, settings.sma2Period);
    sma2Series.setData(sma2Data);

    // SMA 3
    const sma3Data = calculateSMA(data, settings.sma3Period);
    sma3Series.setData(sma3Data);

    // EMA 1
    const ema1Data = calculateEMA(data, settings.ema1Period);
    ema1Series.setData(ema1Data);

    // Bollinger Bands
    const bbData = calculateBollingerBands(data, settings.bollingerPeriod, settings.bollingerStdDev);
    bbUpperSeries.setData(bbData.upper);
    bbLowerSeries.setData(bbData.lower);

    // Update visibility
    updateChartVisibility();

    // Fit content
    priceChart.timeScale().fitContent();
    volumeChart.timeScale().fitContent();
}

// Calculate SMA
function calculateSMA(data, period) {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close || 0;
        }
        if (data[i].close) {
            result.push({
                time: Math.floor(new Date(data[i].date).getTime() / 1000),
                value: sum / period,
            });
        }
    }
    return result;
}

// Calculate EMA
function calculateEMA(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = null;

    for (let i = 0; i < data.length; i++) {
        if (!data[i].close) continue;

        if (ema === null) {
            // First EMA is SMA
            if (i >= period - 1) {
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    sum += data[i - j].close;
                }
                ema = sum / period;
                result.push({
                    time: Math.floor(new Date(data[i].date).getTime() / 1000),
                    value: ema,
                });
            }
        } else {
            ema = (data[i].close - ema) * multiplier + ema;
            result.push({
                time: Math.floor(new Date(data[i].date).getTime() / 1000),
                value: ema,
            });
        }
    }
    return result;
}

// Calculate Bollinger Bands
function calculateBollingerBands(data, period, stdDev) {
    const upper = [];
    const lower = [];

    for (let i = period - 1; i < data.length; i++) {
        if (!data[i].close) continue;

        let sum = 0;
        const values = [];
        for (let j = 0; j < period; j++) {
            const val = data[i - j].close || 0;
            sum += val;
            values.push(val);
        }
        const sma = sum / period;

        // Calculate standard deviation
        const squaredDiffs = values.map(v => Math.pow(v - sma, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        const std = Math.sqrt(avgSquaredDiff);

        const time = Math.floor(new Date(data[i].date).getTime() / 1000);
        upper.push({ time, value: sma + (std * stdDev) });
        lower.push({ time, value: sma - (std * stdDev) });
    }

    return { upper, lower };
}

// Update chart visibility based on checkboxes
function updateChartVisibility() {
    sma1Series.applyOptions({ visible: document.getElementById('showSMA1').checked });
    sma2Series.applyOptions({ visible: document.getElementById('showSMA2').checked });
    sma3Series.applyOptions({ visible: document.getElementById('showSMA3').checked });
    ema1Series.applyOptions({ visible: document.getElementById('showEMA1').checked });

    const showBB = document.getElementById('showBB').checked;
    bbUpperSeries.applyOptions({ visible: showBB });
    bbLowerSeries.applyOptions({ visible: showBB });

    const volumeContainer = document.getElementById('volumeChart');
    volumeContainer.style.display = document.getElementById('showVolume').checked ? 'block' : 'none';
}

// Format number
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
}

// Format market cap
function formatMarketCap(num) {
    if (!num) return '--';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + num.toFixed(2);
}

// Settings modal functions
function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

async function saveSettings() {
    settings = {
        sma1Period: parseInt(document.getElementById('setSMA1').value),
        sma2Period: parseInt(document.getElementById('setSMA2').value),
        sma3Period: parseInt(document.getElementById('setSMA3').value),
        ema1Period: parseInt(document.getElementById('setEMA1').value),
        ema2Period: parseInt(document.getElementById('setEMA2').value),
        bollingerPeriod: parseInt(document.getElementById('setBBPeriod').value),
        bollingerStdDev: parseFloat(document.getElementById('setBBStdDev').value),
        rsiPeriod: parseInt(document.getElementById('setRSIPeriod').value),
        macdFast: parseInt(document.getElementById('setMACDFast').value),
        macdSlow: parseInt(document.getElementById('setMACDSlow').value),
        macdSignal: parseInt(document.getElementById('setMACDSignal').value),
    };

    await window.stockAPI.saveSettings(settings);
    updateIndicatorLabels();
    closeSettingsModal();

    // Reload current stock to apply new settings
    loadStock(currentSymbol);
}

// Alert modal functions
function closeAlertModal() {
    document.getElementById('alertModal').classList.remove('active');
}

async function addAlert() {
    const symbol = document.getElementById('alertSymbol').value.toUpperCase().trim();
    const condition = document.getElementById('alertCondition').value;
    const price = parseFloat(document.getElementById('alertPrice').value);

    if (!symbol || !price) {
        alert('Please fill in all fields');
        return;
    }

    const result = await window.stockAPI.addAlert({ symbol, condition, price });
    if (result.success) {
        renderAlerts(result.alerts);
        closeAlertModal();
    }
}

// Load alerts
async function loadAlerts() {
    const alerts = await window.stockAPI.getAlerts();
    renderAlerts(alerts);
}

// Render alerts
function renderAlerts(alerts) {
    const container = document.getElementById('alertsList');

    if (alerts.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 12px;">No alerts set</div>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.triggered ? 'triggered' : ''}">
            <div class="alert-info">
                <div class="alert-symbol">${alert.symbol}</div>
                <div class="alert-condition">${alert.condition === 'above' ? '↑' : '↓'} $${alert.price.toFixed(2)}</div>
            </div>
            <button class="remove-alert" data-id="${alert.id}">&times;</button>
        </div>
    `).join('');

    container.querySelectorAll('.remove-alert').forEach(btn => {
        btn.addEventListener('click', async () => {
            const result = await window.stockAPI.removeAlert(parseInt(btn.dataset.id));
            if (result.success) {
                renderAlerts(result.alerts);
            }
        });
    });
}

// Make functions available globally for onclick handlers
window.closeSettingsModal = closeSettingsModal;
window.saveSettings = saveSettings;
window.closeAlertModal = closeAlertModal;
window.addAlert = addAlert;
