"""
Stock Price Monitoring UI

A comprehensive stock monitoring application with technical indicators.
Uses yfinance for free stock data and Streamlit + Plotly for visualization.
"""

import streamlit as st
import yfinance as yf
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta


# Page configuration
st.set_page_config(
    page_title="Stock Price Monitor",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for light theme styling
st.markdown("""
<style>
    .stApp {
        background-color: #ffffff;
    }
    .metric-card {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
        border: 1px solid #e9ecef;
    }
    .positive {
        color: #28a745;
    }
    .negative {
        color: #dc3545;
    }
</style>
""", unsafe_allow_html=True)


# Time range configurations
TIME_RANGES = {
    "1 Day": {"period": "1d", "default_interval": "5m"},
    "5 Days": {"period": "5d", "default_interval": "15m"},
    "1 Week": {"period": "1wk", "default_interval": "30m"},
    "1 Month": {"period": "1mo", "default_interval": "1h"},
    "3 Months": {"period": "3mo", "default_interval": "1d"},
    "6 Months": {"period": "6mo", "default_interval": "1d"},
    "1 Year": {"period": "1y", "default_interval": "1d"},
    "2 Years": {"period": "2y", "default_interval": "1d"},
    "5 Years": {"period": "5y", "default_interval": "1wk"},
    "All Time": {"period": "max", "default_interval": "1wk"},
}

# Available intervals based on time range
INTERVALS = {
    "1 Day": ["1m", "2m", "5m", "15m", "30m", "1h"],
    "5 Days": ["5m", "15m", "30m", "1h"],
    "1 Week": ["15m", "30m", "1h", "1d"],
    "1 Month": ["30m", "1h", "1d"],
    "3 Months": ["1h", "1d", "1wk"],
    "6 Months": ["1d", "1wk"],
    "1 Year": ["1d", "1wk", "1mo"],
    "2 Years": ["1d", "1wk", "1mo"],
    "5 Years": ["1d", "1wk", "1mo"],
    "All Time": ["1d", "1wk", "1mo"],
}

INTERVAL_LABELS = {
    "1m": "1 Minute",
    "2m": "2 Minutes",
    "5m": "5 Minutes",
    "15m": "15 Minutes",
    "30m": "30 Minutes",
    "1h": "1 Hour",
    "1d": "1 Day",
    "1wk": "1 Week",
    "1mo": "1 Month",
}


def sma(series: pd.Series, window: int) -> pd.Series:
    """Calculate Simple Moving Average."""
    return series.rolling(window=window).mean()


def ema(series: pd.Series, window: int) -> pd.Series:
    """Calculate Exponential Moving Average."""
    return series.ewm(span=window, adjust=False).mean()


def rsi(series: pd.Series, window: int = 14) -> pd.Series:
    """Calculate Relative Strength Index."""
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.ewm(com=window - 1, min_periods=window).mean()
    avg_loss = loss.ewm(com=window - 1, min_periods=window).mean()

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def bollinger_bands(series: pd.Series, window: int = 20, num_std: float = 2.0):
    """Calculate Bollinger Bands."""
    middle = series.rolling(window=window).mean()
    std = series.rolling(window=window).std()
    upper = middle + (std * num_std)
    lower = middle - (std * num_std)
    return upper, middle, lower


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """Calculate MACD."""
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def stochastic(high: pd.Series, low: pd.Series, close: pd.Series, k_window: int = 14, d_window: int = 3):
    """Calculate Stochastic Oscillator."""
    lowest_low = low.rolling(window=k_window).min()
    highest_high = high.rolling(window=k_window).max()
    stoch_k = 100 * (close - lowest_low) / (highest_high - lowest_low)
    stoch_d = stoch_k.rolling(window=d_window).mean()
    return stoch_k, stoch_d


def atr(high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14) -> pd.Series:
    """Calculate Average True Range."""
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return true_range.rolling(window=window).mean()


def obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    """Calculate On-Balance Volume."""
    direction = np.where(close > close.shift(1), 1, np.where(close < close.shift(1), -1, 0))
    return (volume * direction).cumsum()


def vwap(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series) -> pd.Series:
    """Calculate Volume Weighted Average Price."""
    typical_price = (high + low + close) / 3
    return (typical_price * volume).cumsum() / volume.cumsum()


def calculate_indicators(df: pd.DataFrame, indicators: dict) -> pd.DataFrame:
    """Calculate technical indicators for the dataframe."""
    df = df.copy()

    # Simple Moving Averages
    if indicators.get("sma_20"):
        df["SMA_20"] = sma(df["Close"], 20)
    if indicators.get("sma_50"):
        df["SMA_50"] = sma(df["Close"], 50)
    if indicators.get("sma_200"):
        df["SMA_200"] = sma(df["Close"], 200)

    # Exponential Moving Averages
    if indicators.get("ema_12"):
        df["EMA_12"] = ema(df["Close"], 12)
    if indicators.get("ema_26"):
        df["EMA_26"] = ema(df["Close"], 26)

    # Bollinger Bands
    if indicators.get("bollinger"):
        df["BB_Upper"], df["BB_Middle"], df["BB_Lower"] = bollinger_bands(df["Close"], 20, 2)

    # RSI
    if indicators.get("rsi"):
        df["RSI"] = rsi(df["Close"], 14)

    # MACD
    if indicators.get("macd"):
        df["MACD"], df["MACD_Signal"], df["MACD_Hist"] = macd(df["Close"], 12, 26, 9)

    # Stochastic Oscillator
    if indicators.get("stochastic"):
        df["Stoch_K"], df["Stoch_D"] = stochastic(df["High"], df["Low"], df["Close"], 14, 3)

    # Average True Range
    if indicators.get("atr"):
        df["ATR"] = atr(df["High"], df["Low"], df["Close"], 14)

    # On-Balance Volume
    if indicators.get("obv"):
        df["OBV"] = obv(df["Close"], df["Volume"])

    # VWAP (Volume Weighted Average Price)
    if indicators.get("vwap"):
        df["VWAP"] = vwap(df["High"], df["Low"], df["Close"], df["Volume"])

    return df


def create_chart(df: pd.DataFrame, ticker: str, indicators: dict) -> go.Figure:
    """Create the main stock chart with indicators."""

    # Determine number of subplot rows needed
    rows = 1  # Main chart
    if indicators.get("volume"):
        rows += 1
    if indicators.get("rsi"):
        rows += 1
    if indicators.get("macd"):
        rows += 1
    if indicators.get("stochastic"):
        rows += 1

    # Calculate row heights
    row_heights = [0.5]  # Main chart takes 50%
    remaining = 0.5
    extra_rows = rows - 1
    if extra_rows > 0:
        height_per_row = remaining / extra_rows
        row_heights.extend([height_per_row] * extra_rows)

    # Create subplots
    subplot_titles = [f"{ticker} Price"]
    if indicators.get("volume"):
        subplot_titles.append("Volume")
    if indicators.get("rsi"):
        subplot_titles.append("RSI (14)")
    if indicators.get("macd"):
        subplot_titles.append("MACD")
    if indicators.get("stochastic"):
        subplot_titles.append("Stochastic")

    fig = make_subplots(
        rows=rows,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=row_heights,
        subplot_titles=subplot_titles
    )

    current_row = 1

    # Candlestick chart
    fig.add_trace(
        go.Candlestick(
            x=df.index,
            open=df["Open"],
            high=df["High"],
            low=df["Low"],
            close=df["Close"],
            name="Price",
            increasing_line_color="#00d26a",
            decreasing_line_color="#ff4757",
        ),
        row=current_row,
        col=1
    )

    # Add moving averages to main chart
    colors = {
        "SMA_20": "#ffaa00",
        "SMA_50": "#00aaff",
        "SMA_200": "#ff00aa",
        "EMA_12": "#00ff88",
        "EMA_26": "#8800ff",
    }

    for ma in ["SMA_20", "SMA_50", "SMA_200", "EMA_12", "EMA_26"]:
        if ma in df.columns:
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df[ma],
                    name=ma.replace("_", " "),
                    line=dict(color=colors[ma], width=1.5),
                ),
                row=current_row,
                col=1
            )

    # Bollinger Bands
    if "BB_Upper" in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["BB_Upper"],
                name="BB Upper",
                line=dict(color="rgba(100, 149, 237, 0.8)", width=1),
            ),
            row=current_row,
            col=1
        )
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["BB_Lower"],
                name="BB Lower",
                line=dict(color="rgba(100, 149, 237, 0.8)", width=1),
                fill="tonexty",
                fillcolor="rgba(100, 149, 237, 0.15)",
            ),
            row=current_row,
            col=1
        )

    # VWAP
    if "VWAP" in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["VWAP"],
                name="VWAP",
                line=dict(color="#ff6600", width=1.5, dash="dash"),
            ),
            row=current_row,
            col=1
        )

    # Volume chart
    if indicators.get("volume"):
        current_row += 1
        colors = ["#00d26a" if df["Close"].iloc[i] >= df["Open"].iloc[i] else "#ff4757"
                  for i in range(len(df))]
        fig.add_trace(
            go.Bar(
                x=df.index,
                y=df["Volume"],
                name="Volume",
                marker_color=colors,
                opacity=0.7,
            ),
            row=current_row,
            col=1
        )

        # Add OBV if enabled
        if "OBV" in df.columns:
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df["OBV"],
                    name="OBV",
                    line=dict(color="#ffaa00", width=1),
                    yaxis="y" + str(current_row * 2),
                ),
                row=current_row,
                col=1
            )

    # RSI chart
    if indicators.get("rsi") and "RSI" in df.columns:
        current_row += 1
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["RSI"],
                name="RSI",
                line=dict(color="#aa00ff", width=1.5),
            ),
            row=current_row,
            col=1
        )
        # Add overbought/oversold lines
        fig.add_hline(y=70, line_dash="dash", line_color="red", opacity=0.5, row=current_row, col=1)
        fig.add_hline(y=30, line_dash="dash", line_color="green", opacity=0.5, row=current_row, col=1)
        fig.add_hline(y=50, line_dash="dot", line_color="gray", opacity=0.3, row=current_row, col=1)

    # MACD chart
    if indicators.get("macd") and "MACD" in df.columns:
        current_row += 1
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["MACD"],
                name="MACD",
                line=dict(color="#00aaff", width=1.5),
            ),
            row=current_row,
            col=1
        )
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["MACD_Signal"],
                name="Signal",
                line=dict(color="#ffaa00", width=1.5),
            ),
            row=current_row,
            col=1
        )
        colors = ["#00d26a" if val >= 0 else "#ff4757" for val in df["MACD_Hist"]]
        fig.add_trace(
            go.Bar(
                x=df.index,
                y=df["MACD_Hist"],
                name="Histogram",
                marker_color=colors,
                opacity=0.5,
            ),
            row=current_row,
            col=1
        )

    # Stochastic chart
    if indicators.get("stochastic") and "Stoch_K" in df.columns:
        current_row += 1
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["Stoch_K"],
                name="%K",
                line=dict(color="#00aaff", width=1.5),
            ),
            row=current_row,
            col=1
        )
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["Stoch_D"],
                name="%D",
                line=dict(color="#ffaa00", width=1.5),
            ),
            row=current_row,
            col=1
        )
        fig.add_hline(y=80, line_dash="dash", line_color="red", opacity=0.5, row=current_row, col=1)
        fig.add_hline(y=20, line_dash="dash", line_color="green", opacity=0.5, row=current_row, col=1)

    # Update layout
    fig.update_layout(
        title=dict(
            text=f"{ticker} Stock Analysis",
            font=dict(size=24, color="#333333"),
        ),
        template="plotly_white",
        paper_bgcolor="#ffffff",
        plot_bgcolor="#ffffff",
        height=200 + (rows * 200),
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1,
            font=dict(size=10, color="#333333"),
        ),
        xaxis_rangeslider_visible=False,
        hovermode="x unified",
    )

    # Update axes
    fig.update_xaxes(
        gridcolor="#e9ecef",
        showgrid=True,
    )
    fig.update_yaxes(
        gridcolor="#e9ecef",
        showgrid=True,
    )

    return fig


def format_number(num: float) -> str:
    """Format large numbers with K, M, B suffixes."""
    if num is None or pd.isna(num):
        return "N/A"
    if abs(num) >= 1e12:
        return f"${num/1e12:.2f}T"
    if abs(num) >= 1e9:
        return f"${num/1e9:.2f}B"
    if abs(num) >= 1e6:
        return f"${num/1e6:.2f}M"
    if abs(num) >= 1e3:
        return f"${num/1e3:.2f}K"
    return f"${num:.2f}"


def main():
    """Main application function."""

    st.title("📈 Stock Price Monitor")
    st.markdown("Real-time stock analysis with technical indicators")

    # Sidebar
    with st.sidebar:
        st.header("⚙️ Settings")

        # Ticker input
        ticker = st.text_input(
            "Stock Ticker",
            value="AAPL",
            max_chars=10,
            help="Enter a valid stock ticker symbol (e.g., AAPL, GOOGL, MSFT)"
        ).upper().strip()

        # Time range selection
        time_range = st.selectbox(
            "Time Range",
            options=list(TIME_RANGES.keys()),
            index=6,  # Default to 1 Year
            help="Select the time period to analyze"
        )

        # Interval selection based on time range
        available_intervals = INTERVALS[time_range]
        default_interval = TIME_RANGES[time_range]["default_interval"]
        default_idx = available_intervals.index(default_interval) if default_interval in available_intervals else 0

        interval = st.selectbox(
            "Time Interval",
            options=available_intervals,
            index=default_idx,
            format_func=lambda x: INTERVAL_LABELS.get(x, x),
            help="Select the candlestick time interval"
        )

        st.divider()

        # Indicators section
        st.header("📊 Indicators")

        # Overlay Indicators
        st.subheader("Overlays")
        col1, col2 = st.columns(2)
        with col1:
            sma_20 = st.checkbox("SMA 20", value=True)
            sma_50 = st.checkbox("SMA 50", value=True)
            sma_200 = st.checkbox("SMA 200", value=False)
        with col2:
            ema_12 = st.checkbox("EMA 12", value=False)
            ema_26 = st.checkbox("EMA 26", value=False)
            vwap = st.checkbox("VWAP", value=False)

        bollinger = st.checkbox("Bollinger Bands", value=True)

        st.subheader("Oscillators")
        volume = st.checkbox("Volume", value=True)
        obv = st.checkbox("On-Balance Volume", value=False)
        rsi = st.checkbox("RSI (14)", value=True)
        macd = st.checkbox("MACD", value=True)
        stochastic = st.checkbox("Stochastic", value=False)
        atr = st.checkbox("ATR (14)", value=False)

        # Collect indicators
        indicators = {
            "sma_20": sma_20,
            "sma_50": sma_50,
            "sma_200": sma_200,
            "ema_12": ema_12,
            "ema_26": ema_26,
            "bollinger": bollinger,
            "volume": volume,
            "obv": obv,
            "rsi": rsi,
            "macd": macd,
            "stochastic": stochastic,
            "atr": atr,
            "vwap": vwap,
        }

        # Refresh button
        st.divider()
        refresh = st.button("🔄 Refresh Data", use_container_width=True)

    # Main content
    if ticker:
        try:
            with st.spinner(f"Loading data for {ticker}..."):
                # Fetch stock data
                stock = yf.Ticker(ticker)
                period = TIME_RANGES[time_range]["period"]

                df = stock.history(period=period, interval=interval)

                if df.empty:
                    st.error(f"No data found for ticker: {ticker}. Please check the symbol and try again.")
                    return

                # Get stock info
                info = stock.info

                # Display company info
                company_name = info.get("longName", ticker)
                st.header(f"{company_name} ({ticker})")

                # Current price and change
                current_price = df["Close"].iloc[-1]
                prev_price = df["Close"].iloc[-2] if len(df) > 1 else current_price
                price_change = current_price - prev_price
                price_change_pct = (price_change / prev_price) * 100 if prev_price != 0 else 0

                # Price metrics row
                col1, col2, col3, col4, col5 = st.columns(5)

                with col1:
                    st.metric(
                        "Current Price",
                        f"${current_price:.2f}",
                        f"{price_change:+.2f} ({price_change_pct:+.2f}%)"
                    )

                with col2:
                    st.metric("Open", f"${df['Open'].iloc[-1]:.2f}")

                with col3:
                    st.metric("High", f"${df['High'].iloc[-1]:.2f}")

                with col4:
                    st.metric("Low", f"${df['Low'].iloc[-1]:.2f}")

                with col5:
                    st.metric("Volume", f"{df['Volume'].iloc[-1]:,.0f}")

                st.divider()

                # Additional info row
                col1, col2, col3, col4 = st.columns(4)

                with col1:
                    market_cap = info.get("marketCap")
                    st.metric("Market Cap", format_number(market_cap) if market_cap else "N/A")

                with col2:
                    pe_ratio = info.get("trailingPE")
                    st.metric("P/E Ratio", f"{pe_ratio:.2f}" if pe_ratio else "N/A")

                with col3:
                    high_52w = info.get("fiftyTwoWeekHigh")
                    st.metric("52W High", f"${high_52w:.2f}" if high_52w else "N/A")

                with col4:
                    low_52w = info.get("fiftyTwoWeekLow")
                    st.metric("52W Low", f"${low_52w:.2f}" if low_52w else "N/A")

                st.divider()

                # Calculate indicators
                df = calculate_indicators(df, indicators)

                # Create and display chart
                fig = create_chart(df, ticker, indicators)
                st.plotly_chart(fig, use_container_width=True)

                # Display ATR if enabled
                if indicators.get("atr") and "ATR" in df.columns:
                    st.info(f"📊 Current ATR (14): {df['ATR'].iloc[-1]:.2f}")

                # Data table (collapsible)
                with st.expander("📋 View Raw Data"):
                    display_cols = ["Open", "High", "Low", "Close", "Volume"]
                    # Add indicator columns that exist
                    for col in df.columns:
                        if col not in display_cols and col not in ["Dividends", "Stock Splits"]:
                            display_cols.append(col)

                    st.dataframe(
                        df[display_cols].tail(50).round(2),
                        use_container_width=True
                    )

                # Stock info (collapsible)
                with st.expander("ℹ️ Company Information"):
                    info_cols = st.columns(2)

                    with info_cols[0]:
                        st.write(f"**Sector:** {info.get('sector', 'N/A')}")
                        st.write(f"**Industry:** {info.get('industry', 'N/A')}")
                        st.write(f"**Country:** {info.get('country', 'N/A')}")
                        st.write(f"**Employees:** {info.get('fullTimeEmployees', 'N/A'):,}" if info.get('fullTimeEmployees') else "**Employees:** N/A")

                    with info_cols[1]:
                        st.write(f"**Dividend Yield:** {info.get('dividendYield', 0)*100:.2f}%" if info.get('dividendYield') else "**Dividend Yield:** N/A")
                        st.write(f"**Beta:** {info.get('beta', 'N/A')}")
                        st.write(f"**Avg Volume:** {info.get('averageVolume', 0):,}" if info.get('averageVolume') else "**Avg Volume:** N/A")
                        st.write(f"**EPS:** ${info.get('trailingEps', 'N/A')}" if info.get('trailingEps') else "**EPS:** N/A")

                    if info.get("longBusinessSummary"):
                        st.write("**About:**")
                        st.write(info.get("longBusinessSummary", "No description available."))

        except Exception as e:
            st.error(f"Error loading data: {str(e)}")
            st.info("Please check if the ticker symbol is valid and try again.")

    # Footer
    st.divider()
    st.markdown(
        """
        <div style="text-align: center; color: #6c757d;">
            Data provided by Yahoo Finance via yfinance |
            Built with Streamlit & Plotly
        </div>
        """,
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()
