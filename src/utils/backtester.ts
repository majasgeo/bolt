import { Candle, BollingerBands, Trade, BacktestResult, TradingConfig } from '../types/trading';

export class Backtester {
  private config: TradingConfig;
  private trades: Trade[] = [];
  private capital: number;
  private currentTrade: Trade | null = null;
  private lastCandleUnderUpperBand = -1;
  private lastCandleOverLowerBand = -1;
  private isSecondsTimeframe: boolean = false;

  constructor(config: TradingConfig) {
    this.config = config;
    this.capital = config.initialCapital;
  }

  backtest(candles: Candle[], bands: BollingerBands[]): BacktestResult {
    this.trades = [];
    this.capital = this.config.initialCapital;
    this.currentTrade = null;
    this.lastCandleUnderUpperBand = -1;
    this.lastCandleOverLowerBand = -1;
    
    // Detect if we're working with seconds data
    this.isSecondsTimeframe = this.detectSecondsTimeframe(candles);
    console.log(`Backtester detected ${this.isSecondsTimeframe ? 'seconds' : 'minute/hour'} timeframe data`);

    for (let i = 1; i < candles.length; i++) {
      const candle = candles[i];
      const prevCandle = candles[i - 1];
      const band = bands[i];
      const prevBand = bands[i - 1];

      if (!band || !prevBand) continue;

      // Track last candle under upper band (for long positions)
      if (candle.close < band.upper) {
        this.lastCandleUnderUpperBand = i;
      }

      // Track last candle over lower band (for short positions)
      if (candle.close > band.lower) {
        this.lastCandleOverLowerBand = i;
      }

      // Long entry logic: First candle closing above upper band
      if (!this.currentTrade && 
          this.config.enableLongPositions &&
          prevCandle.close <= prevBand.upper && 
          candle.close > band.upper &&
          this.lastCandleUnderUpperBand >= 0) {
        
        this.enterLongPosition(candle, i, candles);
      }

      // Short entry logic: First candle closing below lower band
      if (!this.currentTrade && 
          this.config.enableShortPositions &&
          prevCandle.close >= prevBand.lower && 
          candle.close < band.lower &&
          this.lastCandleOverLowerBand >= 0) {
        
        this.enterShortPosition(candle, i, candles);
      }

      // Exit logic for long positions
      if (this.currentTrade && 
          this.currentTrade.position === 'long' &&
          candle.close <= band.upper && 
          prevCandle.close > prevBand.upper) {
        
        this.exitPosition(candle, i, 'strategy-exit');
      }

      // Exit logic for short positions
      if (this.currentTrade && 
          this.currentTrade.position === 'short' &&
          candle.close >= band.lower && 
          prevCandle.close < prevBand.lower) {
        
        this.exitPosition(candle, i, 'strategy-exit');
      }

      // Stop loss check for long positions
      if (this.currentTrade && 
          this.currentTrade.position === 'long' &&
          candle.low <= this.currentTrade.stopLoss) {
        
        this.exitPosition(candle, i, 'stop-loss');
      }

      // Stop loss check for short positions
      if (this.currentTrade && 
          this.currentTrade.position === 'short' &&
          candle.high >= this.currentTrade.stopLoss) {
        
        this.exitPosition(candle, i, 'stop-loss');
      }
    }

    // Close any open position
    if (this.currentTrade) {
      const lastCandle = candles[candles.length - 1];
      this.exitPosition(lastCandle, candles.length - 1, 'strategy-exit');
    }

    return this.calculateResults();
  }
  
  private detectSecondsTimeframe(candles: Candle[]): boolean {
    if (candles.length < 2) return false;
    
    // Calculate average time difference between candles
    let totalDiff = 0;
    const sampleSize = Math.min(20, candles.length - 1);
    
    for (let i = 1; i <= sampleSize; i++) {
      totalDiff += candles[i].timestamp - candles[i-1].timestamp;
    }
    
    const avgDiff = totalDiff / sampleSize;
    return avgDiff < 60000; // Less than 60 seconds = seconds timeframe
  }

  private enterLongPosition(candle: Candle, index: number, candles: Candle[]) {
    // Find stop loss level (behind last candle under upper band)
    let stopLoss = candle.close * 0.95; // Default 5% stop loss
    
    if (this.lastCandleUnderUpperBand >= 0 && this.lastCandleUnderUpperBand < index) {
      const lastCandleUnder = candles[this.lastCandleUnderUpperBand];
      stopLoss = Math.min(lastCandleUnder.low * 0.99, candle.close * 0.98);
    }

    this.currentTrade = {
      id: `trade_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'long',
      leverage: this.config.maxLeverage,
      isOpen: true
    };
  }

  private enterShortPosition(candle: Candle, index: number, candles: Candle[]) {
    // Find stop loss level (above last candle over lower band)
    let stopLoss = candle.close * 1.05; // Default 5% stop loss
    
    if (this.lastCandleOverLowerBand >= 0 && this.lastCandleOverLowerBand < index) {
      const lastCandleOver = candles[this.lastCandleOverLowerBand];
      stopLoss = Math.max(lastCandleOver.high * 1.01, candle.close * 1.02);
    }

    this.currentTrade = {
      id: `trade_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'short',
      leverage: this.config.maxLeverage,
      isOpen: true
    };
  }

  private exitPosition(candle: Candle, index: number, reason: 'stop-loss' | 'target' | 'strategy-exit') {
    if (!this.currentTrade) return;

    let exitPrice: number;
    if (reason === 'stop-loss') {
      exitPrice = this.currentTrade.stopLoss;
    } else {
      exitPrice = candle.close;
    }

    let pnl: number;
    if (this.currentTrade.position === 'long') {
      pnl = ((exitPrice - this.currentTrade.entryPrice) / this.currentTrade.entryPrice) * 
            this.config.maxLeverage * this.capital;
    } else {
      // Short position: profit when price goes down
      pnl = ((this.currentTrade.entryPrice - exitPrice) / this.currentTrade.entryPrice) * 
            this.config.maxLeverage * this.capital;
    }

    this.currentTrade.exitTime = candle.timestamp;
    this.currentTrade.exitPrice = exitPrice;
    this.currentTrade.pnl = pnl;
    this.currentTrade.isOpen = false;
    this.currentTrade.reason = reason;

    this.capital += pnl;
    this.trades.push({ ...this.currentTrade });
    this.currentTrade = null;
  }

  private calculateResults(): BacktestResult {
    const winningTrades = this.trades.filter(t => t.pnl! > 0).length;
    const losingTrades = this.trades.filter(t => t.pnl! <= 0).length;
    const longTrades = this.trades.filter(t => t.position === 'long').length;
    const shortTrades = this.trades.filter(t => t.position === 'short').length;
    const totalPnL = this.trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    // Calculate trading period
    let firstTradeTime: number | undefined;
    let lastTradeTime: number | undefined;
    let tradingPeriodDays: number | undefined;
    let averageTradesPerDay: number | undefined;

    if (this.trades.length > 0) {
      const completedTrades = this.trades.filter(t => t.exitTime);
      if (completedTrades.length > 0) {
        firstTradeTime = Math.min(...completedTrades.map(t => t.entryTime));
        lastTradeTime = Math.max(...completedTrades.map(t => t.exitTime!));
        tradingPeriodDays = (lastTradeTime - firstTradeTime) / (1000 * 60 * 60 * 24);
        averageTradesPerDay = tradingPeriodDays > 0 ? this.trades.length / tradingPeriodDays : 0;
      }
    }
    
    // Calculate max drawdown
    let peak = this.config.initialCapital;
    let maxDrawdown = 0;
    let runningCapital = this.config.initialCapital;

    for (const trade of this.trades) {
      runningCapital += trade.pnl || 0;
      if (runningCapital > peak) {
        peak = runningCapital;
      }
      const drawdown = (peak - runningCapital) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Simple Sharpe ratio calculation with timeframe adjustment
    const returns = this.trades.map(t => (t.pnl || 0) / this.config.initialCapital);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1;
    
    // Adjust annualization factor based on timeframe
    const annualizationFactor = this.isSecondsTimeframe ? 
      252 * 24 * 60 * 60 : // For seconds data
      252; // For daily data
      
    const sharpeRatio = avgReturn / Math.sqrt(returnVariance) * Math.sqrt(annualizationFactor);

    return {
      totalTrades: this.trades.length,
      winningTrades,
      losingTrades,
      winRate: this.trades.length > 0 ? winningTrades / this.trades.length : 0,
      totalPnL: totalPnL,
      maxDrawdown: maxDrawdown,
      sharpeRatio: isNaN(sharpeRatio) ? 0 : sharpeRatio,
      trades: this.trades,
      longTrades,
      shortTrades,
      firstTradeTime,
      lastTradeTime,
      tradingPeriodDays,
      averageTradesPerDay
    };
  }
}