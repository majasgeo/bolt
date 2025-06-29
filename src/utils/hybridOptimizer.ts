import { Candle, OptimizationProgress, OptimizationFilters } from '../types/trading';
import { BollingerFibonacciConfig, BollingerFibonacciHybridBot } from './bollingerFibonacciHybridStrategy';
import { calculateBollingerBands } from './bollingerBands';

export interface HybridOptimizationResult {
  // Bollinger Bands parameters
  period: number;
  stdDev: number;
  offset: number;
  
  // Fibonacci parameters
  swingLookback: number;
  goldenZoneMin: number;
  goldenZoneMax: number;
  
  // Risk management
  profitTarget: number;
  stopLossPercent: number;
  maxHoldingMinutes: number;
  leverage: number;
  
  // Confirmation settings
  volumeThreshold: number;
  requireBollingerBreakout: boolean;
  requireFibonacciRetracement: boolean;
  requireVolumeConfirmation: boolean;
  requireMomentumConfirmation: boolean;
  
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
  averageTradeMinutes?: number;
  signalQuality: number; // Average signal strength
}

export class HybridOptimizer {
  private candles: Candle[];
  private baseConfig: BollingerFibonacciConfig;
  private onProgress?: (progress: OptimizationProgress) => void;
  private startTime: number = 0;

  constructor(candles: Candle[], baseConfig: BollingerFibonacciConfig, onProgress?: (progress: OptimizationProgress) => void) {
    this.candles = candles;
    this.baseConfig = baseConfig;
    this.onProgress = onProgress;
  }

  async optimizeAllCombinations(filters?: OptimizationFilters): Promise<HybridOptimizationResult[]> {
    this.startTime = Date.now();
    const results: HybridOptimizationResult[] = [];
    
    // Parameter ranges for hybrid optimization
    const bollingerPeriods = [12, 15, 18, 20, 22, 25]; // Optimized for 1-minute
    const stdDevValues = [1.8, 2.0, 2.2, 2.5]; // Tighter range for scalping
    const offsetValues = [0, 2, 5, 8]; // Small offsets for 1-min
    
    const swingLookbacks = [3, 4, 5, 6, 7]; // Fibonacci swing detection
    const goldenZoneMins = [0.45, 0.5, 0.55]; // Around 50% level
    const goldenZoneMaxs = [0.618, 0.65, 0.7]; // Around 61.8% level
    
    const profitTargets = [0.008, 0.01, 0.012, 0.015, 0.018]; // 0.8% to 1.8%
    const stopLossPercents = [0.005, 0.006, 0.008, 0.01, 0.012]; // 0.5% to 1.2%
    const maxHoldingMinutesArray = [5, 6, 8, 10, 12]; // 5-12 minutes
    const leverageValues = [5, 8, 10, 15, 20]; // Conservative to aggressive
    
    const volumeThresholds = [1.2, 1.3, 1.5, 1.8]; // Volume confirmation levels
    
    // Feature combinations (optimized sets)
    const featureCombinations = [
      { bb: true, fib: true, vol: true, mom: true },   // All confirmations
      { bb: true, fib: true, vol: true, mom: false },  // No momentum
      { bb: true, fib: true, vol: false, mom: true },  // No volume
      { bb: true, fib: false, vol: true, mom: true },  // No Fibonacci requirement
      { bb: false, fib: true, vol: true, mom: true }   // No BB requirement
    ];
    
    const totalCombinations = 
      bollingerPeriods.length * stdDevValues.length * offsetValues.length *
      swingLookbacks.length * goldenZoneMins.length * goldenZoneMaxs.length *
      profitTargets.length * stopLossPercents.length * maxHoldingMinutesArray.length *
      leverageValues.length * volumeThresholds.length * featureCombinations.length;

    let currentTest = 0;
    let filteredResults = 0;

    console.log(`🚀 Starting Hybrid (BB + Fibonacci) optimization: ${totalCombinations.toLocaleString()} combinations`);
    if (filters) {
      console.log(`📊 Filters applied:`, {
        minimumTradingPeriod: filters.minimumTradingPeriodDays ? `${filters.minimumTradingPeriodDays} days` : 'None',
        minimumTrades: filters.minimumTrades || 'None',
        minimumWinRate: filters.minimumWinRate ? `${(filters.minimumWinRate * 100).toFixed(1)}%` : 'None',
        maximumDrawdown: filters.maximumDrawdown ? `${(filters.maximumDrawdown * 100).toFixed(1)}%` : 'None',
        minimumReturn: filters.minimumReturn ? `${(filters.minimumReturn * 100).toFixed(1)}%` : 'None'
      });
    }

    for (const period of bollingerPeriods) {
      for (const stdDev of stdDevValues) {
        for (const offset of offsetValues) {
          for (const swingLookback of swingLookbacks) {
            for (const goldenZoneMin of goldenZoneMins) {
              for (const goldenZoneMax of goldenZoneMaxs) {
                // Skip invalid golden zone combinations
                if (goldenZoneMin >= goldenZoneMax) continue;
                
                for (const profitTarget of profitTargets) {
                  for (const stopLossPercent of stopLossPercents) {
                    // Skip unfavorable risk/reward ratios
                    if (profitTarget / stopLossPercent < 1.2) continue;
                    
                    for (const maxHoldingMinutes of maxHoldingMinutesArray) {
                      for (const leverage of leverageValues) {
                        for (const volumeThreshold of volumeThresholds) {
                          for (const features of featureCombinations) {
                            currentTest++;
                            
                            const config: BollingerFibonacciConfig = {
                              ...this.baseConfig,
                              period,
                              stdDev,
                              offset,
                              swingLookback,
                              goldenZoneMin,
                              goldenZoneMax,
                              profitTarget,
                              stopLossPercent,
                              maxHoldingMinutes,
                              maxLeverage: leverage,
                              volumeThreshold,
                              requireBollingerBreakout: features.bb,
                              requireFibonacciRetracement: features.fib,
                              requireVolumeConfirmation: features.vol,
                              requireMomentumConfirmation: features.mom,
                              // Make sure we have the required fields
                              confirmationCandles: 1,
                              fibRetracementLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
                            };

                            const currentConfigStr = `BB(${period},${stdDev},${offset}) Fib(${swingLookback},${goldenZoneMin}-${goldenZoneMax}) P/L(${(profitTarget*100).toFixed(1)}%/${(stopLossPercent*100).toFixed(1)}%) Hold(${maxHoldingMinutes}m) Lev(${leverage}x)`;
                            
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
                              const bands = calculateBollingerBands(this.candles, period, stdDev, offset);
                              const hybridBot = new BollingerFibonacciHybridBot(config);
                              const backtestResult = hybridBot.backtest(this.candles, bands);

                              const totalReturn = config.initialCapital > 0 ? backtestResult.totalPnL / config.initialCapital : 0;
                              
                              // Apply filters before adding to results
                              if (this.passesFilters(backtestResult, totalReturn, filters)) {
                                // Calculate optimization score
                                const score = this.calculateHybridScore(backtestResult, totalReturn, leverage, config);

                                // Calculate average trade duration and signal quality
                                const averageTradeMinutes = this.calculateAverageTradeMinutes(backtestResult.trades);
                                const signalQuality = this.calculateSignalQuality(config);

                                const optimizationResult: HybridOptimizationResult = {
                                  period,
                                  stdDev,
                                  offset,
                                  swingLookback,
                                  goldenZoneMin,
                                  goldenZoneMax,
                                  profitTarget,
                                  stopLossPercent,
                                  maxHoldingMinutes,
                                  leverage,
                                  volumeThreshold,
                                  requireBollingerBreakout: features.bb,
                                  requireFibonacciRetracement: features.fib,
                                  requireVolumeConfirmation: features.vol,
                                  requireMomentumConfirmation: features.mom,
                                  totalReturn,
                                  totalPnL: backtestResult.totalPnL,
                                  winRate: backtestResult.winRate,
                                  totalTrades: backtestResult.totalTrades,
                                  maxDrawdown: backtestResult.maxDrawdown,
                                  sharpeRatio: backtestResult.sharpeRatio,
                                  score,
                                  tradingPeriodDays: backtestResult.tradingPeriodDays,
                                  averageTradesPerDay: backtestResult.averageTradesPerDay,
                                  averageTradeMinutes,
                                  signalQuality
                                };

                                results.push(optimizationResult);
                              } else {
                                filteredResults++;
                              }

                              // Log progress every 2000 tests
                              if (currentTest % 2000 === 0) {
                                console.log(`✅ Hybrid: ${currentTest.toLocaleString()}/${totalCombinations.toLocaleString()} tests (${((currentTest/totalCombinations)*100).toFixed(1)}%)`);
                                console.log(`📊 Results: ${results.length.toLocaleString()} passed, ${filteredResults.toLocaleString()} filtered`);
                                console.log(`⏱️ ETA: ${estimatedTimeRemaining}`);
                                if (results.length > 0) {
                                  const best = results[0];
                                  console.log(`🏆 Best: ${(best.totalReturn * 100).toFixed(1)}% return, ${(best.winRate * 100).toFixed(1)}% win rate`);
                                }
                              }

                              // Small delay to prevent UI blocking
                              if (currentTest % 100 === 0) {
                                await new Promise(resolve => setTimeout(resolve, 1));
                              }

                            } catch (error) {
                              console.warn(`Failed hybrid test: ${currentConfigStr}`, error);
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
        }
      }
    }

    // Sort by score (best first)
    results.sort((a, b) => b.score - a.score);

    const totalTime = Date.now() - this.startTime;
    console.log(`🎉 Hybrid optimization complete! ${totalCombinations.toLocaleString()} combinations in ${this.formatTimeRemaining(totalTime)}`);
    console.log(`📊 Results: ${results.length.toLocaleString()} strategies passed, ${filteredResults.toLocaleString()} filtered`);
    
    if (results.length > 0) {
      const best = results[0];
      console.log(`🥇 Best Hybrid Config:`);
      console.log(`   Return: ${(best.totalReturn * 100).toFixed(2)}%, Win Rate: ${(best.winRate * 100).toFixed(1)}%`);
      console.log(`   BB: ${best.period}/${best.stdDev}/${best.offset}, Fib: ${best.swingLookback}/${best.goldenZoneMin}-${best.goldenZoneMax}`);
      console.log(`   Risk: ${(best.profitTarget*100).toFixed(1)}%/${(best.stopLossPercent*100).toFixed(1)}%, Hold: ${best.maxHoldingMinutes}m, Lev: ${best.leverage}x`);
      console.log(`   Signal Quality: ${best.signalQuality.toFixed(1)}%, Avg Trade: ${best.averageTradeMinutes?.toFixed(1)}m`);
    }

    if (this.onProgress) {
      this.onProgress({
        current: totalCombinations,
        total: totalCombinations,
        currentConfig: 'Hybrid Optimization Complete',
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

  private calculateHybridScore(result: any, totalReturn: number, leverage: number, config: BollingerFibonacciConfig): number {
    // Hybrid strategy specific scoring system
    const returnWeight = 0.25;
    const winRateWeight = 0.20;
    const sharpeWeight = 0.15;
    const drawdownWeight = 0.15;
    const tradesWeight = 0.10;
    const signalQualityWeight = 0.10; // Unique to hybrid - signal strength
    const speedWeight = 0.05; // Trade duration

    // Normalize metrics
    const returnScore = Math.max(0, Math.min(100, (totalReturn + 1) * 50));
    const winRateScore = result.winRate * 100;
    const sharpeScore = Math.max(0, Math.min(100, (result.sharpeRatio + 2) * 25));
    const drawdownScore = Math.max(0, 100 - (result.maxDrawdown * 100));
    const tradesScore = Math.min(100, result.totalTrades * 1); // Hybrid should have moderate trade frequency
    
    // Signal quality score based on confirmation requirements
    const signalQualityScore = this.calculateSignalQuality(config);
    
    // Speed score: faster trades get higher score for scalping
    const avgTradeMinutes = this.calculateAverageTradeMinutes(result.trades);
    const speedScore = avgTradeMinutes > 0 ? Math.max(0, 100 - (avgTradeMinutes * 5)) : 50;

    const score = (
      returnScore * returnWeight +
      winRateScore * winRateWeight +
      sharpeScore * sharpeWeight +
      drawdownScore * drawdownWeight +
      tradesScore * tradesWeight +
      signalQualityScore * signalQualityWeight +
      speedScore * speedWeight
    );

    return score;
  }

  private calculateSignalQuality(config: BollingerFibonacciConfig): number {
    // Calculate signal quality based on confirmation requirements
    let quality = 0;
    
    if (config.requireBollingerBreakout) quality += 25; // BB breakout adds momentum
    if (config.requireFibonacciRetracement) quality += 30; // Fibonacci adds precision
    if (config.requireVolumeConfirmation) quality += 25; // Volume confirms strength
    if (config.requireMomentumConfirmation) quality += 20; // Momentum confirms direction
    
    return quality;
  }

  private calculateAverageTradeMinutes(trades: any[]): number {
    if (trades.length === 0) return 0;
    
    const completedTrades = trades.filter(t => t.exitTime && t.entryTime);
    if (completedTrades.length === 0) return 0;
    
    const totalMinutes = completedTrades.reduce((sum, trade) => {
      return sum + (trade.exitTime - trade.entryTime) / (1000 * 60);
    }, 0);
    
    return totalMinutes / completedTrades.length;
  }

  private getBestResult(results: HybridOptimizationResult[]): any {
    if (results.length === 0) return undefined;
    const best = results.reduce((best, current) => current.score > best.score ? current : best);
    
    // Convert to OptimizationResult format for compatibility
    return {
      period: best.period,
      stdDev: best.stdDev,
      offset: best.offset,
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

  private convertToOptimizationResults(results: HybridOptimizationResult[]): any[] {
    return results.map(result => ({
      period: result.period,
      stdDev: result.stdDev,
      offset: result.offset,
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