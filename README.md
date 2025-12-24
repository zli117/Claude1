# Stock Price Monitor

A desktop stock price monitoring application with configurable technical indicators and price alerts, built with Electron.

## Features

- **Desktop Application**: Native app for Windows, macOS, and Linux
- **Real-time Stock Data**: Free data from Yahoo Finance (no API key required)
- **Interactive Charts**: TradingView Lightweight Charts with zoom, pan, and crosshair
- **Configurable Indicators**: Customize periods for all technical indicators
- **Price Alerts**: Set price alerts with desktop notifications
- **Watchlist**: Track multiple stocks with live price updates
- **Persistent Settings**: Your configuration is saved between sessions

## Technical Indicators

All indicator periods are fully configurable in settings:

### Overlay Indicators
- **SMA** (Simple Moving Average): Default 20, 50, 200 periods
- **EMA** (Exponential Moving Average): Default 12, 26 periods
- **Bollinger Bands**: Configurable period and standard deviation

### Coming Soon
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Stochastic Oscillator

## Price Alerts

Set alerts to be notified when:
- Price goes **above** a target price
- Price goes **below** a target price

Alerts are checked every 30 seconds and trigger desktop notifications.

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd Claude1
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the app:
   ```bash
   npm start
   ```

### Building for Production

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Usage

### Adding Stocks
1. Use the search bar to find stocks by symbol or name
2. Click on a result to add it to your watchlist

### Viewing Charts
1. Click on any stock in your watchlist
2. Use the time range buttons (1D, 5D, 1M, 3M, 6M, 1Y, 5Y, MAX)
3. Toggle indicators using the checkboxes

### Configuring Indicators
1. Click the **Settings** button
2. Adjust periods for SMA, EMA, Bollinger Bands, RSI, MACD
3. Click **Save Settings** to apply

### Setting Price Alerts
1. Click **+ Add Alert**
2. Enter the stock symbol
3. Choose condition (above/below)
4. Enter target price
5. Click **Add Alert**

## Data Source

This application uses **Yahoo Finance** via the `yahoo-finance2` library:
- **Cost**: Free (no API key required)
- **Data Coverage**: Most US and international stocks, ETFs, indices
- **Updates**: Real-time quotes with potential 15-minute delay for some markets

## Tech Stack

- **Framework**: Electron
- **Charts**: TradingView Lightweight Charts
- **Data**: yahoo-finance2
- **Storage**: electron-store (persistent settings)
- **UI**: Vanilla HTML/CSS/JavaScript

## Project Structure

```
├── main.js           # Electron main process
├── preload.js        # Secure IPC bridge
├── package.json      # Dependencies and scripts
├── renderer/
│   ├── index.html    # Main UI
│   ├── styles.css    # Styling
│   └── app.js        # UI logic and charts
```

## License

MIT License
