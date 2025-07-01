# Bollinger Bands Trading Bot

A standalone trading bot application focused on the Bollinger Bands strategy with backtesting and optimization capabilities.

## 🚀 Project Overview

This repository contains a focused trading bot built with React, TypeScript, and advanced backtesting capabilities. The project is dedicated to the Bollinger Bands strategy, providing a clean and efficient interface for strategy testing and optimization.

## 📊 Features

- **Bollinger Bands Strategy**: Classic breakout strategy with customizable parameters
- **Auto-Optimization**: Test thousands of parameter combinations to find the best settings
- **Backtesting Engine**: Comprehensive backtesting with detailed metrics
- **Visual Charts**: See entry/exit points on price charts
- **CSV Import**: Support for various data formats and timeframes
- **Multiple Timeframe Support**: Works with seconds, minutes, hours, and daily data
- **Risk Management**: Built-in stop losses and position sizing

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Charts**: HTML5 Canvas for high-performance rendering
- **Data Processing**: Papa Parse for CSV handling
- **Icons**: Lucide React
- **Build Tool**: Vite

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/bollinger-bands-bot.git

# Navigate to project directory
cd bollinger-bands-bot

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

The optimization engine tests thousands of parameter combinations to find the best settings:
- SMA periods (2-50)
- Standard deviations (1.0-3.0)
- Offsets (0-20)
- Leverage values (2-125x)

Results are scored based on:
- Total return (35%)
- Win rate (15%)
- Sharpe ratio (20%)
- Drawdown (15%)
- Trade frequency (10%)
- Leverage risk (5%)

## 📄 CSV Data Format

The application accepts CSV files with the following columns:
- `timestamp` or `date` (Unix timestamp or date string)
- `close` or `price` (required)
- `open`, `high`, `low` (optional)
- `volume` (optional)

## ⚠️ Disclaimer

This software is for educational and research purposes only. Trading involves risk of loss. Past performance does not guarantee future results.