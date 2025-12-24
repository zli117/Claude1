# Stock Price Monitor

A comprehensive stock price monitoring UI with popular technical indicators, built with Streamlit and Plotly.

## Features

- **Real-time Stock Data**: Free data from Yahoo Finance (no API key required)
- **Interactive Candlestick Charts**: Zoom, pan, and hover for detailed information
- **Multiple Time Ranges**: 1 Day, 5 Days, 1 Week, 1 Month, 3 Months, 6 Months, 1 Year, 2 Years, 5 Years, All Time
- **Flexible Time Intervals**: 1m, 2m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo (availability depends on time range)

## Technical Indicators

### Overlay Indicators
- **SMA** (Simple Moving Average): 20, 50, 200 periods
- **EMA** (Exponential Moving Average): 12, 26 periods
- **Bollinger Bands**: 20-period with 2 standard deviations
- **VWAP** (Volume Weighted Average Price)

### Oscillators & Other Indicators
- **Volume**: Bar chart with color-coded up/down days
- **RSI** (Relative Strength Index): 14-period with overbought/oversold levels
- **MACD** (Moving Average Convergence Divergence): 12/26/9 configuration
- **Stochastic Oscillator**: %K and %D lines with overbought/oversold levels
- **ATR** (Average True Range): 14-period volatility indicator
- **OBV** (On-Balance Volume): Volume-based momentum indicator

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd Claude1
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the Streamlit app:

```bash
streamlit run app.py
```

The app will open in your default browser at `http://localhost:8501`.

### How to Use

1. **Enter a Ticker**: Type any valid stock ticker (e.g., AAPL, GOOGL, MSFT, TSLA)
2. **Select Time Range**: Choose from 1 Day to All Time
3. **Select Time Interval**: Choose candlestick intervals (options vary by time range)
4. **Toggle Indicators**: Enable/disable technical indicators from the sidebar
5. **Explore**: Hover over charts for details, zoom and pan to explore

## Data Source

This application uses **Yahoo Finance** via the `yfinance` library:
- **Cost**: Free (no API key required)
- **Rate Limits**: Reasonable for personal use
- **Data Coverage**: Most US and international stocks, ETFs, indices
- **Delay**: Real-time quotes with potential 15-minute delay for some markets

## Screenshots

The app displays:
- Company name and current price with change
- Key metrics (Open, High, Low, Volume, Market Cap, P/E, 52W High/Low)
- Interactive candlestick chart with overlays
- Separate panels for Volume, RSI, MACD, and Stochastic oscillators
- Expandable raw data table and company information

## Tech Stack

- **Frontend**: Streamlit
- **Charts**: Plotly
- **Data**: yfinance (Yahoo Finance API)
- **Indicators**: Custom implementations using NumPy/Pandas

## License

MIT License
