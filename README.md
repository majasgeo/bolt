# BOLT Trading Bots Suite

An advanced trading bot application with 6 different strategies for backtesting and optimization.

## 🚀 Project Overview

This repository contains a comprehensive trading bot suite built with React, TypeScript, and advanced backtesting capabilities. The project includes 6 distinct trading strategies, each with their own optimization engines and detailed analytics.

## 📊 Trading Strategies

1. **[Bollinger Bands Bot](./docs/BOLLINGER_BANDS_BOT.md)** - Classic breakout strategy ✅ WORKING
2. **[Day Trading Bot](./docs/DAY_TRADING_BOT.md)** - Multi-signal strategy ✅ WORKING  
3. **[Fibonacci Scalping Bot](./docs/FIBONACCI_SCALPING_BOT.md)** - Pure price action scalping ⚠️ PARTIAL ISSUES
4. **[Ultra-Fast Scalping Bot](./docs/ULTRA_FAST_SCALPING_BOT.md)** - Lightning-fast micro-scalping ✅ WORKING
5. **[Enhanced Bollinger Bot](./docs/ENHANCED_BOLLINGER_BOT.md)** - Advanced Bollinger with enhancements ✅ WORKING
6. **[Bollinger + Fibonacci Hybrid Bot](./docs/BOLLINGER_FIBONACCI_HYBRID_BOT.md)** - Hybrid strategy ❌ MAJOR ISSUES

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Charts**: HTML5 Canvas for high-performance rendering
- **Data Processing**: Papa Parse for CSV handling
- **Icons**: Lucide React
- **Build Tool**: Vite

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/BOLT-TRADING-BOTS.git

# Navigate to project directory
cd BOLT-TRADING-BOTS

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📁 Project Structure

```
BOLT-TRADING-BOTS/
├── src/
│   ├── components/          # React components for each strategy
│   ├── utils/              # Strategy implementations and optimizers
│   ├── types/              # TypeScript type definitions
│   └── App.tsx             # Main application
├── docs/                   # Detailed documentation for each bot
├── debugging/              # Debug logs and issue tracking
└── README.md              # This file
```

## 🐛 Known Issues & Status

### Working Strategies ✅
- Bollinger Bands: Fully functional with optimization
- Day Trading Bot: Multi-signal strategy working well
- Ultra-Fast Scalping: High-frequency trading working
- Enhanced Bollinger: Advanced features working

### Partial Issues ⚠️
- Fibonacci Scalping: Optimization works, but manual run has console errors

### Major Issues ❌
- Bollinger + Fibonacci Hybrid: Optimization hangs, manual run fails

## 📈 Performance Features

- **Auto-Optimization**: Test thousands of parameter combinations
- **Real-time Charts**: Visual trade entry/exit points
- **Comprehensive Metrics**: Win rate, drawdown, Sharpe ratio
- **CSV Data Import**: Support for various data formats
- **Multiple Timeframes**: 1-minute to daily data support

## 🔧 Development Notes

See individual bot documentation in the `/docs` folder for:
- Implementation details
- Known bugs and fixes
- Optimization parameters
- Performance characteristics
- Debugging information

## 📊 Results Summary

| Strategy | Win Rate Target | Avg Return | Status |
|----------|----------------|------------|---------|
| Bollinger Bands | 40-60% | Variable | ✅ Working |
| Day Trading | 50%+ | 1.5% per trade | ✅ Working |
| Fibonacci Scalping | 55%+ | 1.2% per trade | ⚠️ Issues |
| Ultra-Fast | 50%+ | 0.2% per trade | ✅ Working |
| Enhanced Bollinger | 45%+ | Variable | ✅ Working |
| Hybrid Strategy | 55%+ | 1.2% per trade | ❌ Broken |

## 🤝 Contributing

This is a personal trading bot project. See debugging notes in `/debugging` folder for ongoing issues.

## ⚠️ Disclaimer

This software is for educational and research purposes only. Trading involves risk and past performance does not guarantee future results.