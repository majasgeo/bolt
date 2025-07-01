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
  createdAt?: number; // For tracking when this point was created
  source?: string; // For tracking where this point was created
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
  private debugMode: boolean = true; // Enable debug logging
  private swingPointMutations: {action: string, point: SwingPoint | null, timestamp: number, stack: string}[] = [];

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
    
    if (this.debugMode) {
      console.log("BollingerFibonacciHybridBot initialized with config:", JSON.stringify(this.config));
    }
  }

  backtest(candles: Candle[], bands: BollingerBands[]): BacktestResult {
    if (this.debugMode) console.log("Starting BollingerFibonacciHybrid backtest");
    
    this.trades = [];
    this.capital = this.config.initialCapital;
    this.currentTrade = null;
    this.swingPoints = [];
    this.currentFibLevels = [];
    this.lastBreakoutTime = 0;
    this.swingPointMutations = [];
    
    // Detect if we're working with seconds data
    this.isSecondsTimeframe = this.detectSecondsTimeframe(candles);
    if (this.debugMode) console.log(`BollingerFibonacciHybridBot detected ${this.isSecondsTimeframe ? 'seconds' : 'minute/hour'} timeframe data`);

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

        if (!band || !prevBand) continue;

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
          candle, prevCandle, band, prevBand, volumeMA[i] || 0, i, candles
        );

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
        console.error(`Error processing candle at index ${i}:`, error);
        // Continue with next candle to prevent complete failure
      }
    }

    // Close any open position
    if (this.currentTrade) {
      const lastCandle = candles[candles.length - 1];
      this.exitPosition(lastCandle, candles.length - 1, 'strategy-exit');
    }

    const results = this.calculateResults();
    if (this.debugMode) {
      console.log("BollingerFibonacciHybrid backtest completed with results:", {
        totalTrades: results.totalTrades,
        winRate: results.winRate,
        totalPnL: results.totalPnL
      });
      
      // Log swing point mutation history if there were errors
      if (this.swingPointMutations.length > 0) {
        console.log(`Recorded ${this.swingPointMutations.length} swing point mutations`);
      }
    }
    
    return results;
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

  /**
   * Validates if an object is a valid SwingPoint
   * This is a critical function used throughout the code to prevent null errors
   */
  private isValidSwingPoint(point: any): point is SwingPoint {
    if (!point) return false;
    if (typeof point !== 'object') return false;
    
    // Check required properties exist
    if (!('index' in point)) return false;
    if (!('price' in point)) return false;
    if (!('type' in point)) return false;
    if (!('timestamp' in point)) return false;
    
    // Check property types
    if (typeof point.index !== 'number') return false;
    if (typeof point.price !== 'number') return false;
    if (typeof point.type !== 'string') return false;
    if (typeof point.timestamp !== 'number') return false;
    
    // Check type is valid
    if (point.type !== 'high' && point.type !== 'low') return false;
    
    // Check values are valid
    if (isNaN(point.index) || isNaN(point.price) || isNaN(point.timestamp)) return false;
    if (point.price <= 0) return false;
    
    return true;
  }

  /**
   * Track mutations to the swing points array for debugging
   */
  private trackSwingPointMutation(action: string, point: SwingPoint | null) {
    // Get stack trace
    const stack = new Error().stack || '';
    
    this.swingPointMutations.push({
      action,
      point,
      timestamp: Date.now(),
      stack
    });
    
    // If we're tracking a null point, log it immediately as this is likely an error
    if (action !== 'filter' && point === null) {
      console.error(`⚠️ CRITICAL: Attempted to ${action} a null swing point!`);
      console.error(`Stack trace: ${stack}`);
    }
  }

  // Initialize swing points to prevent null errors
  private initializeSwingPoints(candles: Candle[]) {
    if (candles.length < this.config.swingLookback * 2) {
      if (this.debugMode) console.log("Not enough candles to initialize swing points");
      return;
    }
    
    // Add initial high and low points
    const highIndex = Math.min(this.config.swingLookback, candles.length - 1);
    const lowIndex = Math.min(this.config.swingLookback * 2, candles.length - 1);
    
    if (this.debugMode) console.log(`Initializing swing points at indices ${highIndex} (high) and ${lowIndex} (low)`);
    
    const highPoint: SwingPoint = {
      index: highIndex,
      price: candles[highIndex].high,
      type: 'high',
      timestamp: candles[highIndex].timestamp,
      createdAt: Date.now(),
      source: 'initialization'
    };
    
    const lowPoint: SwingPoint = {
      index: lowIndex,
      price: candles[lowIndex].low,
      type: 'low',
      timestamp: candles[lowIndex].timestamp,
      createdAt: Date.now(),
      source: 'initialization'
    };
    
    // Track mutations
    this.trackSwingPointMutation('add', highPoint);
    this.trackSwingPointMutation('add', lowPoint);
    
    // Add to array
    this.swingPoints.push(highPoint);
    this.swingPoints.push(lowPoint);
    
    if (this.debugMode) {
      console.log("Initialized swing points:", JSON.stringify(this.swingPoints));
      console.log(`SwingPoints array length after initialization: ${this.swingPoints.length}`);
      
      // Verify each point has the required properties
      this.swingPoints.forEach((point, idx) => {
        console.log(`SwingPoint[${idx}]:`, 
          point ? 
          `index=${point.index}, price=${point.price}, type=${point.type}, timestamp=${point.timestamp}` : 
          'NULL POINT');
      });
    }
  }

  private updateSwingPoints(candles: Candle[], currentIndex: number) {
    // CRITICAL: Clean up any null or undefined entries from swingPoints array first
    const originalLength = this.swingPoints.length;
    const validSwingPoints = this.swingPoints.filter(point => this.isValidSwingPoint(point));
    
    // If we lost any points during filtering, log it
    if (validSwingPoints.length !== originalLength) {
      if (this.debugMode) {
        console.log(`⚠️ Removed ${originalLength - validSwingPoints.length} invalid swing points`);
        console.log(`SwingPoints before: ${originalLength}, after: ${validSwingPoints.length}`);
      }
      
      // Track this mutation
      this.trackSwingPointMutation('filter', null);
    }
    
    // Update the array with only valid points
    this.swingPoints = validSwingPoints;

    if (currentIndex < this.config.swingLookback * 2) {
      if (this.debugMode) console.log(`Skipping swing point detection at index ${currentIndex} - not enough history`);
      return;
    }

    const lookback = this.config.swingLookback;
    const centerIndex = currentIndex - lookback;
    
    // Ensure centerIndex is valid
    if (centerIndex < 0 || centerIndex >= candles.length) {
      if (this.debugMode) console.log(`Invalid centerIndex ${centerIndex} for swing point detection`);
      return;
    }
    
    const centerCandle = candles[centerIndex];
    if (!centerCandle) {
      if (this.debugMode) console.log(`No candle found at centerIndex ${centerIndex}`);
      return;
    }

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
      const newSwingHigh: SwingPoint = {
        index: centerIndex,
        price: centerCandle.high,
        type: 'high',
        timestamp: centerCandle.timestamp,
        createdAt: Date.now(),
        source: 'swing-detection'
      };
      
      // Track this mutation
      this.trackSwingPointMutation('add', newSwingHigh);
      
      // Add to array
      this.swingPoints.push(newSwingHigh);
      
      if (this.debugMode) console.log(`Added new swing high at index ${centerIndex}, price ${centerCandle.high}`);
    }

    if (isSwingLow) {
      const newSwingLow: SwingPoint = {
        index: centerIndex,
        price: centerCandle.low,
        type: 'low',
        timestamp: centerCandle.timestamp,
        createdAt: Date.now(),
        source: 'swing-detection'
      };
      
      // Track this mutation
      this.trackSwingPointMutation('add', newSwingLow);
      
      // Add to array
      this.swingPoints.push(newSwingLow);
      
      if (this.debugMode) console.log(`Added new swing low at index ${centerIndex}, price ${centerCandle.low}`);
    }

    // Keep only recent swing points and filter out any invalid entries again
    const beforePruneLength = this.swingPoints.length;
    this.swingPoints = this.swingPoints.filter(point => 
      this.isValidSwingPoint(point) &&
      currentIndex - point.index <= this.config.swingLookback * 10
    );
    
    // Track pruning
    if (beforePruneLength !== this.swingPoints.length) {
      this.trackSwingPointMutation('prune', null);
    }
    
    if (this.debugMode && (isSwingHigh || isSwingLow)) {
      console.log(`After update, swingPoints count: ${this.swingPoints.length}`);
      
      // Verify the array is clean
      const invalidPoints = this.swingPoints.filter(point => !this.isValidSwingPoint(point));
      if (invalidPoints.length > 0) {
        console.error(`⚠️ CRITICAL: Still have ${invalidPoints.length} invalid points after filtering!`);
        console.log("Invalid points:", invalidPoints);
        
        // Force clean the array again
        this.swingPoints = this.swingPoints.filter(point => this.isValidSwingPoint(point));
        this.trackSwingPointMutation('emergency-filter', null);
      }
    }
  }

  private updateFibonacciLevels() {
    try {
      // CRITICAL: Clean up any null or undefined entries from swingPoints array first
      const originalLength = this.swingPoints.length;
      const validSwingPoints = this.swingPoints.filter(point => this.isValidSwingPoint(point));
      
      // If we lost any points during filtering, log it
      if (validSwingPoints.length !== originalLength) {
        if (this.debugMode) {
          console.log(`⚠️ Removed ${originalLength - validSwingPoints.length} invalid swing points during Fibonacci update`);
        }
        
        // Track this mutation
        this.trackSwingPointMutation('fib-update-filter', null);
        
        // Update the array with only valid points
        this.swingPoints = validSwingPoints;
      }
      
      if (this.swingPoints.length < 2) {
        if (this.debugMode) console.log("Not enough valid swing points for Fibonacci levels");
        return;
      }

      const recentHighs = this.swingPoints.filter(p => this.isValidSwingPoint(p) && p.type === 'high').slice(-2);
      const recentLows = this.swingPoints.filter(p => this.isValidSwingPoint(p) && p.type === 'low').slice(-2);

      if (recentHighs.length >= 1 && recentLows.length >= 1) {
        const lastHigh = recentHighs[recentHighs.length - 1];
        const lastLow = recentLows[recentLows.length - 1];
        
        if (!lastHigh || !lastLow) {
          if (this.debugMode) console.log("Missing last high or low swing point");
          return;
        }

        // Calculate Fibonacci levels between the most recent swing high and low
        const high = Math.max(lastHigh.price, lastLow.price);
        const low = Math.min(lastHigh.price, lastLow.price);
        const range = high - low;
        
        if (range <= 0) {
          if (this.debugMode) console.log(`Invalid range: ${range} for Fibonacci calculation`);
          return;
        }

        this.currentFibLevels = this.config.fibRetracementLevels.map(level => ({
          level,
          price: high - (range * level),
          name: this.getFibonacciLevelName(level)
        }));
        
        if (this.debugMode) console.log(`Updated Fibonacci levels between ${high} and ${low}`);
      }
    } catch (error) {
      console.error("Error in updateFibonacciLevels:", error);
      // Reset Fibonacci levels to prevent further errors
      this.currentFibLevels = [];
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
      if (!this.currentFibLevels || !Array.isArray(this.currentFibLevels) || this.currentFibLevels.length === 0) {
        if (this.debugMode) console.log("No Fibonacci levels available for golden zone check");
        return false;
      }

      const goldenZoneLow = this.currentFibLevels.find(l => 
        l && typeof l.level === 'number' && Math.abs(l.level - this.config.goldenZoneMin) < 0.001
      );
      
      const goldenZoneHigh = this.currentFibLevels.find(l => 
        l && typeof l.level === 'number' && Math.abs(l.level - this.config.goldenZoneMax) < 0.001
      );
      
      if (!goldenZoneLow || !goldenZoneHigh) {
        if (this.debugMode) console.log("Golden zone levels not found in Fibonacci levels");
        return false;
      }

      // For long positions, look for price in golden zone during pullback
      if (direction === 'long') {
        const inZone = price >= goldenZoneLow.price && price <= goldenZoneHigh.price;
        if (this.debugMode && inZone) console.log(`Price ${price} is in LONG golden zone (${goldenZoneLow.price}-${goldenZoneHigh.price})`);
        return inZone;
      }
      
      // For short positions, look for price in golden zone during bounce
      if (direction === 'short') {
        const inZone = price >= goldenZoneLow.price && price <= goldenZoneHigh.price;
        if (this.debugMode && inZone) console.log(`Price ${price} is in SHORT golden zone (${goldenZoneLow.price}-${goldenZoneHigh.price})`);
        return inZone;
      }

      return false;
    } catch (error) {
      console.error("Error in isInGoldenZone:", error);
      return false;
    }
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
        (volumeMA > 0 && candle.volume > volumeMA * this.config.volumeThreshold) : true;

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

        if (this.debugMode) console.log(`Long signal generated at index ${index} with strength ${strength}`);

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

        if (this.debugMode) console.log(`Short signal generated at index ${index} with strength ${strength}`);

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
    const shouldClose = candlesHeld >= maxHoldingCandles;
    
    if (shouldClose && this.debugMode) {
      console.log(`Closing position due to time limit: held for ${candlesHeld} candles (max: ${maxHoldingCandles})`);
    }
    
    return shouldClose;
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
      if (this.debugMode) console.log(`Signal reversal for LONG: price ${candle.close} fell below upper band ${band.upper}`);
      return true;
    }

    // Exit short when price rises back above lower band
    if (this.currentTrade.position === 'short' && candle.close >= band.lower) {
      if (this.debugMode) console.log(`Signal reversal for SHORT: price ${candle.close} rose above lower band ${band.lower}`);
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
    
    if (this.debugMode) {
      console.log(`Entered LONG position at index ${index}, price ${signal.entryPrice}, stop ${signal.stopLoss}`);
      console.log(`Signal strength: ${signal.strength}, BB: ${signal.bollingerBreakout}, Fib: ${signal.fibonacciRetracement}, Vol: ${signal.volumeConfirmation}, Mom: ${signal.momentumConfirmation}`);
    }
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
    
    if (this.debugMode) {
      console.log(`Entered SHORT position at index ${index}, price ${signal.entryPrice}, stop ${signal.stopLoss}`);
      console.log(`Signal strength: ${signal.strength}, BB: ${signal.bollingerBreakout}, Fib: ${signal.fibonacciRetracement}, Vol: ${signal.volumeConfirmation}, Mom: ${signal.momentumConfirmation}`);
    }
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
    
    if (this.debugMode) {
      console.log(`Exited ${this.currentTrade.position} position at index ${index}, price ${exitPrice}, reason: ${reason}, PnL: ${pnl}`);
    }
    
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
  
  // For debugging - get a snapshot of the current state
  public getDebugSnapshot(): any {
    return {
      swingPoints: this.swingPoints.map(p => ({...p})),
      swingPointCount: this.swingPoints.length,
      validSwingPointCount: this.swingPoints.filter(p => this.isValidSwingPoint(p)).length,
      currentFibLevels: this.currentFibLevels ? [...this.currentFibLevels] : null,
      swingPointMutations: this.swingPointMutations.slice(-10), // Last 10 mutations
      trades: this.trades.length
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