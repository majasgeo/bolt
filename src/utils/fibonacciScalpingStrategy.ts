import { Candle, BollingerBands, Trade, BacktestResult, TradingConfig } from '../types/trading';

export interface FibonacciScalpingConfig extends TradingConfig {
  // Fibonacci settings
  swingLookback: number; // How many candles to look back for swing points
  fibRetracementLevels: number[]; // Fibonacci levels to use (0.382, 0.5, 0.618, etc.)
  goldenZoneMin: number; // Minimum of golden zone (0.5)
  goldenZoneMax: number; // Maximum of golden zone (0.618)
  
  // Structure break settings
  structureBreakConfirmation: number; // Candles to confirm structure break
  minSwingSize: number; // Minimum swing size in percentage
  
  // Risk management
  profitTarget: number; // Profit target as percentage
  stopLossPercent: number; // Stop loss percentage
  riskRewardRatio: number; // Target risk/reward ratio
  maxHoldingMinutes: number; // Maximum holding time in minutes (for 1-min scalping)
  
  // Entry confirmation
  requireVolumeConfirmation: boolean;
  volumeThreshold: number; // Volume multiplier for confirmation
  requireCandleColorConfirmation: boolean; // Require bullish/bearish candle
  
  // Trading settings
  maxLeverage: number;
  initialCapital: number;
  enableLongPositions: boolean;
  enableShortPositions: boolean;
}

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  timestamp: number;
}

export interface FibonacciLevel {
  level: number;
  price: number;
  name: string;
}

export interface FibonacciRetracement {
  swingHigh: SwingPoint;
  swingLow: SwingPoint;
  levels: FibonacciLevel[];
  direction: 'uptrend' | 'downtrend';
}

export class FibonacciScalpingBot {
  private config: FibonacciScalpingConfig;
  private trades: Trade[] = [];
  private capital: number;
  private currentTrade: Trade | null = null;
  private swingPoints: SwingPoint[] = [];
  private currentFibRetracement: FibonacciRetracement | null = null;

  constructor(config: FibonacciScalpingConfig) {
    this.config = config;
    this.capital = config.initialCapital;
  }

  backtest(candles: Candle[], bands: BollingerBands[]): BacktestResult {
    this.trades = [];
    this.capital = this.config.initialCapital;
    this.currentTrade = null;
    this.swingPoints = [];
    this.currentFibRetracement = null;

    // Calculate volume moving average for confirmation
    const volumeMA = this.calculateVolumeMA(candles, 20);

    // Initialize swing points with some initial data to prevent null errors
    this.initializeSwingPoints(candles);

    for (let i = this.config.swingLookback; i < candles.length; i++) {
      const candle = candles[i];
      
      // Update swing points with proper null checks
      this.updateSwingPoints(candles, i);
      
      // Check for structure breaks and update Fibonacci retracement
      this.checkStructureBreak(candles, i);
      
      // Check for position timeout (scalping - quick exits)
      if (this.currentTrade && this.shouldClosePosition(candle, i, candles)) {
        this.exitPosition(candle, i, 'timeout');
        continue;
      }

      // Entry logic with null checks
      if (!this.currentTrade && this.currentFibRetracement) {
        if (this.config.enableLongPositions && this.isLongEntry(candle, candles[i-1], volumeMA[i], i)) {
          this.enterLongPosition(candle, i);
        } else if (this.config.enableShortPositions && this.isShortEntry(candle, candles[i-1], volumeMA[i], i)) {
          this.enterShortPosition(candle, i);
        }
      }

      // Exit logic
      if (this.currentTrade) {
        if (this.shouldStopLoss(candle)) {
          this.exitPosition(candle, i, 'stop-loss');
        } else if (this.shouldTakeProfit(candle)) {
          this.exitPosition(candle, i, 'target');
        } else if (this.shouldExitOnFibonacci(candle)) {
          this.exitPosition(candle, i, 'strategy-exit');
        }
      }
    }

    // Close any open position
    if (this.currentTrade) {
      const lastCandle = candles[candles.length - 1];
      this.exitPosition(lastCandle, candles.length - 1, 'strategy-exit');
    }

    return this.calculateResults();
  }

  // Initialize swing points to prevent null errors
  private initializeSwingPoints(candles: Candle[]) {
    if (candles.length < this.config.swingLookback * 2) return;
    
    // Add initial high and low points
    const highIndex = Math.min(this.config.swingLookback, candles.length - 1);
    const lowIndex = Math.min(this.config.swingLookback * 2, candles.length - 1);
    
    this.swingPoints.push({
      index: highIndex,
      price: candles[highIndex].high,
      type: 'high',
      timestamp: candles[highIndex].timestamp
    });
    
    this.swingPoints.push({
      index: lowIndex,
      price: candles[lowIndex].low,
      type: 'low',
      timestamp: candles[lowIndex].timestamp
    });
  }

  private updateSwingPoints(candles: Candle[], currentIndex: number) {
    if (currentIndex < this.config.swingLookback * 2) return;

    const lookback = this.config.swingLookback;
    const centerIndex = currentIndex - lookback;
    
    // Ensure centerIndex is valid
    if (centerIndex < 0 || centerIndex >= candles.length) return;
    
    const centerCandle = candles[centerIndex];
    if (!centerCandle) return;

    // Check for swing high with proper bounds checking
    let isSwingHigh = true;
    for (let i = centerIndex - lookback; i <= centerIndex + lookback; i++) {
      if (i === centerIndex || i < 0 || i >= candles.length) continue;
      if (!candles[i]) continue;
      
      if (candles[i].high >= centerCandle.high) {
        isSwingHigh = false;
        break;
      }
    }

    // Check for swing low with proper bounds checking
    let isSwingLow = true;
    for (let i = centerIndex - lookback; i <= centerIndex + lookback; i++) {
      if (i === centerIndex || i < 0 || i >= candles.length) continue;
      if (!candles[i]) continue;
      
      if (candles[i].low <= centerCandle.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingHigh) {
      this.swingPoints.push({
        index: centerIndex,
        price: centerCandle.high,
        type: 'high',
        timestamp: centerCandle.timestamp
      });
    }

    if (isSwingLow) {
      this.swingPoints.push({
        index: centerIndex,
        price: centerCandle.low,
        type: 'low',
        timestamp: centerCandle.timestamp
      });
    }

    // Keep only recent swing points
    this.swingPoints = this.swingPoints.filter(point => 
      point && currentIndex - point.index <= this.config.swingLookback * 10
    );
  }

  private checkStructureBreak(candles: Candle[], currentIndex: number) {
    if (this.swingPoints.length < 2) return;

    const currentCandle = candles[currentIndex];
    if (!currentCandle) return;
    
    const recentSwingHighs = this.swingPoints.filter(p => p && p.type === 'high').slice(-3);
    const recentSwingLows = this.swingPoints.filter(p => p && p.type === 'low').slice(-3);

    // Check for uptrend structure break (break of last swing high)
    if (recentSwingHighs.length >= 1 && recentSwingLows.length >= 1) {
      const lastSwingHigh = recentSwingHighs[recentSwingHighs.length - 1];
      const lastSwingLow = recentSwingLows[recentSwingLows.length - 1];
      
      if (!lastSwingHigh || !lastSwingLow) return;

      // Structure break to upside
      if (currentCandle.close > lastSwingHigh.price && 
          lastSwingLow.index < lastSwingHigh.index &&
          this.isSignificantSwing(lastSwingLow.price, lastSwingHigh.price)) {
        
        this.currentFibRetracement = this.calculateFibonacciRetracement(
          lastSwingLow, lastSwingHigh, 'uptrend'
        );
      }

      // Structure break to downside
      if (currentCandle.close < lastSwingLow.price && 
          lastSwingHigh.index < lastSwingLow.index &&
          this.isSignificantSwing(lastSwingLow.price, lastSwingHigh.price)) {
        
        this.currentFibRetracement = this.calculateFibonacciRetracement(
          lastSwingHigh, lastSwingLow, 'downtrend'
        );
      }
    }
  }

  private isSignificantSwing(price1: number, price2: number): boolean {
    const swingSize = Math.abs(price2 - price1) / Math.min(price1, price2);
    return swingSize >= this.config.minSwingSize;
  }

  private calculateFibonacciRetracement(
    point1: SwingPoint, 
    point2: SwingPoint, 
    direction: 'uptrend' | 'downtrend'
  ): FibonacciRetracement {
    const high = direction === 'uptrend' ? point2 : point1;
    const low = direction === 'uptrend' ? point1 : point2;
    const range = high.price - low.price;

    const levels: FibonacciLevel[] = this.config.fibRetracementLevels.map(level => ({
      level,
      price: direction === 'uptrend' 
        ? high.price - (range * level)
        : low.price + (range * level),
      name: this.getFibonacciLevelName(level)
    }));

    return {
      swingHigh: high,
      swingLow: low,
      levels,
      direction
    };
  }

  private getFibonacciLevelName(level: number): string {
    const levelMap: { [key: number]: string } = {
      0: '0%',
      0.236: '23.6%',
      0.382: '38.2%',
      0.5: '50%',
      0.618: '61.8%',
      0.786: '78.6%',
      1: '100%'
    };
    return levelMap[level] || `${(level * 100).toFixed(1)}%`;
  }

  private isLongEntry(candle: Candle, prevCandle: Candle, volumeMA: number, index: number): boolean {
    if (!this.currentFibRetracement || this.currentFibRetracement.direction !== 'uptrend') {
      return false;
    }

    // Check if price is in golden zone with proper null checks
    const goldenZoneLow = this.currentFibRetracement.levels.find(l => 
      l && Math.abs(l.level - this.config.goldenZoneMin) < 0.001
    );
    
    const goldenZoneHigh = this.currentFibRetracement.levels.find(l => 
      l && Math.abs(l.level - this.config.goldenZoneMax) < 0.001
    );
    
    if (!goldenZoneLow || !goldenZoneHigh) return false;

    const inGoldenZone = candle.close >= goldenZoneLow.price && candle.close <= goldenZoneHigh.price;
    if (!inGoldenZone) return false;

    const conditions = [
      // Price bounced from golden zone
      prevCandle.close <= goldenZoneLow.price && candle.close > goldenZoneLow.price,
      
      // Volume confirmation
      !this.config.requireVolumeConfirmation || (volumeMA > 0 && candle.volume > volumeMA * this.config.volumeThreshold),
      
      // Candle color confirmation
      !this.config.requireCandleColorConfirmation || candle.close > candle.open,
      
      // Price action confirmation (candle closed above golden zone low)
      candle.close > goldenZoneLow.price
    ];

    return conditions.filter(Boolean).length >= 3; // Require at least 3 confirmations
  }

  private isShortEntry(candle: Candle, prevCandle: Candle, volumeMA: number, index: number): boolean {
    if (!this.currentFibRetracement || this.currentFibRetracement.direction !== 'downtrend') {
      return false;
    }

    // Check if price is in golden zone with proper null checks
    const goldenZoneLow = this.currentFibRetracement.levels.find(l => 
      l && Math.abs(l.level - this.config.goldenZoneMin) < 0.001
    );
    
    const goldenZoneHigh = this.currentFibRetracement.levels.find(l => 
      l && Math.abs(l.level - this.config.goldenZoneMax) < 0.001
    );
    
    if (!goldenZoneLow || !goldenZoneHigh) return false;

    const inGoldenZone = candle.close >= goldenZoneLow.price && candle.close <= goldenZoneHigh.price;
    if (!inGoldenZone) return false;

    const conditions = [
      // Price rejected from golden zone
      prevCandle.close >= goldenZoneHigh.price && candle.close < goldenZoneHigh.price,
      
      // Volume confirmation
      !this.config.requireVolumeConfirmation || (volumeMA > 0 && candle.volume > volumeMA * this.config.volumeThreshold),
      
      // Candle color confirmation
      !this.config.requireCandleColorConfirmation || candle.close < candle.open,
      
      // Price action confirmation (candle closed below golden zone high)
      candle.close < goldenZoneHigh.price
    ];

    return conditions.filter(Boolean).length >= 3; // Require at least 3 confirmations
  }

  private shouldExitOnFibonacci(candle: Candle): boolean {
    if (!this.currentTrade || !this.currentFibRetracement) return false;

    if (this.currentTrade.position === 'long') {
      // Exit when price reaches previous swing high or 100% Fibonacci level
      const targetLevel = this.currentFibRetracement.levels.find(l => l && Math.abs(l.level - 0) < 0.001); // 0% = swing high
      return targetLevel ? candle.high >= targetLevel.price : false;
    } else {
      // Exit when price reaches previous swing low or 100% Fibonacci level
      const targetLevel = this.currentFibRetracement.levels.find(l => l && Math.abs(l.level - 0) < 0.001); // 0% = swing low
      return targetLevel ? candle.low <= targetLevel.price : false;
    }
  }

  private shouldStopLoss(candle: Candle): boolean {
    if (!this.currentTrade) return false;

    if (this.currentTrade.position === 'long') {
      return candle.low <= this.currentTrade.stopLoss;
    } else {
      return candle.high >= this.currentTrade.stopLoss;
    }
  }

  private shouldTakeProfit(candle: Candle): boolean {
    if (!this.currentTrade) return false;

    const profitTarget = this.currentTrade.position === 'long' 
      ? this.currentTrade.entryPrice * (1 + this.config.profitTarget)
      : this.currentTrade.entryPrice * (1 - this.config.profitTarget);

    if (this.currentTrade.position === 'long') {
      return candle.high >= profitTarget;
    } else {
      return candle.low <= profitTarget;
    }
  }

  private shouldClosePosition(candle: Candle, index: number, candles: Candle[]): boolean {
    if (!this.currentTrade) return false;

    // Find entry index
    const entryIndex = candles.findIndex(c => c && c.timestamp >= this.currentTrade!.entryTime);
    if (entryIndex === -1) return false;

    // Close position if held for maximum time (scalping should be quick)
    const minutesHeld = index - entryIndex;
    return minutesHeld >= this.config.maxHoldingMinutes;
  }

  private enterLongPosition(candle: Candle, index: number) {
    const stopLoss = candle.close * (1 - this.config.stopLossPercent);

    this.currentTrade = {
      id: `fib_trade_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'long',
      leverage: this.config.maxLeverage,
      isOpen: true
    };
  }

  private enterShortPosition(candle: Candle, index: number) {
    const stopLoss = candle.close * (1 + this.config.stopLossPercent);

    this.currentTrade = {
      id: `fib_trade_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'short',
      leverage: this.config.maxLeverage,
      isOpen: true
    };
  }

  private exitPosition(candle: Candle, index: number, reason: 'stop-loss' | 'target' | 'strategy-exit' | 'timeout') {
    if (!this.currentTrade) return;

    let exitPrice: number;
    if (reason === 'stop-loss') {
      exitPrice = this.currentTrade.stopLoss;
    } else if (reason === 'target') {
      exitPrice = this.currentTrade.position === 'long' 
        ? this.currentTrade.entryPrice * (1 + this.config.profitTarget)
        : this.currentTrade.entryPrice * (1 - this.config.profitTarget);
    } else {
      exitPrice = candle.close;
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
    this.currentTrade = null;
  }

  private calculateVolumeMA(candles: Candle[], period: number): number[] {
    const volumeMA: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        volumeMA.push(candles[i].volume);
      } else {
        const sum = candles.slice(i - period + 1, i + 1).reduce((sum, c) => sum + c.volume, 0);
        volumeMA.push(sum / period);
      }
    }
    
    return volumeMA;
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

    // Simple Sharpe ratio calculation
    const returns = this.trades.map(t => (t.pnl || 0) / this.config.initialCapital);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1;
    const sharpeRatio = avgReturn / Math.sqrt(returnVariance) * Math.sqrt(252 * 24 * 60); // Annualized for 1-minute data

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