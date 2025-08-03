import { Candle, BollingerBands, Trade, BacktestResult, TradingConfig } from '../types/trading';

export interface BollingerFibonacciConfig extends TradingConfig {
  // Bollinger Bands settings
  period: number;
  stdDev: number;
  offset: number;
  
  // Fibonacci settings
  swingLookback: number;
  fibRetracementLevels: number[];
  goldenZoneMin: number; // 50% level
  goldenZoneMax: number; // 61.8% level
  
  // Hybrid entry requirements
  requireBollingerBreakout: boolean; // Must break BB first
  requireFibonacciRetracement: boolean; // Must pullback to golden zone
  confirmationCandles: number; // Candles to confirm entry
  
  // Risk management for 1-minute scalping
  profitTarget: number; // 0.5% - 1.5% for 1-min
  stopLossPercent: number; // 0.3% - 0.8% for 1-min
  maxHoldingMinutes: number; // 2-10 minutes max
  
  // Volume and momentum filters
  requireVolumeConfirmation: boolean;
  volumeThreshold: number;
  requireMomentumConfirmation: boolean;
  
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

export interface HybridSignal {
  type: 'long' | 'short';
  strength: number; // 0-100
  bollingerBreakout: boolean;
  fibonacciRetracement: boolean;
  volumeConfirmation: boolean;
  momentumConfirmation: boolean;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export class BollingerFibonacciHybridBot {
  private config: BollingerFibonacciConfig;
  private trades: Trade[] = [];
  private capital: number;
  private currentTrade: Trade | null = null;
  private swingPoints: SwingPoint[] = [];
  private currentFibLevels: FibonacciLevel[] = [];
  private lastBreakoutTime: number = 0;
  private isSecondsTimeframe: boolean = false;

  constructor(config: BollingerFibonacciConfig) {
    this.config = config;
    this.capital = config.initialCapital;
    
    // Initialize with default values if missing
    if (!this.config.confirmationCandles) {
      this.config.confirmationCandles = 1;
    }
    
    if (!this.config.fibRetracementLevels) {
      this.config.fibRetracementLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    }
  }

  backtest(candles: Candle[], bands: BollingerBands[]): BacktestResult {
    try {
      console.log("Starting hybrid backtest with config:", this.config);
      
      // Validate input data
      if (!candles || !Array.isArray(candles) || candles.length === 0) {
        throw new Error("Invalid candles data provided");
      }
      
      if (!bands || !Array.isArray(bands) || bands.length === 0) {
        throw new Error("Invalid bands data provided");
      }
      
      if (candles.length !== bands.length) {
        throw new Error("Candles and bands arrays must have the same length");
      }
      
      this.trades = [];
      this.capital = this.config.initialCapital;
      this.currentTrade = null;
      this.swingPoints = [];
      this.currentFibLevels = [];
      this.lastBreakoutTime = 0;
      
      // Detect if we're working with seconds data
      this.isSecondsTimeframe = this.detectSecondsTimeframe(candles);
      console.log(`BollingerFibonacciHybridBot detected ${this.isSecondsTimeframe ? 'seconds' : 'minute/hour'} timeframe data`);

      // Initialize swing points to prevent null errors
      this.initializeSwingPoints(candles);

      // Calculate volume moving average
      const volumeMA = this.calculateVolumeMA(candles, 20);

      for (let i = this.config.swingLookback + 1; i < candles.length; i++) {
        try {
          const candle = candles[i];
          const prevCandle = candles[i - 1];
          const band = bands[i];
          const prevBand = bands[i - 1];

          // Validate current data points
          if (!candle || !prevCandle || !band || !prevBand) {
            console.warn(`Skipping index ${i}: missing data`);
            continue;
          }
          
          // Validate candle data
          if (typeof candle.close !== 'number' || isNaN(candle.close) || candle.close <= 0) {
            console.warn(`Skipping index ${i}: invalid candle data`);
            continue;
          }
          
          // Validate band data
          if (typeof band.upper !== 'number' || typeof band.lower !== 'number' || typeof band.middle !== 'number' ||
              isNaN(band.upper) || isNaN(band.lower) || isNaN(band.middle) ||
              band.upper <= 0 || band.lower <= 0 || band.middle <= 0) {
            console.warn(`Skipping index ${i}: invalid band data`);
            continue;
          }

          // Update swing points for Fibonacci analysis with proper null checks
          this.updateSwingPoints(candles, i);
          
          // Update Fibonacci levels when new swing points are found
          this.updateFibonacciLevels();

          // Check for position timeout (1-minute scalping should be quick)
          if (this.currentTrade && this.shouldClosePosition(candle, i, candles)) {
            this.exitPosition(candle, i, 'timeout');
            continue;
          }

          // Generate hybrid signals with proper null checks
          const signal = this.generateHybridSignal(
            candle, prevCandle, band, prevBand, volumeMA[i], i, candles
          );
          
          if (signal && (typeof signal.strength !== 'number' || isNaN(signal.strength))) {
            console.warn(`Invalid signal strength at index ${i}`);
            continue;
          }

          // Entry logic based on hybrid signals
          if (!this.currentTrade && signal) {
            if (this.config.enableLongPositions && signal.type === 'long' && signal.strength >= 70) {
              this.enterLongPosition(candle, i, signal);
            } else if (this.config.enableShortPositions && signal.type === 'short' && signal.strength >= 70) {
              this.enterShortPosition(candle, i, signal);
            }
          }

          // Exit logic
          if (this.currentTrade) {
            if (this.shouldStopLoss(candle)) {
              this.exitPosition(candle, i, 'stop-loss');
            } else if (this.shouldTakeProfit(candle)) {
              this.exitPosition(candle, i, 'target');
            } else if (this.shouldExitOnSignalReversal(candle, band)) {
              this.exitPosition(candle, i, 'strategy-exit');
            }
          }
        } catch (error) {
          console.error(`Error processing candle at index ${i}:`, error.message);
          // Continue with next candle instead of breaking the entire backtest
        }
      }

      // Close any open position
      if (this.currentTrade) {
        const lastCandle = candles[candles.length - 1];
        this.exitPosition(lastCandle, candles.length - 1, 'strategy-exit');
      }

      const results = this.calculateResults();
      console.log("Hybrid backtest completed with results:", {
        totalTrades: results.totalTrades,
        winRate: results.winRate,
        totalPnL: results.totalPnL
      });
      
      return results;
    } catch (error) {
      console.error("Critical error in hybrid backtest:", error.message);
      // Return empty results to prevent app crash
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        trades: [],
        longTrades: 0,
        shortTrades: 0
      };
    }
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
    
    console.log("Initialized hybrid swing points:", this.swingPoints);
  }

  private generateHybridSignal(
    candle: Candle,
    prevCandle: Candle,
    band: BollingerBands,
    prevBand: BollingerBands,
    volumeMA: number,
    index: number,
    candles: Candle[]
  ): HybridSignal | null {
    try {
      // Validate all inputs
      if (!candle || !prevCandle || !band || !prevBand) {
        return null;
      }
      
      if (typeof candle.close !== 'number' || typeof prevCandle.close !== 'number' ||
          isNaN(candle.close) || isNaN(prevCandle.close)) {
        return null;
      }
      
      if (typeof band.upper !== 'number' || typeof band.lower !== 'number' ||
          typeof prevBand.upper !== 'number' || typeof prevBand.lower !== 'number' ||
          isNaN(band.upper) || isNaN(band.lower) || isNaN(prevBand.upper) || isNaN(prevBand.lower)) {
        return null;
      }

      // Step 1: Check for Bollinger Band breakout
      const longBreakout = this.config.requireBollingerBreakout ? 
        (prevCandle.close <= prevBand.upper && candle.close > band.upper) : true;
      
      const shortBreakout = this.config.requireBollingerBreakout ? 
        (prevCandle.close >= prevBand.lower && candle.close < band.lower) : true;

      // Step 2: Check for Fibonacci retracement to golden zone
      const fibRetracementLong = this.config.requireFibonacciRetracement ? 
        this.isInGoldenZone(candle.close, 'long') : true;
      
      const fibRetracementShort = this.config.requireFibonacciRetracement ? 
        this.isInGoldenZone(candle.close, 'short') : true;

      // Step 3: Volume confirmation
      const volumeConfirmation = this.config.requireVolumeConfirmation ? 
        (typeof volumeMA === 'number' && !isNaN(volumeMA) && volumeMA > 0 && 
         typeof candle.volume === 'number' && !isNaN(candle.volume) && 
         candle.volume > volumeMA * this.config.volumeThreshold) : true;

      // Step 4: Momentum confirmation (price action)
      const momentumConfirmationLong = this.config.requireMomentumConfirmation ? 
        (candle.close > candle.open && candle.close > prevCandle.close) : true;
      
      const momentumConfirmationShort = this.config.requireMomentumConfirmation ? 
        (candle.close < candle.open && candle.close < prevCandle.close) : true;

      // Generate long signal
      if (longBreakout && fibRetracementLong && volumeConfirmation && momentumConfirmationLong) {
        const strength = this.calculateSignalStrength(
          longBreakout, fibRetracementLong, volumeConfirmation, momentumConfirmationLong
        );

        return {
          type: 'long',
          strength,
          bollingerBreakout: longBreakout,
          fibonacciRetracement: fibRetracementLong,
          volumeConfirmation,
          momentumConfirmation: momentumConfirmationLong,
          entryPrice: candle.close,
          stopLoss: candle.close * (1 - this.config.stopLossPercent),
          takeProfit: candle.close * (1 + this.config.profitTarget)
        };
      }

      // Generate short signal
      if (shortBreakout && fibRetracementShort && volumeConfirmation && momentumConfirmationShort) {
        const strength = this.calculateSignalStrength(
          shortBreakout, fibRetracementShort, volumeConfirmation, momentumConfirmationShort
        );

        return {
          type: 'short',
          strength,
          bollingerBreakout: shortBreakout,
          fibonacciRetracement: fibRetracementShort,
          volumeConfirmation,
          momentumConfirmation: momentumConfirmationShort,
          entryPrice: candle.close,
          stopLoss: candle.close * (1 + this.config.stopLossPercent),
          takeProfit: candle.close * (1 - this.config.profitTarget)
        };
      }

      return null;
    } catch (error) {
      console.error("Error in generateHybridSignal:", error);
      return null;
    }
  }

  private calculateSignalStrength(
    bollingerBreakout: boolean,
    fibonacciRetracement: boolean,
    volumeConfirmation: boolean,
    momentumConfirmation: boolean
  ): number {
    let strength = 0;
    
    if (bollingerBreakout) strength += 30; // BB breakout is strong signal
    if (fibonacciRetracement) strength += 25; // Fibonacci retracement adds precision
    if (volumeConfirmation) strength += 25; // Volume confirms the move
    if (momentumConfirmation) strength += 20; // Momentum confirms direction
    
    return strength;
  }

  private updateSwingPoints(candles: Candle[], currentIndex: number) {
    try {
      // Robust validation function
      const isValidSwingPoint = (p: any): p is SwingPoint => {
        if (!p || typeof p !== 'object') return false;
        if (!('type' in p) || !('price' in p) || !('index' in p) || !('timestamp' in p)) return false;
        if (p.type !== 'high' && p.type !== 'low') return false;
        if (typeof p.price !== 'number' || isNaN(p.price) || p.price <= 0) return false;
        if (typeof p.index !== 'number' || isNaN(p.index) || p.index < 0) return false;
        if (typeof p.timestamp !== 'number' || isNaN(p.timestamp)) return false;
        return true;
      };

      // Clean up any invalid entries from swingPoints array first
      this.swingPoints = this.swingPoints.filter(isValidSwingPoint);

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
        if (i === centerIndex) continue;
        if (i < 0 || i >= candles.length) continue;
        const compareCandle = candles[i];
        if (!compareCandle || typeof compareCandle.high !== 'number' || isNaN(compareCandle.high)) continue;
        
        if (compareCandle.high >= centerCandle.high) {
          isSwingHigh = false;
          break;
        }
      }

      // Check for swing low with proper bounds checking
      let isSwingLow = true;
      for (let i = centerIndex - lookback; i <= centerIndex + lookback; i++) {
        if (i === centerIndex) continue;
        if (i < 0 || i >= candles.length) continue;
        const compareCandle = candles[i];
        if (!compareCandle || typeof compareCandle.low !== 'number' || isNaN(compareCandle.low)) continue;
        
        if (compareCandle.low <= centerCandle.low) {
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

      // Keep only recent swing points and filter out any null entries again
      this.swingPoints = this.swingPoints.filter(point => {
        if (!isValidSwingPoint(point)) return false;
        return currentIndex - point.index <= this.config.swingLookback * 10;
      });
    } catch (error) {
      console.error("Error in updateSwingPoints:", error);
      // Ensure we always have a valid swingPoints array
      if (!Array.isArray(this.swingPoints)) {
        this.swingPoints = [];
      }
    }
  }

  private updateFibonacciLevels() {
    try {
      if (this.swingPoints.length < 2) return;

      // Robust validation function
      const isValidSwingPoint = (p: any): p is SwingPoint => {
        if (!p || typeof p !== 'object') return false;
        if (!('type' in p) || !('price' in p) || !('index' in p) || !('timestamp' in p)) return false;
        if (p.type !== 'high' && p.type !== 'low') return false;
        if (typeof p.price !== 'number' || isNaN(p.price) || p.price <= 0) return false;
        if (typeof p.index !== 'number' || isNaN(p.index) || p.index < 0) return false;
        if (typeof p.timestamp !== 'number' || isNaN(p.timestamp)) return false;
        return true;
      };

      // Clean up any invalid entries from swingPoints array first
      this.swingPoints = this.swingPoints.filter(isValidSwingPoint);

      const recentHighs = this.swingPoints.filter(p => p.type === 'high').slice(-2);
      const recentLows = this.swingPoints.filter(p => p.type === 'low').slice(-2);

      if (recentHighs.length >= 1 && recentLows.length >= 1) {
        const lastHigh = recentHighs[recentHighs.length - 1];
        const lastLow = recentLows[recentLows.length - 1];
        
        if (!isValidSwingPoint(lastHigh) || !isValidSwingPoint(lastLow)) return;

        // Calculate Fibonacci levels between the most recent swing high and low
        const high = Math.max(lastHigh.price, lastLow.price);
        const low = Math.min(lastHigh.price, lastLow.price);
        const range = high - low;

        // Check for zero range to prevent division issues
        if (Math.abs(range) < 0.0001) {
          return;
        }

        this.currentFibLevels = this.config.fibRetracementLevels.map(level => ({
          level,
          price: high - (range * level),
          name: this.getFibonacciLevelName(level)
        }));
      }
    } catch (error) {
      console.error("Error in updateFibonacciLevels:", error);
      // Ensure we always have a valid currentFibLevels array
      if (!Array.isArray(this.currentFibLevels)) {
        this.currentFibLevels = [];
      }
    }
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

  private isInGoldenZone(price: number, direction: 'long' | 'short'): boolean {
    try {
      if (!this.currentFibLevels || this.currentFibLevels.length === 0) return false;
      
      if (typeof price !== 'number' || isNaN(price) || price <= 0) return false;

      const goldenZoneLow = this.currentFibLevels.find(l => {
        if (!l || typeof l.level !== 'number' || typeof l.price !== 'number') return false;
        if (isNaN(l.level) || isNaN(l.price)) return false;
        return Math.abs(l.level - this.config.goldenZoneMin) < 0.001;
      });
      
      const goldenZoneHigh = this.currentFibLevels.find(l => {
        if (!l || typeof l.level !== 'number' || typeof l.price !== 'number') return false;
        if (isNaN(l.level) || isNaN(l.price)) return false;
        return Math.abs(l.level - this.config.goldenZoneMax) < 0.001;
      });

      if (!goldenZoneLow || !goldenZoneHigh) return false;

      // For long positions, look for price in golden zone during pullback
      if (direction === 'long') {
        return price >= goldenZoneLow.price && price <= goldenZoneHigh.price;
      }
      
      // For short positions, look for price in golden zone during bounce
      if (direction === 'short') {
        return price >= goldenZoneLow.price && price <= goldenZoneHigh.price;
      }

      return false;
    } catch (error) {
      console.error("Error in isInGoldenZone:", error);
      return false;
    }
  }

  private shouldClosePosition(candle: Candle, index: number, candles: Candle[]): boolean {
    if (!this.currentTrade) return false;

    // Find entry index
    const entryIndex = candles.findIndex(c => c && c.timestamp >= this.currentTrade!.entryTime);
    if (entryIndex === -1) return false;

    // For seconds data, adjust the holding time calculation
    let maxHoldingCandles = this.config.maxHoldingMinutes;
    
    if (this.isSecondsTimeframe) {
      // For seconds data, interpret maxHoldingMinutes as seconds
      maxHoldingCandles = this.config.maxHoldingMinutes;
    } else {
      // For minute data, use minutes as is
      maxHoldingCandles = this.config.maxHoldingMinutes;
    }

    // Close position if held for maximum time
    const candlesHeld = index - entryIndex;
    return candlesHeld >= maxHoldingCandles;
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

  private shouldExitOnSignalReversal(candle: Candle, band: BollingerBands): boolean {
    if (!this.currentTrade) return false;

    // Exit long when price falls back below upper band
    if (this.currentTrade.position === 'long' && candle.close <= band.upper) {
      return true;
    }

    // Exit short when price rises back above lower band
    if (this.currentTrade.position === 'short' && candle.close >= band.lower) {
      return true;
    }

    return false;
  }

  private enterLongPosition(candle: Candle, index: number, signal: HybridSignal) {
    this.currentTrade = {
      id: `hybrid_${index}`,
      entryTime: candle.timestamp,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      position: 'long',
      leverage: this.config.maxLeverage,
      isOpen: true
    };

    this.lastBreakoutTime = candle.timestamp;
  }

  private enterShortPosition(candle: Candle, index: number, signal: HybridSignal) {
    this.currentTrade = {
      id: `hybrid_${index}`,
      entryTime: candle.timestamp,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      position: 'short',
      leverage: this.config.maxLeverage,
      isOpen: true
    };

    this.lastBreakoutTime = candle.timestamp;
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

    // Sharpe ratio calculation
    const returns = this.trades.map(t => (t.pnl || 0) / this.config.initialCapital);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1;
    
    // Adjust annualization factor based on timeframe
    const annualizationFactor = this.isSecondsTimeframe ? 
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

// Helper function to create hybrid config
export function createBollingerFibonacciConfig(basicConfig: TradingConfig): BollingerFibonacciConfig {
  // Detect if we're likely working with seconds data based on period
  const isLikelySecondsData = basicConfig.period < 10;
  
  return {
    ...basicConfig,
    // Fibonacci settings optimized for timeframe
    swingLookback: isLikelySecondsData ? 3 : 5,
    fibRetracementLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
    goldenZoneMin: 0.5, // 50% level
    goldenZoneMax: 0.618, // 61.8% level
    
    // Hybrid requirements (all enabled for maximum precision)
    requireBollingerBreakout: true,
    requireFibonacciRetracement: true,
    confirmationCandles: 1,
    
    // Risk management adjusted for timeframe
    profitTarget: isLikelySecondsData ? 0.006 : 0.012, // 0.6% or 1.2% profit target
    stopLossPercent: isLikelySecondsData ? 0.004 : 0.008, // 0.4% or 0.8% stop loss
    maxHoldingMinutes: isLikelySecondsData ? 30 : 8, // 30 seconds or 8 minutes
    
    // Volume and momentum filters
    requireVolumeConfirmation: true,
    volumeThreshold: 1.3,
    requireMomentumConfirmation: true
  };
}