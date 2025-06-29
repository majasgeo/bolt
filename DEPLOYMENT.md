# Deployment Instructions

## 🚀 Quick Deploy

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Local Development
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

The application will be available at `http://localhost:5173`

### Production Build
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## 📁 Project Structure

```
BOLT-TRADING-BOTS/
├── src/
│   ├── components/          # React components for each strategy
│   │   ├── ConfigPanel.tsx
│   │   ├── DayTradingPanel.tsx
│   │   ├── FibonacciScalpingPanel.tsx
│   │   ├── UltraFastScalpingPanel.tsx
│   │   ├── EnhancedBollingerPanel.tsx
│   │   ├── BollingerFibonacciHybridPanel.tsx
│   │   ├── Chart.tsx
│   │   ├── MetricsPanel.tsx
│   │   └── DataSourcePanel.tsx
│   ├── utils/              # Strategy implementations
│   │   ├── backtester.ts
│   │   ├── bollingerBands.ts
│   │   ├── optimizer.ts
│   │   ├── dayTradingStrategy.ts
│   │   ├── fibonacciScalpingStrategy.ts
│   │   ├── ultraFastScalpingStrategy.ts
│   │   ├── enhancedBollingerStrategy.ts
│   │   └── bollingerFibonacciHybridStrategy.ts
│   ├── types/              # TypeScript definitions
│   │   └── trading.ts
│   └── App.tsx             # Main application
├── docs/                   # Strategy documentation
├── debugging/              # Debug logs and issue tracking
├── public/                 # Static assets
└── README.md              # Project overview
```

## 🔧 Configuration

### Environment Variables
No environment variables required for basic functionality.

### CSV Data Format
The application accepts CSV files with the following columns:
- `timestamp` or `date` (Unix timestamp or date string)
- `close` or `price` (required)
- `open`, `high`, `low` (optional)
- `volume` (optional)

### Supported Timeframes
- 1-minute (optimized for scalping strategies)
- 5-minute
- 15-minute
- 1-hour
- 4-hour
- Daily

## 📊 Strategy Status

| Strategy | Status | Manual Backtest | Auto-Optimization |
|----------|--------|----------------|-------------------|
| Bollinger Bands | ✅ Working | ✅ Working | ✅ Working |
| Day Trading | ✅ Working | ✅ Working | ✅ Working |
| Fibonacci Scalping | ⚠️ Issues | ❌ Errors | ✅ Working |
| Ultra-Fast Scalping | ✅ Working | ✅ Working | ✅ Working |
| Enhanced Bollinger | ✅ Working | ✅ Working | ➖ N/A |
| Bollinger + Fibonacci | ❌ Broken | ❌ Fails | ❌ Hangs |

## 🐛 Known Issues

### Critical Issues
1. **Bollinger + Fibonacci Hybrid**: Complete execution failure
2. **Fibonacci Scalping**: Manual backtest has console errors
3. **Optimization Performance**: Some strategies take 20-45 minutes

### Workarounds
1. Use working strategies (Bollinger, Day Trading, Ultra-Fast, Enhanced)
2. For Fibonacci: Use optimization results instead of manual backtest
3. For Hybrid: Strategy needs complete rewrite

## 📈 Performance Recommendations

### Hardware Requirements
- **Minimum**: 4GB RAM, modern browser
- **Recommended**: 8GB+ RAM for large datasets and optimizations
- **Browser**: Chrome, Firefox, or Safari (latest versions)

### Data Size Limits
- **Optimal**: 1,000-10,000 candles
- **Maximum**: 50,000 candles (may cause performance issues)
- **Recommendation**: Use 6-12 months of data for best results

### Optimization Guidelines
- Start with smaller parameter ranges
- Use filters to reduce computation time
- Monitor browser memory usage during optimization
- Consider closing other browser tabs during heavy optimization

## 🔒 Security Notes

### Data Privacy
- All data processing happens locally in the browser
- No data is sent to external servers
- CSV files are processed client-side only

### Trading Disclaimer
- This software is for educational and research purposes only
- Past performance does not guarantee future results
- Trading involves risk of loss
- Always test strategies thoroughly before live trading

## 🚀 Deployment Options

### Static Hosting (Recommended)
Deploy the built files to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Self-Hosted
Run on your own server using any web server:
- Nginx
- Apache
- Node.js with serve

### Docker (Optional)
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📞 Support

For issues and questions:
1. Check the `/debugging` folder for known issues
2. Review strategy-specific documentation in `/docs`
3. Verify your CSV data format matches requirements
4. Test with smaller datasets first

## 🔄 Updates

To update the project:
```bash
git pull origin main
npm install
npm run build
```

Remember to backup any custom configurations or data before updating.