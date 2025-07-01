import { Candle } from '../types/trading';

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  timestamp: number;
  createdAt?: number;
  source?: string;
}

export interface SwingPointMutation {
  action: string;
  point: SwingPoint | null;
  timestamp: number;
  stack: string;
}

/**
 * Standalone utility for debugging swing point detection issues
 * This class can be used to isolate and test swing point logic
 */
export class SwingPointDebugger {
  private swingPoints: SwingPoint[] = [];
  private mutations: SwingPointMutation[] = [];
  private swingLookback: number;
  private minSwingSize: number;
  
  constructor(swingLookback: number = 5, minSwingSize: number = 0.01) {
    this.swingLookback = swingLookback;
    this.minSwingSize = minSwingSize;
    console.log(`SwingPointDebugger initialized with lookback=${swingLookback}, minSwingSize=${minSwingSize}`);
  }
  
  /**
   * Process a set of candles to detect swing points
   * @param candles Array of candles to process
   * @returns Array of detected swing points
   */
  public processCandles(candles: Candle[]): SwingPoint[] {
    console.log(`Processing ${candles.length} candles for swing points`);
    
    // Reset state
    this.swingPoints = [];
    this.mutations = [];
    
    // Initialize with first points
    this.initializeSwingPoints(candles);
    
    // Process each candle
    for (let i = this.swingLookback; i < candles.length; i++) {
      this.updateSwingPoints(candles, i);
    }
    
    console.log(`Detected ${this.swingPoints.length} swing points`);
    console.log(`Recorded ${this.mutations.length} mutations`);
    
    return [...this.swingPoints];
  }
  
  /**
   * Get all recorded mutations for analysis
   */
  public getMutations(): SwingPointMutation[] {
    return [...this.mutations];
  }
  
  /**
   * Get mutation statistics
   */
  public getMutationStats(): any {
    const actionCounts: Record<string, number> = {};
    
    this.mutations.forEach(mutation => {
      actionCounts[mutation.action] = (actionCounts[mutation.action] || 0) + 1;
    });
    
    return {
      total: this.mutations.length,
      byAction: actionCounts,
      nullPointActions: this.mutations.filter(m => m.action !== 'filter' && m.point === null).length
    };
  }
  
  /**
   * Validate if an object is a valid SwingPoint
   */
  public isValidSwingPoint(point: any): point is SwingPoint {
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
   * Track mutations to the swing points array
   */
  private trackMutation(action: string, point: SwingPoint | null) {
    const stack = new Error().stack || '';
    
    this.mutations.push({
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
   * Initialize swing points with first data points
   */
  private initializeSwingPoints(candles: Candle[]) {
    if (candles.length < this.swingLookback * 2) {
      console.log("Not enough candles to initialize swing points");
      return;
    }
    
    // Add initial high and low points
    const highIndex = Math.min(this.swingLookback, candles.length - 1);
    const lowIndex = Math.min(this.swingLookback * 2, candles.length - 1);
    
    console.log(`Initializing swing points at indices ${highIndex} (high) and ${lowIndex} (low)`);
    
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
    this.trackMutation('add', highPoint);
    this.trackMutation('add', lowPoint);
    
    // Add to array
    this.swingPoints.push(highPoint);
    this.swingPoints.push(lowPoint);
  }
  
  /**
   * Update swing points with new candle data
   */
  private updateSwingPoints(candles: Candle[], currentIndex: number) {
    // Clean up any invalid entries first
    const originalLength = this.swingPoints.length;
    const validSwingPoints = this.swingPoints.filter(point => this.isValidSwingPoint(point));
    
    // If we lost any points during filtering, log it
    if (validSwingPoints.length !== originalLength) {
      console.log(`⚠️ Removed ${originalLength - validSwingPoints.length} invalid swing points`);
      
      // Track this mutation
      this.trackMutation('filter', null);
    }
    
    // Update the array with only valid points
    this.swingPoints = validSwingPoints;

    if (currentIndex < this.swingLookback * 2) {
      return;
    }

    const lookback = this.swingLookback;
    const centerIndex = currentIndex - lookback;
    
    // Ensure centerIndex is valid
    if (centerIndex < 0 || centerIndex >= candles.length) {
      return;
    }
    
    const centerCandle = candles[centerIndex];
    if (!centerCandle) {
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
      this.trackMutation('add', newSwingHigh);
      
      // Add to array
      this.swingPoints.push(newSwingHigh);
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
      this.trackMutation('add', newSwingLow);
      
      // Add to array
      this.swingPoints.push(newSwingLow);
    }

    // Keep only recent swing points and filter out any invalid entries again
    const beforePruneLength = this.swingPoints.length;
    this.swingPoints = this.swingPoints.filter(point => 
      this.isValidSwingPoint(point) &&
      currentIndex - point.index <= this.swingLookback * 10
    );
    
    // Track pruning
    if (beforePruneLength !== this.swingPoints.length) {
      this.trackMutation('prune', null);
    }
  }
  
  /**
   * Run a stress test on the swing point detection logic
   */
  public runStressTest(): void {
    console.log("Running swing point detection stress test...");
    
    // Create test candles
    const candles: Candle[] = [];
    let price = 100;
    const startTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    for (let i = 0; i < 1000; i++) {
      const timestamp = startTime + (i * 60 * 60 * 1000); // Hourly candles
      const change = (Math.random() - 0.5) * 0.02; // 2% random change
      const open = price;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(Math.random() * 1000 + 500);
      
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    // Process candles
    const swingPoints = this.processCandles(candles);
    
    // Inject some invalid points for testing
    this.swingPoints.push(null as any);
    this.trackMutation('inject-null', null);
    
    this.swingPoints.push({} as any);
    this.trackMutation('inject-empty', {} as any);
    
    this.swingPoints.push({
      index: 999,
      price: NaN,
      type: 'high',
      timestamp: Date.now()
    });
    this.trackMutation('inject-nan', this.swingPoints[this.swingPoints.length - 1]);
    
    // Try to process again with corrupted data
    this.updateSwingPoints(candles, 500);
    
    // Check results
    console.log("Stress test complete");
    console.log(`Final swing points: ${this.swingPoints.length}`);
    console.log(`Valid swing points: ${this.swingPoints.filter(p => this.isValidSwingPoint(p)).length}`);
    console.log("Mutation stats:", this.getMutationStats());
  }
}

// Export a function to run a standalone test
export function runSwingPointTest(candles: Candle[]): any {
  console.log("Running standalone swing point test...");
  
  const debugger1 = new SwingPointDebugger(5, 0.01);
  const swingPoints = debugger1.processCandles(candles);
  
  // Run stress test
  const debugger2 = new SwingPointDebugger(5, 0.01);
  debugger2.runStressTest();
  
  return {
    swingPoints,
    mutationStats: debugger1.getMutationStats(),
    stressTestStats: debugger2.getMutationStats()
  };
}