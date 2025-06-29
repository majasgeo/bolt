import { Candle, OptimizationProgress, OptimizationFilters } from '../types/trading';
import { FibonacciScalpingConfig, FibonacciScalpingBot } from './fibonacciScalpingStrategy';
import { calculateBollingerBands } from './bollingerBands';

export interface FibonacciOptimizationResult {
  // Fibonacci parameters
  swingLookback: number;
  goldenZoneMin: number;
  goldenZoneMax: number;
  structureBreakConfirmation: number;
  minSwingSize: number;
  
  // Risk management
  profitTarget: number;
  stopLossPercent: number;
  riskRewardRatio: number;
  maxHoldingMinutes: number;
  leverage: number;
  
  // Entry confirmation
  volumeThreshold: number;
  requireVolumeConfirmation: boolean;
  requireCandleColorConfirmation: boolean;
  
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
}

export class FibonacciOptimizer {
  private candles: Candle[];
  private baseConfig: FibonacciScalpingConfig;
  private onProgress?: (progress: OptimizationProgress) => void;
  private startTime: number = 0;

  constructor(candles: Candle[], baseConfig: FibonacciScalpingConfig, onProgress?: (progress: OptimizationProgress) => void) {
    this.candles = candles;
    this.baseConfig = baseConfig;
    this.onProgress = onProgress;
  }

  async optimizeAllCombinations(filters?: OptimizationFilters): Promise<FibonacciOptimizationResult[]> {
    this.startTime = Date.now();
    const results: FibonacciOptimizationResult[] = [];
    
    // Parameter ranges for Fibonacci scalping optimization
    const swingLookbacks = [3, 4, 5, 6, 7, 8]; // Swing detection periods
    const goldenZoneMins = [0.5, 0.45, 0.55]; // Golden zone minimum (50% level variations)
    const goldenZoneMaxs = [0.618, 0.65, 0.7]; // Golden zone maximum (61.8% level variations)
    const structureBreakConfirmations = [1, 2, 3]; // Confirmation candles
    const minSwingSizes = [0.005, 0.008, 0.01, 0.015, 0.02]; // 0.5% to 2% minimum swing
    
    const profitTargets = [0.008, 0.01, 0.012, 0.015, 0.018, 0.02]; // 0.8% to 2% profit targets
    const stopLossPercents = [0.004, 0.005, 0.006, 0.008, 0.01]; // 0.4% to 1% stop loss
    const maxHoldingMinutesArray = [5, 7, 10, 15, 20]; // 5 to 20 minutes max hold
    const leverageValues = [5, 8, 10, 15, 20, 25]; // Conservative to aggressive leverage
    
    const volumeThresholds = [1.0, 1.2, 1.5, 2.0]; // Volume confirmation levels
    const volumeConfirmationOptions = [true, false]; // Require volume confirmation
    const candleColorConfirmationOptions = [true, false]; // Require candle color confirmation
    
    const totalCombinations = 
      swingLookbacks.length * goldenZoneMins.length * goldenZoneMaxs.length *
      structureBreakConfirmations.length * minSwingSizes.length *
      profitTargets.length * stopLossPercents.length * maxHoldingMinutesArray.length *
      leverageValues.length * volumeThresholds.length *
      volumeConfirmationOptions.length * candleColorConfirmationOptions.length;

    let currentTest = 0;
    let filteredResults = 0;

    console.log(`🚀 Starting Fibonacci Scalping optimization: ${totalCombinations.toLocaleString()} combinations`);
    if (filters) {
      console.log(`📊 Filters applied:`, {
        minimumTradingPeriod: filters.minimumTradingPeriodDays ? `${filters.minimumTradingPeriodDays} days` : 'None',
        minimumTrades: filters.minimumTrades || 'None',
        minimumWinRate: filters.minimumWinRate ? `${(filters.minimumWinRate * 100).toFixed(1)}%` : 'None',
        maximumDrawdown: filters.maximumDrawdown ? `${(filters.maximumDrawdown * 100).toFixed(1)}%` : 'None',
        minimumReturn: filters.minimumReturn ? `${(filters.minimumReturn * 100).toFixed(1)}%` : 'None'
      });
    }

    for (const swingLookback of swingLookbacks) {
      for (const goldenZoneMin of goldenZoneMins) {
        for (const goldenZoneMax of goldenZoneMaxs) {
          // Skip invalid golden zone combinations
          if (goldenZoneMin >= goldenZoneMax) continue;
          
          for (const structureBreakConfirmation of structureBreakConfirmations) {
            for (const minSwingSize of minSwingSizes) {
              for (const profitTarget of profitTargets) {
                for (const stopLossPercent of stopLossPercents) {
                  // Calculate risk/reward ratio
                  const riskRewardRatio = profitTarget / stopLossPercent;
                  
                  // Skip unfavorable risk/reward ratios (less than 1.2:1)
                  if (riskRewardRatio < 1.2) continue;
                  
                  for (const maxHoldingMinutes of maxHoldingMinutesArray) {
                    for (const leverage of leverageValues) {
                      for (const volumeThreshold of volumeThresholds) {
                        for (const requireVolumeConfirmation of volumeConfirmationOptions) {
                          for (const requireCandleColorConfirmation of candleColorConfirmationOptions) {
                            currentTest++;
                            
                            const config: FibonacciScalpingConfig = {
                              ...this.baseConfig,
                              swingLookback,
                              fibRetracementLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
                              goldenZoneMin,
                              goldenZoneMax,
                              structureBreakConfirmation,
                              minSwingSize,
                              profitTarget,
                              stopLossPercent,
                              riskRewardRatio,
                              maxHoldingMinutes,
                              maxLeverage: leverage,
                              volumeThreshold,
                              requireVolumeConfirmation,
                              requireCandleColorConfirmation
                            };

                            const currentConfigStr = `Swing(${swingLookback}) GZ(${goldenZoneMin}-${goldenZoneMax}) MinSwing(${(minSwingSize*100).toFixed(1)}%) P/L(${(profitTarget*100).toFixed(1)}%/${(stopLossPercent*100).toFixed(1)}%) Hold(${maxHoldingMinutes}m) Lev(${leverage}x) Vol(${volumeThreshold})`;
                            
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
                              // Use simple bands for Fibonacci strategy (not the main indicator)
                              const bands = calculateBollingerBands(this.candles, 20, 2, 0);
                              const fibonacciBot = new FibonacciScalpingBot(config);
                              const backtestResult = fibonacciBot.backtest(this.candles, bands);

                              const totalReturn = config.initialCapital > 0 ? backtestResult.totalPnL / config.initialCapital : 0;
                              
                              // Apply filters before adding to results
                              if (this.passesFilters(backtestResult, totalReturn, filters)) {
                                // Calculate optimization score
                                const score = this.calculateFibonacciScore(backtestResult, totalReturn, leverage, config);

                                // Calculate average trade duration
                                const averageTradeMinutes = this.calculateAverageTradeMinutes(backtestResult.trades);

                                const optimizationResult: FibonacciOptimizationResult = {
                                  swingLookback,
                                  goldenZoneMin,
                                  goldenZoneMax,
                                  structureBreakConfirmation,
                                  minSwingSize,
                                  profitTarget,
                                  stopLossPercent,
                                  riskRewardRatio,
                                  maxHoldingMinutes,
                                  leverage,
                                  volumeThreshold,
                                  requireVolumeConfirmation,
                                  requireCandleColorConfirmation,
                                  totalReturn,
                                  totalPnL: backtestResult.totalPnL,
                                  winRate: backtestResult.winRate,
                                  totalTrades: backtestResult.totalTrades,
                                  maxDrawdown: backtestResult.maxDrawdown,
                                  sharpeRatio: backtestResult.sharpeRatio,
                                  score,
                                  tradingPeriodDays: backtestResult.tradingPeriodDays,
                                  averageTradesPerDay: backtestResult.averageTradesPerDay,
                                  averageTradeMinutes
                                };

                                results.push(optimizationResult);
                              } else {
                                filteredResults++;
                              }

                              // Log progress every 5000 tests
                              if (currentTest % 5000 === 0) {
                                console.log(`✅ Fibonacci: ${currentTest.toLocaleString()}/${totalCombinations.toLocaleString()} tests (${((currentTest/totalCombinations)*100).toFixed(1)}%)`);
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
                              console.warn(`Failed Fibonacci test: ${currentConfigStr}`, error);
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
    console.log(`🎉 Fibonacci optimization complete! ${totalCombinations.toLocaleString()} combinations in ${this.formatTimeRemaining(totalTime)}`);
    console.log(`📊 Results: ${results.length.toLocaleString()} strategies passed, ${filteredResults.toLocaleString()} filtered`);
    
    if (results.length > 0) {
      const best = results[0];
      console.log(`🥇 Best Fibonacci Config:`);
      console.log(`   Return: ${(best.totalReturn * 100).toFixed(2)}%, Win Rate: ${(best.winRate * 100).toFixed(1)}%`);
      console.log(`   Swing: ${best.swingLookback}, Golden Zone: ${best.goldenZoneMin}-${best.goldenZoneMax}`);
      console.log(`   Risk: ${(best.profitTarget*100).toFixed(1)}%/${(best.stopLossPercent*100).toFixed(1)}%, Hold: ${best.maxHoldingMinutes}m, Lev: ${best.leverage}x`);
      console.log(`   Avg Trade: ${best.averageTradeMinutes?.toFixed(1)}m, Trades/Day: ${best.averageTradesPerDay?.toFixed(1)}`);
    }

    if (this.onProgress) {
      this.onProgress({
        current: totalCombinations,
        total: totalCombinations,
        currentConfig: 'Fibonacci Optimization Complete',
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

  private calculateFibonacciScore(result: any, totalReturn: number, leverage: number, config: FibonacciScalpingConfig): number {
    // Fibonacci scalping specific scoring system
    const returnWeight = 0.30;
    const winRateWeight = 0.25; // High importance for scalping
    const sharpeWeight = 0.15;
    const drawdownWeight = 0.15;
    const tradesWeight = 0.10; // More trades = more opportunities
    const speedWeight = 0.05; // Faster trades = better for scalping

    // Normalize metrics
    const returnScore = Math.max(0, Math.min(100, (totalReturn + 1) * 50));
    const winRateScore = result.winRate * 100;
    const sharpeScore = Math.max(0, Math.min(100, (result.sharpeRatio + 2) * 25));
    const drawdownScore = Math.max(0, 100 - (result.maxDrawdown * 100));
    const tradesScore = Math.min(100, result.totalTrades * 0.5); // Scalping should have many trades
    
    // Speed score: faster average trades get higher score
    const avgTradeMinutes = this.calculateAverageTradeMinutes(result.trades);
    const speedScore = avgTradeMinutes > 0 ? Math.max(0, 100 - (avgTradeMinutes * 2)) : 50;

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

  private calculateAverageTradeMinutes(trades: any[]): number {
    if (trades.length === 0) return 0;
    
    const completedTrades = trades.filter(t => t.exitTime && t.entryTime);
    if (completedTrades.length === 0) return 0;
    
    const totalMinutes = completedTrades.reduce((sum, trade) => {
      return sum + (trade.exitTime - trade.entryTime) / (1000 * 60);
    }, 0);
    
    return totalMinutes / completedTrades.length;
  }

  private getBestResult(results: FibonacciOptimizationResult[]): any {
    if (results.length === 0) return undefined;
    const best = results.reduce((best, current) => current.score > best.score ? current : best);
    
    // Convert to OptimizationResult format for compatibility
    return {
      period: best.swingLookback,
      stdDev: best.goldenZoneMin,
      offset: best.goldenZoneMax,
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

  private convertToOptimizationResults(results: FibonacciOptimizationResult[]): any[] {
    return results.map(result => ({
      period: result.swingLookback,
      stdDev: result.goldenZoneMin,
      offset: result.goldenZoneMax,
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