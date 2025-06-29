import { Candle, BollingerBands, Trade, BacktestResult, TradingConfig } from '../types/trading';

export interface UltraFastScalpingConfig extends TradingConfig {
  // Ultra-fast scalping settings
  maxHoldingSeconds: number; // Maximum holding time in SECONDS (not minutes)
  quickProfitTarget: number; // Very small profit target (0.1% - 0.5%)
  tightStopLoss: number; // Very tight stop loss (0.05% - 0.2%)
  
  // Speed optimizations
  enableInstantEntry: boolean; // Enter immediately on signal
  enableInstantExit: boolean; // Exit immediately on target/stop
  enableMicroProfits: boolean; // Take profits on tiny movements
  
  // 1-minute specific settings
  enableTickConfirmation: boolean; // Confirm with tick data simulation
  minPriceMovement: number; // Minimum price movement to consider (0.01%)
  maxSlippage: number; // Maximum slippage tolerance
  
  // Ultra-aggressive settings
  enableScalpMode: boolean; // Pure scalping mode
  scalpTargetTicks: number; // Target in price ticks
  scalpStopTicks: number; // Stop loss in price ticks
  
  // Speed filters
  enableVelocityFilter: boolean; // Only trade on fast price movements
  velocityThreshold: number; // Minimum price velocity
  
  // Micro-timeframe analysis
  enableSubMinuteAnalysis: boolean; // Analyze within 1-minute candles
  subMinutePeriods: number; // Number of sub-periods to analyze
}

export class UltraFastScalpingBot {
  private config: UltraFastScalpingConfig;
  private trades: Trade[] = [];
  private capital: number;
  private currentTrade: Trade | null = null;
  private lastEntryTime: number = 0;
  private consecutiveWins: number = 0;
  private consecutiveLosses: number = 0;

  constructor(config: UltraFastScalpingConfig) {
    this.config = config;
    this.capital = config.initialCapital;
  }

  backtest(candles: Candle[], bands: BollingerBands[]): BacktestResult {
    this.trades = [];
    this.capital = this.config.initialCapital;
    this.currentTrade = null;
    this.lastEntryTime = 0;
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;

    // Detect if we're working with seconds data
    const isSecondsData = this.detectSecondsTimeframe(candles);
    console.log(`Ultra-Fast Scalping Bot detected ${isSecondsData ? 'seconds' : 'minute'} timeframe data`);

    // Calculate ultra-fast indicators
    const priceVelocity = this.calculatePriceVelocity(candles, isSecondsData);
    const microTrends = this.config.enableSubMinuteAnalysis ? 
      this.analyzeSubMinuteTrends(candles, isSecondsData) : [];

    for (let i = Math.max(this.config.period, 5) + 1; i < candles.length; i++) {
      const candle = candles[i];
      const prevCandle = candles[i - 1];
      const band = bands[i];
      const prevBand = bands[i - 1];

      if (!band || !prevBand) continue;

      // Ultra-fast exit check (check every candle for open positions)
      if (this.currentTrade) {
        if (this.shouldUltraFastExit(candle, band, i, candles, isSecondsData)) {
          this.exitPosition(candle, i, this.getExitReason(candle, band));
          continue;
        }
      }

      // Prevent overtrading (minimum time between trades)
      // For seconds data, use a shorter cooldown (1 second)
      const minCooldown = isSecondsData ? 1000 : 5000; // 1 second for seconds data, 5 seconds otherwise
      if (candle.timestamp - this.lastEntryTime < minCooldown) {
        continue;
      }

      // Ultra-fast entry logic
      if (!this.currentTrade) {
        if (this.config.enableLongPositions && 
            this.isUltraFastLongEntry(candle, prevCandle, band, prevBand, priceVelocity[i], microTrends[i])) {
          this.enterLongPosition(candle, i);
        } else if (this.config.enableShortPositions && 
                   this.isUltraFastShortEntry(candle, prevCandle, band, prevBand, priceVelocity[i], microTrends[i])) {
          this.enterShortPosition(candle, i);
        }
      }
    }

    // Close any open position
    if (this.currentTrade) {
      const lastCandle = candles[candles.length - 1];
      this.exitPosition(lastCandle, candles.length - 1, 'time-limit');
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

  private calculatePriceVelocity(candles: Candle[], isSecondsData: boolean): number[] {
    const velocity: number[] = [];
    
    // Adjust lookback period based on timeframe
    const lookbackPeriods = isSecondsData ? 10 : 3; // 10 seconds or 3 minutes
    
    for (let i = 0; i < candles.length; i++) {
      if (i < lookbackPeriods) {
        velocity.push(0);
        continue;
      }

      // Calculate price velocity over lookback period
      const priceChange = candles[i].close - candles[i - lookbackPeriods].close;
      const timeChange = (candles[i].timestamp - candles[i - lookbackPeriods].timestamp) / 1000; // seconds
      
      // For seconds data, calculate % per second, otherwise % per minute
      const timeUnit = isSecondsData ? 1 : 60;
      const priceVelocity = Math.abs(priceChange / candles[i - lookbackPeriods].close) / (timeChange / timeUnit);
      
      velocity.push(priceVelocity);
    }

    return velocity;
  }

  private analyzeSubMinuteTrends(candles: Candle[], isSecondsData: boolean): string[] {
    const trends: string[] = [];
    
    // Adjust lookback based on timeframe
    const lookbackPeriods = isSecondsData ? 
      this.config.subMinutePeriods * 5 : // More periods for seconds data
      this.config.subMinutePeriods;
    
    for (let i = 0; i < candles.length; i++) {
      if (i < lookbackPeriods) {
        trends.push('neutral');
        continue;
      }

      // Analyze trend within the last few candles
      const recentCandles = candles.slice(i - lookbackPeriods, i + 1);
      const startPrice = recentCandles[0].close;
      const endPrice = recentCandles[recentCandles.length - 1].close;
      
      // Adjust threshold based on timeframe (lower for seconds)
      const threshold = isSecondsData ? this.config.minPriceMovement * 0.5 : this.config.minPriceMovement;
      const priceChange = (endPrice - startPrice) / startPrice;

      if (priceChange > threshold) {
        trends.push('bullish');
      } else if (priceChange < -threshold) {
        trends.push('bearish');
      } else {
        trends.push('neutral');
      }
    }

    return trends;
  }

  private isUltraFastLongEntry(
    candle: Candle, 
    prevCandle: Candle, 
    band: BollingerBands, 
    prevBand: BollingerBands,
    velocity: number,
    microTrend: string
  ): boolean {
    // Ultra-fast entry conditions for scalping
    const conditions = [];

    // 1. Bollinger Band breakout (INSTANT)
    if (this.config.enableInstantEntry) {
      conditions.push(prevCandle.close <= prevBand.upper && candle.close > band.upper);
    } else {
      // Traditional BB breakout
      conditions.push(prevCandle.close <= prevBand.upper && candle.close > band.upper);
    }

    // 2. Price velocity filter (only trade on fast movements)
    if (this.config.enableVelocityFilter) {
      conditions.push(velocity >= this.config.velocityThreshold);
    }

    // 3. Micro-trend confirmation
    if (this.config.enableSubMinuteAnalysis) {
      conditions.push(microTrend === 'bullish' || microTrend === 'neutral');
    }

    // 4. Scalp mode - pure price action
    if (this.config.enableScalpMode) {
      const priceMovement = (candle.close - prevCandle.close) / prevCandle.close;
      conditions.push(priceMovement > this.config.minPriceMovement);
    }

    // 5. Tick confirmation (simulated)
    if (this.config.enableTickConfirmation) {
      // Simulate tick data - check if high is significantly above close
      const tickStrength = (candle.high - candle.open) / candle.open;
      conditions.push(tickStrength > this.config.minPriceMovement);
    }

    // Require at least 2 conditions for ultra-fast entry
    return conditions.filter(Boolean).length >= 2;
  }

  private isUltraFastShortEntry(
    candle: Candle, 
    prevCandle: Candle, 
    band: BollingerBands, 
    prevBand: BollingerBands,
    velocity: number,
    microTrend: string
  ): boolean {
    // Ultra-fast short entry conditions
    const conditions = [];

    // 1. Bollinger Band breakdown (INSTANT)
    if (this.config.enableInstantEntry) {
      conditions.push(prevCandle.close >= prevBand.lower && candle.close < band.lower);
    } else {
      conditions.push(prevCandle.close >= prevBand.lower && candle.close < band.lower);
    }

    // 2. Price velocity filter
    if (this.config.enableVelocityFilter) {
      conditions.push(velocity >= this.config.velocityThreshold);
    }

    // 3. Micro-trend confirmation
    if (this.config.enableSubMinuteAnalysis) {
      conditions.push(microTrend === 'bearish' || microTrend === 'neutral');
    }

    // 4. Scalp mode
    if (this.config.enableScalpMode) {
      const priceMovement = (prevCandle.close - candle.close) / prevCandle.close;
      conditions.push(priceMovement > this.config.minPriceMovement);
    }

    // 5. Tick confirmation
    if (this.config.enableTickConfirmation) {
      const tickStrength = (candle.open - candle.low) / candle.open;
      conditions.push(tickStrength > this.config.minPriceMovement);
    }

    return conditions.filter(Boolean).length >= 2;
  }

  private shouldUltraFastExit(candle: Candle, band: BollingerBands, index: number, candles: Candle[], isSecondsData: boolean): boolean {
    if (!this.currentTrade) return false;

    // 1. Time-based exit (ULTRA FAST - seconds)
    // For seconds data, we might want to hold for the exact configured time
    // For minute data, we convert the seconds to candle count
    const holdingTime = candle.timestamp - this.currentTrade.entryTime;
    const maxHoldingTime = this.config.maxHoldingSeconds * 1000;
    
    if (holdingTime >= maxHoldingTime) {
      return true;
    }

    // 2. Micro profit target
    if (this.config.enableMicroProfits) {
      const currentProfit = this.currentTrade.position === 'long' 
        ? (candle.close - this.currentTrade.entryPrice) / this.currentTrade.entryPrice
        : (this.currentTrade.entryPrice - candle.close) / this.currentTrade.entryPrice;

      if (currentProfit >= this.config.quickProfitTarget) {
        return true;
      }
    }

    // 3. Scalp mode exits
    if (this.config.enableScalpMode) {
      const priceDiff = this.currentTrade.position === 'long' 
        ? candle.close - this.currentTrade.entryPrice
        : this.currentTrade.entryPrice - candle.close;

      // Adjust tick size based on timeframe
      const tickSize = this.getTickSize(candle.close, isSecondsData);

      // Exit on target ticks
      if (priceDiff >= this.config.scalpTargetTicks * tickSize) {
        return true;
      }

      // Exit on stop ticks
      if (priceDiff <= -this.config.scalpStopTicks * tickSize) {
        return true;
      }
    }

    // 4. Instant exit on signal reversal
    if (this.config.enableInstantExit) {
      if (this.currentTrade.position === 'long' && candle.close <= band.upper) {
        return true;
      }
      if (this.currentTrade.position === 'short' && candle.close >= band.lower) {
        return true;
      }
    }

    // 5. Tight stop loss
    const currentLoss = this.currentTrade.position === 'long' 
      ? (this.currentTrade.entryPrice - candle.close) / this.currentTrade.entryPrice
      : (candle.close - this.currentTrade.entryPrice) / this.currentTrade.entryPrice;

    if (currentLoss >= this.config.tightStopLoss) {
      return true;
    }

    return false;
  }

  private getExitReason(candle: Candle, band: BollingerBands): 'target' | 'stop-loss' | 'strategy-exit' | 'time-limit' {
    if (!this.currentTrade) return 'strategy-exit';

    const holdingTime = candle.timestamp - this.currentTrade.entryTime;
    if (holdingTime >= this.config.maxHoldingSeconds * 1000) {
      return 'time-limit';
    }

    const currentProfit = this.currentTrade.position === 'long' 
      ? (candle.close - this.currentTrade.entryPrice) / this.currentTrade.entryPrice
      : (this.currentTrade.entryPrice - candle.close) / this.currentTrade.entryPrice;

    if (currentProfit >= this.config.quickProfitTarget) {
      return 'target';
    }

    const currentLoss = this.currentTrade.position === 'long' 
      ? (this.currentTrade.entryPrice - candle.close) / this.currentTrade.entryPrice
      : (candle.close - this.currentTrade.entryPrice) / this.currentTrade.entryPrice;

    if (currentLoss >= this.config.tightStopLoss) {
      return 'stop-loss';
    }

    return 'strategy-exit';
  }

  private getTickSize(price: number, isSecondsData: boolean = false): number {
    // Smaller tick sizes for seconds data
    const multiplier = isSecondsData ? 0.2 : 1.0;
    
    // Estimate tick size based on price level
    if (price < 1) return 0.0001 * multiplier;
    if (price < 10) return 0.001 * multiplier;
    if (price < 100) return 0.01 * multiplier;
    if (price < 1000) return 0.1 * multiplier;
    return 1.0 * multiplier;
  }

  private enterLongPosition(candle: Candle, index: number) {
    // Ultra-tight stop loss for scalping
    const stopLoss = candle.close * (1 - this.config.tightStopLoss);

    this.currentTrade = {
      id: `ultrafast_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'long',
      leverage: this.config.maxLeverage,
      isOpen: true
    };

    this.lastEntryTime = candle.timestamp;
  }

  private enterShortPosition(candle: Candle, index: number) {
    const stopLoss = candle.close * (1 + this.config.tightStopLoss);

    this.currentTrade = {
      id: `ultrafast_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'short',
      leverage: this.config.maxLeverage,
      isOpen: true
    };

    this.lastEntryTime = candle.timestamp;
  }

  private exitPosition(candle: Candle, index: number, reason: 'stop-loss' | 'target' | 'strategy-exit' | 'time-limit') {
    if (!this.currentTrade) return;

    let exitPrice = candle.close;

    // Apply slippage for ultra-fast exits
    if (this.config.maxSlippage > 0) {
      const slippage = this.currentTrade.position === 'long' ? -this.config.maxSlippage : this.config.maxSlippage;
      exitPrice = candle.close * (1 + slippage);
    }

    let pnl: number;
    if (this.currentTrade.position === 'long') {
      pnl = ((exitPrice - this.currentTrade.entryPrice) / this.currentTrade.entryPrice) * 
            this.config.maxLeverage * this.capital;
    } else {
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

    // Track consecutive wins/losses for momentum
    if (pnl > 0) {
      this.consecutiveWins++;
      this.consecutiveLosses = 0;
    } else {
      this.consecutiveLosses++;
      this.consecutiveWins = 0;
    }

    this.currentTrade = null;
  }

  private calculateResults(): BacktestResult {
    const winningTrades = this.trades.filter(t => t.pnl! > 0).length;
    const losingTrades = this.trades.filter(t => t.pnl! <= 0).length;
    const longTrades = this.trades.filter(t => t.position === 'long').length;
    const shortTrades = this.trades.filter(t => t.position === 'short').length;
    const totalPnL = this.trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    // Calculate average trade duration in seconds
    const completedTrades = this.trades.filter(t => t.exitTime);
    const avgTradeDurationSeconds = completedTrades.length > 0 
      ? completedTrades.reduce((sum, t) => sum + (t.exitTime! - t.entryTime), 0) / completedTrades.length / 1000
      : 0;

    // Calculate trading period
    let firstTradeTime: number | undefined;
    let lastTradeTime: number | undefined;
    let tradingPeriodDays: number | undefined;
    let averageTradesPerDay: number | undefined;

    if (completedTrades.length > 0) {
      firstTradeTime = Math.min(...completedTrades.map(t => t.entryTime));
      lastTradeTime = Math.max(...completedTrades.map(t => t.exitTime!));
      tradingPeriodDays = (lastTradeTime - firstTradeTime) / (1000 * 60 * 60 * 24);
      averageTradesPerDay = tradingPeriodDays > 0 ? this.trades.length / tradingPeriodDays : 0;
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

    // Detect if we're working with seconds data
    const isSecondsData = avgTradeDurationSeconds < 60;
    
    // Ultra-fast Sharpe ratio (adjusted for high-frequency trading)
    const returns = this.trades.map(t => (t.pnl || 0) / this.config.initialCapital);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1;
    
    // Adjust annualization factor based on timeframe
    const annualizationFactor = isSecondsData ? 
      252 * 24 * 60 * 60 : // Seconds data
      252 * 24 * 60;       // Minute data
      
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

// Helper function to create ultra-fast config
export function createUltraFastConfig(basicConfig: TradingConfig): UltraFastScalpingConfig {
  // Detect if we're likely working with seconds data based on period
  const isLikelySecondsData = basicConfig.period < 10;
  
  return {
    ...basicConfig,
    // Ultra-fast scalping settings (AGGRESSIVE)
    maxHoldingSeconds: isLikelySecondsData ? 15 : 30, // 15 seconds for seconds data, 30 for minute
    quickProfitTarget: isLikelySecondsData ? 0.001 : 0.002, // 0.1% for seconds, 0.2% for minute
    tightStopLoss: isLikelySecondsData ? 0.0005 : 0.001, // 0.05% for seconds, 0.1% for minute
    
    // Speed optimizations
    enableInstantEntry: true,
    enableInstantExit: true,
    enableMicroProfits: true,
    
    // 1-minute specific
    enableTickConfirmation: true,
    minPriceMovement: isLikelySecondsData ? 0.0002 : 0.0005, // Smaller for seconds
    maxSlippage: isLikelySecondsData ? 0.0001 : 0.0002, // Smaller for seconds
    
    // Ultra-aggressive
    enableScalpMode: true,
    scalpTargetTicks: 3, // 3 ticks profit
    scalpStopTicks: 2, // 2 ticks stop
    
    // Speed filters
    enableVelocityFilter: true,
    velocityThreshold: isLikelySecondsData ? 0.0005 : 0.001, // Smaller for seconds
    
    // Micro-timeframe
    enableSubMinuteAnalysis: true,
    subMinutePeriods: isLikelySecondsData ? 5 : 3 // More periods for seconds
  };
}