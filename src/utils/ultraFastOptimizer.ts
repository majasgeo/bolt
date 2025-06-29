import { Candle, OptimizationProgress, OptimizationFilters } from '../types/trading';
import { UltraFastScalpingConfig, UltraFastScalpingBot } from './ultraFastScalpingStrategy';
import { calculateBollingerBands } from './bollingerBands';

export interface UltraFastOptimizationResult {
  // Ultra-fast specific parameters
  maxHoldingSeconds: number;
  quickProfitTarget: number;
  tightStopLoss: number;
  scalpTargetTicks: number;
  scalpStopTicks: number;
  velocityThreshold: number;
  minPriceMovement: number;
  maxSlippage: number;
  subMinutePeriods: number;
  leverage: number;
  
  // Feature flags
  enableInstantEntry: boolean;
  enableInstantExit: boolean;
  enableMicroProfits: boolean;
  enableScalpMode: boolean;
  enableVelocityFilter: boolean;
  enableTickConfirmation: boolean;
  enableSubMinuteAnalysis: boolean;
  
  // Results
  totalReturn: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  score: number;
  tradingPeriodDays?: number;
  averageTradesPerDay?: number;
  averageTradeSeconds?: number;
}

export class UltraFastOptimizer {
  private candles: Candle[];
  private baseConfig: UltraFastScalpingConfig;
  private onProgress?: (progress: OptimizationProgress) => void;
  private startTime: number = 0;
  private isSecondsData: boolean = false;

  constructor(candles: Candle[], baseConfig: UltraFastScalpingConfig, onProgress?: (progress: OptimizationProgress) => void) {
    this.candles = candles;
    this.baseConfig = baseConfig;
    this.onProgress = onProgress;
    
    // Detect if we're working with seconds data
    this.isSecondsData = this.detectSecondsTimeframe(candles);
    console.log(`UltraFastOptimizer detected ${this.isSecondsData ? 'seconds' : 'minute'} timeframe data`);
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

  async optimizeAllCombinations(filters?: OptimizationFilters): Promise<UltraFastOptimizationResult[]> {
    this.startTime = Date.now();
    const results: UltraFastOptimizationResult[] = [];
    
    // Parameter ranges for ultra-fast scalping optimization
    // Adjust based on timeframe
    const maxHoldingSecondsArray = this.isSecondsData 
      ? [5, 10, 15, 20, 30, 45] // 5-45 seconds for seconds data
      : [10, 15, 20, 30, 45, 60]; // 10-60 seconds for minute data
      
    const quickProfitTargets = this.isSecondsData
      ? [0.0005, 0.001, 0.0015, 0.002, 0.003] // Smaller targets for seconds
      : [0.001, 0.0015, 0.002, 0.0025, 0.003]; // 0.1% to 0.3% for minute data
      
    const tightStopLosses = this.isSecondsData
      ? [0.0003, 0.0005, 0.001, 0.0015] // Tighter stops for seconds
      : [0.0005, 0.001, 0.0015, 0.002]; // 0.05% to 0.2% for minute data
      
    const scalpTargetTicksArray = [1, 2, 3, 4, 5]; // 1-5 ticks
    const scalpStopTicksArray = [1, 2, 3]; // 1-3 ticks
    
    const velocityThresholds = this.isSecondsData
      ? [0.0002, 0.0005, 0.001, 0.0015] // Lower velocity for seconds
      : [0.0005, 0.001, 0.0015, 0.002]; // Velocity filters for minute data
      
    const minPriceMovements = this.isSecondsData
      ? [0.0001, 0.0002, 0.0005] // Smaller movements for seconds
      : [0.0002, 0.0005, 0.001]; // Minimum movements for minute data
      
    const leverageValues = [10, 15, 20, 25, 30, 50]; // High leverage for scalping
    
    // Feature combinations (reduced for performance)
    const featureCombinations = [
      { instant: true, micro: true, scalp: true, velocity: true, tick: true, subMinute: true },
      { instant: true, micro: true, scalp: false, velocity: true, tick: false, subMinute: true },
      { instant: false, micro: true, scalp: true, velocity: false, tick: true, subMinute: false },
      { instant: true, micro: false, scalp: true, velocity: true, tick: true, subMinute: false }
    ];
    
    const totalCombinations = 
      maxHoldingSecondsArray.length * quickProfitTargets.length * tightStopLosses.length *
      scalpTargetTicksArray.length * scalpStopTicksArray.length * velocityThresholds.length *
      minPriceMovements.length * leverageValues.length * featureCombinations.length;

    let currentTest = 0;
    let filteredResults = 0;

    console.log(`🚀 Starting Ultra-Fast Scalping optimization: ${totalCombinations.toLocaleString()} combinations`);
    console.log(`📊 Optimizing for ${this.isSecondsData ? 'SECONDS' : 'MINUTE'} timeframe data`);
    
    if (filters) {
      console.log(`📊 Filters applied:`, {
        minimumTradingPeriod: filters.minimumTradingPeriodDays ? `${filters.minimumTradingPeriodDays} days` : 'None',
        minimumTrades: filters.minimumTrades || 'None',
        minimumWinRate: filters.minimumWinRate ? `${(filters.minimumWinRate * 100).toFixed(1)}%` : 'None',
        maximumDrawdown: filters.maximumDrawdown ? `${(filters.maximumDrawdown * 100).toFixed(1)}%` : 'None',
        minimumReturn: filters.minimumReturn ? `${(filters.minimumReturn * 100).toFixed(1)}%` : 'None'
      });
    }

    for (const maxHoldingSeconds of maxHoldingSecondsArray) {
      for (const quickProfitTarget of quickProfitTargets) {
        for (const tightStopLoss of tightStopLosses) {
          // Skip unfavorable risk/reward ratios
          if (quickProfitTarget / tightStopLoss < 1.2) continue;
          
          for (const scalpTargetTicks of scalpTargetTicksArray) {
            for (const scalpStopTicks of scalpStopTicksArray) {
              for (const velocityThreshold of velocityThresholds) {
                for (const minPriceMovement of minPriceMovements) {
                  for (const leverage of leverageValues) {
                    for (const features of featureCombinations) {
                      currentTest++;
                      
                      const config: UltraFastScalpingConfig = {
                        ...this.baseConfig,
                        maxHoldingSeconds,
                        quickProfitTarget,
                        tightStopLoss,
                        scalpTargetTicks,
                        scalpStopTicks,
                        velocityThreshold,
                        minPriceMovement,
                        maxSlippage: 0.0002, // Fixed small slippage
                        subMinutePeriods: 3, // Fixed
                        maxLeverage: leverage,
                        enableInstantEntry: features.instant,
                        enableInstantExit: features.instant,
                        enableMicroProfits: features.micro,
                        enableScalpMode: features.scalp,
                        enableVelocityFilter: features.velocity,
                        enableTickConfirmation: features.tick,
                        enableSubMinuteAnalysis: features.subMinute
                      };

                      const currentConfigStr = `Hold(${maxHoldingSeconds}s) P/L(${(quickProfitTarget*100).toFixed(2)}%/${(tightStopLoss*100).toFixed(2)}%) Ticks(${scalpTargetTicks}/${scalpStopTicks}) Vel(${(velocityThreshold*100).toFixed(2)}%) Lev(${leverage}x)`;
                      
                      // Calculate estimated time remaining
                      const elapsed = Date.now() - this.startTime;
                      const avgTimePerTest = elapsed / currentTest;
                      const remaining = (totalCombinations - currentTest) * avgTimePerTest;
                      const estimatedTimeRemaining = this.formatTimeRemaining(remaining);
                      
                      if (this.onProgress) {
                        this.onProgress({
                          current: currentTest,
                          total: totalCombinations,
                          currentConfig: currentConfigStr,
                          isRunning: true,
                          results: this.convertToOptimizationResults(results),
                          bestResult: this.getBestResult(results),
                          estimatedTimeRemaining
                        });
                      }

                      try {
                        // Use simple bands for ultra-fast strategy
                        // For seconds data, use smaller period
                        const period = this.isSecondsData ? 5 : 11;
                        const bands = calculateBollingerBands(this.candles, period, 2, 0);
                        const ultraFastBot = new UltraFastScalpingBot(config);
                        const backtestResult = ultraFastBot.backtest(this.candles, bands);

                        const totalReturn = config.initialCapital > 0 ? backtestResult.totalPnL / config.initialCapital : 0;
                        
                        // Apply filters before adding to results
                        if (this.passesFilters(backtestResult, totalReturn, filters)) {
                          // Calculate optimization score
                          const score = this.calculateUltraFastScore(backtestResult, totalReturn, leverage, config);

                          // Calculate average trade duration in seconds
                          const averageTradeSeconds = this.calculateAverageTradeSeconds(backtestResult.trades);

                          const optimizationResult: UltraFastOptimizationResult = {
                            maxHoldingSeconds,
                            quickProfitTarget,
                            tightStopLoss,
                            scalpTargetTicks,
                            scalpStopTicks,
                            velocityThreshold,
                            minPriceMovement,
                            maxSlippage: config.maxSlippage,
                            subMinutePeriods: config.subMinutePeriods,
                            leverage,
                            enableInstantEntry: features.instant,
                            enableInstantExit: features.instant,
                            enableMicroProfits: features.micro,
                            enableScalpMode: features.scalp,
                            enableVelocityFilter: features.velocity,
                            enableTickConfirmation: features.tick,
                            enableSubMinuteAnalysis: features.subMinute,
                            totalReturn,
                            totalPnL: backtestResult.totalPnL,
                            winRate: backtestResult.winRate,
                            totalTrades: backtestResult.totalTrades,
                            maxDrawdown: backtestResult.maxDrawdown,
                            sharpeRatio: backtestResult.sharpeRatio,
                            score,
                            tradingPeriodDays: backtestResult.tradingPeriodDays,
                            averageTradesPerDay: backtestResult.averageTradesPerDay,
                            averageTradeSeconds
                          };

                          results.push(optimizationResult);
                        } else {
                          filteredResults++;
                        }

                        // Log progress every 1000 tests
                        if (currentTest % 1000 === 0) {
                          console.log(`✅ Ultra-Fast: ${currentTest.toLocaleString()}/${totalCombinations.toLocaleString()} tests (${((currentTest/totalCombinations)*100).toFixed(1)}%)`);
                          console.log(`📊 Results: ${results.length.toLocaleString()} passed, ${filteredResults.toLocaleString()} filtered`);
                          console.log(`⏱️ ETA: ${estimatedTimeRemaining}`);
                          if (results.length > 0) {
                            const best = results[0];
                            console.log(`🏆 Best: ${(best.totalReturn * 100).toFixed(1)}% return, ${(best.winRate * 100).toFixed(1)}% win rate`);
                          }
                        }

                        // Small delay to prevent UI blocking
                        if (currentTest % 50 === 0) {
                          await new Promise(resolve => setTimeout(resolve, 1));
                        }

                      } catch (error) {
                        console.warn(`Failed ultra-fast test: ${currentConfigStr}`, error);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Sort by score (best first)
    results.sort((a, b) => b.score - a.score);

    const totalTime = Date.now() - this.startTime;
    console.log(`🎉 Ultra-Fast optimization complete! ${totalCombinations.toLocaleString()} combinations in ${this.formatTimeRemaining(totalTime)}`);
    console.log(`📊 Results: ${results.length.toLocaleString()} strategies passed, ${filteredResults.toLocaleString()} filtered`);
    
    if (results.length > 0) {
      const best = results[0];
      console.log(`🥇 Best Ultra-Fast Config:`);
      console.log(`   Return: ${(best.totalReturn * 100).toFixed(2)}%, Win Rate: ${(best.winRate * 100).toFixed(1)}%`);
      console.log(`   Hold: ${best.maxHoldingSeconds}s, P/L: ${(best.quickProfitTarget*100).toFixed(2)}%/${(best.tightStopLoss*100).toFixed(2)}%`);
      console.log(`   Avg Trade: ${best.averageTradeSeconds?.toFixed(1)}s, Trades/Day: ${best.averageTradesPerDay?.toFixed(1)}`);
    }

    if (this.onProgress) {
      this.onProgress({
        current: totalCombinations,
        total: totalCombinations,
        currentConfig: 'Ultra-Fast Optimization Complete',
        isRunning: false,
        results: this.convertToOptimizationResults(results),
        bestResult: this.getBestResult(results),
        estimatedTimeRemaining: '0 seconds'
      });
    }

    return results;
  }

  private passesFilters(result: any, totalReturn: number, filters?: OptimizationFilters): boolean {
    if (!filters) return true;

    if (filters.minimumTradingPeriodDays && 
        (!result.tradingPeriodDays || result.tradingPeriodDays < filters.minimumTradingPeriodDays)) {
      return false;
    }

    if (filters.minimumTrades && result.totalTrades < filters.minimumTrades) {
      return false;
    }

    if (filters.minimumWinRate && result.winRate < filters.minimumWinRate) {
      return false;
    }

    if (filters.maximumDrawdown && result.maxDrawdown > filters.maximumDrawdown) {
      return false;
    }

    if (filters.minimumReturn && totalReturn < filters.minimumReturn) {
      return false;
    }

    return true;
  }

  private calculateUltraFastScore(result: any, totalReturn: number, leverage: number, config: UltraFastScalpingConfig): number {
    // Ultra-fast scalping specific scoring system
    const returnWeight = 0.25;
    const winRateWeight = 0.20; // Important for scalping
    const sharpeWeight = 0.15;
    const drawdownWeight = 0.15;
    const tradesWeight = 0.15; // High frequency = more opportunities
    const speedWeight = 0.10; // Faster trades = better for ultra-fast

    // Normalize metrics
    const returnScore = Math.max(0, Math.min(100, (totalReturn + 1) * 50));
    const winRateScore = result.winRate * 100;
    const sharpeScore = Math.max(0, Math.min(100, (result.sharpeRatio + 2) * 25));
    const drawdownScore = Math.max(0, 100 - (result.maxDrawdown * 100));
    const tradesScore = Math.min(100, result.totalTrades * 0.2); // Ultra-fast should have many trades
    
    // Speed score: faster average trades get higher score
    const avgTradeSeconds = this.calculateAverageTradeSeconds(result.trades);
    
    // For seconds data, we want even faster trades
    const speedMultiplier = this.isSecondsData ? 2 : 1;
    const speedScore = avgTradeSeconds > 0 ? Math.max(0, 100 - (avgTradeSeconds * speedMultiplier)) : 50;

    const score = (
      returnScore * returnWeight +
      winRateScore * winRateWeight +
      sharpeScore * sharpeWeight +
      drawdownScore * drawdownWeight +
      tradesScore * tradesWeight +
      speedScore * speedWeight
    );

    return score;
  }

  private calculateAverageTradeSeconds(trades: any[]): number {
    if (trades.length === 0) return 0;
    
    const completedTrades = trades.filter(t => t.exitTime && t.entryTime);
    if (completedTrades.length === 0) return 0;
    
    const totalSeconds = completedTrades.reduce((sum, trade) => {
      return sum + (trade.exitTime - trade.entryTime) / 1000;
    }, 0);
    
    return totalSeconds / completedTrades.length;
  }

  private getBestResult(results: UltraFastOptimizationResult[]): any {
    if (results.length === 0) return undefined;
    const best = results.reduce((best, current) => current.score > best.score ? current : best);
    
    // Convert to OptimizationResult format for compatibility
    return {
      period: best.maxHoldingSeconds,
      stdDev: best.quickProfitTarget,
      offset: best.tightStopLoss,
      leverage: best.leverage,
      totalReturn: best.totalReturn,
      totalPnL: best.totalPnL,
      winRate: best.winRate,
      totalTrades: best.totalTrades,
      maxDrawdown: best.maxDrawdown,
      sharpeRatio: best.sharpeRatio,
      score: best.score,
      tradingPeriodDays: best.tradingPeriodDays,
      averageTradesPerDay: best.averageTradesPerDay
    };
  }

  private convertToOptimizationResults(results: UltraFastOptimizationResult[]): any[] {
    return results.map(result => ({
      period: result.maxHoldingSeconds,
      stdDev: result.quickProfitTarget,
      offset: result.tightStopLoss,
      leverage: result.leverage,
      totalReturn: result.totalReturn,
      totalPnL: result.totalPnL,
      winRate: result.winRate,
      totalTrades: result.totalTrades,
      maxDrawdown: result.maxDrawdown,
      sharpeRatio: result.sharpeRatio,
      score: result.score,
      tradingPeriodDays: result.tradingPeriodDays,
      averageTradesPerDay: result.averageTradesPerDay
    }));
  }

  private formatTimeRemaining(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}