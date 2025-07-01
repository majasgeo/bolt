# Universal Bollinger Bands Trading Bot

A comprehensive trading bot application focused on the Bollinger Bands strategy with universal data support, backtesting, and multi-timeframe optimization capabilities.

## 🚀 Project Overview

This repository contains a powerful and flexible trading bot built with React, TypeScript, and advanced backtesting capabilities. The project is dedicated to the Bollinger Bands strategy, providing a clean and efficient interface for strategy testing and optimization across any asset class and timeframe.

## 📊 Key Features

- **Universal CSV Support**: Import data from any asset class (crypto, stocks, forex, commodities)
- **Flexible Data Handling**: Support for both OHLCV candle data and tick data (bid/ask/last)
- **Any Timeframe**: Works with seconds, minutes, hours, days - any granularity
- **Tick Data Aggregation**: Convert tick data to any timeframe candles
- **Multi-Timeframe Optimization**: Find the optimal timeframe and parameters for your asset
- **Comprehensive Backtesting**: Detailed metrics, trade logs, and performance analysis
- **Visual Charts**: See entry/exit points on price charts
- **Custom Column Mapping**: Map non-standard CSV headers to the required fields

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Charts**: HTML5 Canvas for high-performance rendering
- **Data Processing**: Papa Parse for CSV handling
- **Date Handling**: date-fns for timestamp processing
- **Icons**: Lucide React
- **Build Tool**: Vite

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/universal-bollinger-bands-bot.git

# Navigate to project directory
cd universal-bollinger-bands-bot

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📈 Strategy Details

The Bollinger Bands strategy is a technical analysis tool that uses standard deviations of price to create dynamic support and resistance levels:

- **Upper Band**: SMA + (Standard Deviation × Multiplier) + Offset
- **Middle Band**: Simple Moving Average (SMA)
- **Lower Band**: SMA - (Standard Deviation × Multiplier) - Offset

### Entry Conditions
- **Long Entry**: Price closes above upper band after being below it
- **Short Entry**: Price closes below lower band after being above it

### Exit Conditions
- **Long Exit**: Price returns to or below upper band
- **Short Exit**: Price returns to or above lower band
- **Stop Loss**: Dynamic stop loss based on recent price action

## 🔧 Configuration Options

- **Period**: SMA calculation period (2-50)
- **Standard Deviation**: Band width multiplier (1.0-3.0)
- **Offset**: Additional band offset (0-20)
- **Leverage**: Position sizing multiplier (2-125x)
- **Direction**: Long-only, short-only, or both

## 📊 Performance Metrics

The bot provides comprehensive performance metrics:
- Win rate and total trades
- Total return and P&L
- Maximum drawdown
- Sharpe ratio
- Trade frequency
- Long/short distribution

## 🔍 Optimization

### Single Timeframe Optimization
Tests thousands of parameter combinations to find the best settings:
- SMA periods (2-50)
- Standard deviations (1.0-3.0)
- Offsets (0-20)
- Leverage values (2-125x)

### Multi-Timeframe Optimization
- Tests the same parameter combinations across multiple datasets/timeframes
- Finds which timeframe works best for your asset
- Identifies parameters that work well across different timeframes
- Provides a ranked summary of results for all timeframes

## 📄 CSV Data Format Support

The application accepts CSV files with flexible formats:

### Candle Data
- `timestamp` or `date`/`time` (Unix timestamp or date string)
- `open`, `high`, `low`, `close` (OHLC prices)
- `volume` (optional)

### Tick Data
- `timestamp` or `date`/`time` (Unix timestamp or date string)
- `price` or `last` (last traded price)
- `bid` and `ask` (optional for bid/ask spread)
- `volume` (optional)

### Asset Information
- `symbol` or `ticker` or `pair` (asset identifier)
- `exchange` (optional trading venue)

## 🌐 Asset Class Support

The bot is designed to work with any asset class:

- **Cryptocurrencies**: BTC, ETH, etc. with any quote currency
- **Stocks**: Any exchange-traded equity
- **Forex**: Currency pairs like EUR/USD, GBP/JPY
- **Commodities**: Gold, silver, oil, etc.
- **Other**: Any tradable asset with price data

## 🔄 Timeframe Support

Supports any timeframe from milliseconds to weeks:

- **Ultra-Short**: 1-second, 5-second, 15-second, 30-second
- **Short**: 1-minute, 5-minute, 15-minute, 30-minute
- **Medium**: 1-hour, 4-hour
- **Long**: Daily, Weekly

## ⚠️ Disclaimer

This software is for educational and research purposes only. Trading involves risk of loss. Past performance does not guarantee future results.