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
  createdAt?: number; // For tracking when this point was created
  source?: string; // For tracking where this point was created
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
  private isSecondsTimeframe: boolean = false;
  private debugMode: boolean = true; // Enable debug logging
  private swingPointMutations: {action: string, point: SwingPoint | null, timestamp: number, stack: string}[] = [];

  constructor(config: FibonacciScalpingConfig) {
    this.config = config;
    this.capital = config.initialCapital;
    
    // Ensure fibRetracementLevels is initialized
    if (!this.config.fibRetracementLevels) {
      this.config.fibRetracementLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    }
    
    if (this.debugMode) {
      console.log("FibonacciScalpingBot initialized with config:", JSON.stringify(this.config));
    }
  }

  backtest(candles: Candle[], bands: BollingerBands[]): BacktestResult {
    if (this.debugMode) console.log("Starting Fibonacci backtest with config:", JSON.stringify(this.config));
    
    this.trades = [];
    this.capital = this.config.initialCapital;
    this.currentTrade = null;
    this.swingPoints = [];
    this.swingPointMutations = [];
    this.currentFibRetracement = null;
    
    // Detect if we're working with seconds data
    this.isSecondsTimeframe = this.detectSecondsTimeframe(candles);
    if (this.debugMode) console.log(`FibonacciScalpingBot detected ${this.isSecondsTimeframe ? 'seconds' : 'minute/hour'} timeframe data`);

    // Calculate volume moving average for confirmation
    const volumeMA = this.calculateVolumeMA(candles, 20);

    // Initialize swing points with some initial data to prevent null errors
    this.initializeSwingPoints(candles);

    for (let i = this.config.swingLookback; i < candles.length; i++) {
      const candle = candles[i];
      const prevCandle = i > 0 ? candles[i-1] : null;
      
      if (!candle || !prevCandle) continue;
      
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
        if (this.config.enableLongPositions && this.isLongEntry(candle, prevCandle, volumeMA[i] || 0, i)) {
          this.enterLongPosition(candle, i);
        } else if (this.config.enableShortPositions && this.isShortEntry(candle, prevCandle, volumeMA[i] || 0, i)) {
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

    const results = this.calculateResults();
    if (this.debugMode) {
      console.log("Fibonacci backtest completed with results:", {
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

  private checkStructureBreak(candles: Candle[], currentIndex: number) {
    // CRITICAL: Clean swing points array before processing
    const originalLength = this.swingPoints.length;
    this.swingPoints = this.swingPoints.filter(point => this.isValidSwingPoint(point));
    
    if (originalLength !== this.swingPoints.length) {
      this.trackSwingPointMutation('structure-break-filter', null);
    }

    if (this.swingPoints.length < 2) {
      if (this.debugMode) console.log("Not enough swing points for structure break check");
      return;
    }

    const currentCandle = candles[currentIndex];
    if (!currentCandle) {
      if (this.debugMode) console.log(`No candle found at index ${currentIndex}`);
      return;
    }
    
    try {
      // Get recent swing highs and lows, ensuring they're valid
      const recentSwingHighs = this.swingPoints
        .filter(p => this.isValidSwingPoint(p) && p.type === 'high')
        .slice(-3);
        
      const recentSwingLows = this.swingPoints
        .filter(p => this.isValidSwingPoint(p) && p.type === 'low')
        .slice(-3);

      if (this.debugMode) {
        console.log(`Structure break check: ${recentSwingHighs.length} recent highs, ${recentSwingLows.length} recent lows`);
      }

      // Check for uptrend structure break (break of last swing high)
      if (recentSwingHighs.length >= 1 && recentSwingLows.length >= 1) {
        const lastSwingHigh = recentSwingHighs[recentSwingHighs.length - 1];
        const lastSwingLow = recentSwingLows[recentSwingLows.length - 1];
        
        // Double-check these points are valid
        if (!this.isValidSwingPoint(lastSwingHigh) || !this.isValidSwingPoint(lastSwingLow)) {
          if (this.debugMode) {
            console.error("Invalid swing points detected during structure break check");
            console.log("lastSwingHigh:", lastSwingHigh);
            console.log("lastSwingLow:", lastSwingLow);
          }
          return;
        }

        // Structure break to upside
        if (currentCandle.close > lastSwingHigh.price && 
            lastSwingLow.index < lastSwingHigh.index &&
            this.isSignificantSwing(lastSwingLow.price, lastSwingHigh.price)) {
          
          this.currentFibRetracement = this.calculateFibonacciRetracement(
            lastSwingLow, lastSwingHigh, 'uptrend'
          );
          
          if (this.debugMode) console.log(`Uptrend structure break detected at index ${currentIndex}`);
        }

        // Structure break to downside
        if (currentCandle.close < lastSwingLow.price && 
            lastSwingHigh.index < lastSwingLow.index &&
            this.isSignificantSwing(lastSwingLow.price, lastSwingHigh.price)) {
          
          this.currentFibRetracement = this.calculateFibonacciRetracement(
            lastSwingHigh, lastSwingLow, 'downtrend'
          );
          
          if (this.debugMode) console.log(`Downtrend structure break detected at index ${currentIndex}`);
        }
      }
    } catch (error) {
      console.error("Error in checkStructureBreak:", error);
      // Recover by clearing the current Fibonacci retracement
      this.currentFibRetracement = null;
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
    if (this.debugMode) console.log(`Calculating Fibonacci levels for ${direction}`);
    
    // Verify points are valid
    if (!this.isValidSwingPoint(point1) || !this.isValidSwingPoint(point2)) {
      if (this.debugMode) {
        console.error("Invalid swing points passed to calculateFibonacciRetracement");
        console.log("point1:", point1);
        console.log("point2:", point2);
      }
      
      // Create safe default points if needed
      if (!this.isValidSwingPoint(point1)) {
        point1 = {
          index: 0,
          price: 100,
          type: 'low',
          timestamp: Date.now(),
          createdAt: Date.now(),
          source: 'fallback-creation'
        };
        this.trackSwingPointMutation('fallback-create', point1);
      }
      
      if (!this.isValidSwingPoint(point2)) {
        point2 = {
          index: 1,
          price: 110,
          type: 'high',
          timestamp: Date.now() + 60000,
          createdAt: Date.now(),
          source: 'fallback-creation'
        };
        this.trackSwingPointMutation('fallback-create', point2);
      }
    }
    
    const high = direction === 'uptrend' ? point2 : point1;
    const low = direction === 'uptrend' ? point1 : point2;
    const range = high.price - low.price;

    if (range <= 0) {
      if (this.debugMode) console.log(`Invalid range: ${range} for Fibonacci calculation`);
      // Return a default retracement with the same points but safe levels
      const safeRange = Math.abs(high.price - low.price) || high.price * 0.01; // Use 1% if range is 0
      
      const levels: FibonacciLevel[] = this.config.fibRetracementLevels.map(level => ({
        level,
        price: direction === 'uptrend' 
          ? high.price - (safeRange * level)
          : low.price + (safeRange * level),
        name: this.getFibonacciLevelName(level)
      }));
      
      return { swingHigh: high, swingLow: low, levels, direction };
    }

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
    if (!this.currentFibRetracement) {
      if (this.debugMode) console.log(`No Fibonacci retracement available for long entry check at index ${index}`);
      return false;
    }
    
    if (this.currentFibRetracement.direction !== 'uptrend') {
      if (this.debugMode) console.log(`Current Fibonacci retracement is not uptrend at index ${index}`);
      return false;
    }

    // Check if price is in golden zone with proper null checks
    const goldenZoneLow = this.currentFibRetracement.levels.find(l => 
      l && Math.abs(l.level - this.config.goldenZoneMin) < 0.001
    );
    
    const goldenZoneHigh = this.currentFibRetracement.levels.find(l => 
      l && Math.abs(l.level - this.config.goldenZoneMax) < 0.001
    );
    
    if (!goldenZoneLow || !goldenZoneHigh) {
      if (this.debugMode) console.log("Golden zone levels not found in Fibonacci levels");
      return false;
    }

    const inGoldenZone = candle.close >= goldenZoneLow.price && candle.close <= goldenZoneHigh.price;
    if (!inGoldenZone) {
      if (this.debugMode) console.log(`Price ${candle.close} not in golden zone (${goldenZoneLow.price}-${goldenZoneHigh.price})`);
      return false;
    }

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

    const confirmedConditions = conditions.filter(Boolean).length;
    const result = confirmedConditions >= 3; // Require at least 3 confirmations
    
    if (this.debugMode && result) {
      console.log(`Long entry signal at index ${index}: ${confirmedConditions} conditions met`);
    }
    
    return result;
  }

  private isShortEntry(candle: Candle, prevCandle: Candle, volumeMA: number, index: number): boolean {
    if (!this.currentFibRetracement) {
      if (this.debugMode) console.log(`No Fibonacci retracement available for short entry check at index ${index}`);
      return false;
    }
    
    if (this.currentFibRetracement.direction !== 'downtrend') {
      if (this.debugMode) console.log(`Current Fibonacci retracement is not downtrend at index ${index}`);
      return false;
    }

    // Check if price is in golden zone with proper null checks
    const goldenZoneLow = this.currentFibRetracement.levels.find(l => 
      l && Math.abs(l.level - this.config.goldenZoneMin) < 0.001
    );
    
    const goldenZoneHigh = this.currentFibRetracement.levels.find(l => 
      l && Math.abs(l.level - this.config.goldenZoneMax) < 0.001
    );
    
    if (!goldenZoneLow || !goldenZoneHigh) {
      if (this.debugMode) console.log("Golden zone levels not found in Fibonacci levels");
      return false;
    }

    const inGoldenZone = candle.close >= goldenZoneLow.price && candle.close <= goldenZoneHigh.price;
    if (!inGoldenZone) {
      if (this.debugMode) console.log(`Price ${candle.close} not in golden zone (${goldenZoneLow.price}-${goldenZoneHigh.price})`);
      return false;
    }

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

    const confirmedConditions = conditions.filter(Boolean).length;
    const result = confirmedConditions >= 3; // Require at least 3 confirmations
    
    if (this.debugMode && result) {
      console.log(`Short entry signal at index ${index}: ${confirmedConditions} conditions met`);
    }
    
    return result;
  }

  private shouldExitOnFibonacci(candle: Candle): boolean {
    if (!this.currentTrade || !this.currentFibRetracement) return false;

    // Verify Fibonacci levels exist
    if (!this.currentFibRetracement.levels || !Array.isArray(this.currentFibRetracement.levels)) {
      if (this.debugMode) console.log("Invalid Fibonacci levels for exit check");
      return false;
    }

    if (this.currentTrade.position === 'long') {
      // Exit when price reaches previous swing high or 100% Fibonacci level
      const targetLevel = this.currentFibRetracement.levels.find(l => 
        l && typeof l.level === 'number' && Math.abs(l.level - 0) < 0.001
      ); // 0% = swing high
      
      if (!targetLevel) {
        if (this.debugMode) console.log("0% Fibonacci level not found for long exit");
        return false;
      }
      
      return candle.high >= targetLevel.price;
    } else {
      // Exit when price reaches previous swing low or 100% Fibonacci level
      const targetLevel = this.currentFibRetracement.levels.find(l => 
        l && typeof l.level === 'number' && Math.abs(l.level - 0) < 0.001
      ); // 0% = swing low
      
      if (!targetLevel) {
        if (this.debugMode) console.log("0% Fibonacci level not found for short exit");
        return false;
      }
      
      return candle.low <= targetLevel.price;
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

    // For seconds data, convert minutes to candle count appropriately
    let maxHoldingCandles = this.config.maxHoldingMinutes;
    
    if (this.isSecondsTimeframe) {
      // For seconds data, interpret maxHoldingMinutes as seconds
      maxHoldingCandles = this.config.maxHoldingMinutes;
    } else {
      // For minute data, multiply by average candles per minute
      maxHoldingCandles = this.config.maxHoldingMinutes;
    }

    // Close position if held for maximum time (scalping should be quick)
    const candlesHeld = index - entryIndex;
    return candlesHeld >= maxHoldingCandles;
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
    
    if (this.debugMode) console.log(`Entered LONG position at index ${index}, price ${candle.close}, stop ${stopLoss}`);
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
    
    if (this.debugMode) console.log(`Entered SHORT position at index ${index}, price ${candle.close}, stop ${stopLoss}`);
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

    // Simple Sharpe ratio calculation
    const returns = this.trades.map(t => (t.pnl || 0) / this.config.initialCapital);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1;
    
    // Adjust annualization factor based on timeframe
    const annualizationFactor = this.isSecondsTimeframe ? 252 * 24 * 60 * 60 : 252 * 24 * 60; // Seconds or minutes
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
      currentFibRetracement: this.currentFibRetracement ? {...this.currentFibRetracement} : null,
      swingPointMutations: this.swingPointMutations.slice(-10), // Last 10 mutations
      trades: this.trades.length
    };
  }
}