import { Candle, OptimizationProgress, OptimizationFilters } from '../types/trading';
import { DayTradingConfig, DayTradingBot } from './dayTradingStrategy';
import { calculateBollingerBands } from './bollingerBands';

export interface DayTradingOptimizationResult {
  // Bollinger Bands parameters
  period: number;
  stdDev: number;
  offset: number;
  
  // RSI parameters
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  
  // MACD parameters
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  
  // Risk management
  volumeThreshold: number;
  profitTarget: number;
  stopLossPercent: number;
  maxHoldingPeriod: number;
  leverage: number;
  
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
}

export class DayTradingOptimizer {
  private candles: Candle[];
  private baseConfig: DayTradingConfig;
  private onProgress?: (progress: OptimizationProgress) => void;
  private startTime: number = 0;

  constructor(candles: Candle[], baseConfig: DayTradingConfig, onProgress?: (progress: OptimizationProgress) => void) {
    this.candles = candles;
    this.baseConfig = baseConfig;
    this.onProgress = onProgress;
  }

  async optimizeAllCombinations(filters?: OptimizationFilters): Promise<DayTradingOptimizationResult[]> {
    this.startTime = Date.now();
    const results: DayTradingOptimizationResult[] = [];
    
    // Parameter ranges for day trading optimization
    const bollingerPeriods = [10, 12, 14, 16, 18, 20, 22, 24]; // Shorter periods for day trading
    const stdDevValues = [1.5, 2.0, 2.5, 3.0]; // Standard deviations
    const offsetValues = [0, 2, 5, 8, 10]; // Smaller offsets for day trading
    
    const rsiPeriods = [10, 12, 14, 16, 18, 20]; // RSI periods
    const rsiOverboughtLevels = [65, 70, 75, 80]; // Overbought levels
    const rsiOversoldLevels = [20, 25, 30, 35]; // Oversold levels
    
    const macdFastValues = [8, 10, 12, 14]; // MACD fast periods
    const macdSlowValues = [21, 24, 26, 28]; // MACD slow periods
    const macdSignalValues = [7, 9, 11]; // MACD signal periods
    
    const volumeThresholds = [1.1, 1.2, 1.3, 1.5]; // Volume multipliers
    const profitTargets = [0.008, 0.01, 0.012, 0.015, 0.018, 0.02]; // 0.8% to 2.0%
    const stopLossPercents = [0.005, 0.006, 0.008, 0.01, 0.012]; // 0.5% to 1.2%
    const maxHoldingPeriods = [3, 4, 6, 8, 12]; // Hours
    const leverageValues = [2, 3, 4, 5, 6, 8, 10]; // Conservative leverage for day trading
    
    const totalCombinations = 
      bollingerPeriods.length * stdDevValues.length * offsetValues.length *
      rsiPeriods.length * rsiOverboughtLevels.length * rsiOversoldLevels.length *
      macdFastValues.length * macdSlowValues.length * macdSignalValues.length *
      volumeThresholds.length * profitTargets.length * stopLossPercents.length *
      maxHoldingPeriods.length * leverageValues.length;

    let currentTest = 0;
    let filteredResults = 0;

    console.log(`🚀 Starting Day Trading Bot optimization: ${totalCombinations.toLocaleString()} combinations`);
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
          for (const rsiPeriod of rsiPeriods) {
            for (const rsiOverbought of rsiOverboughtLevels) {
              for (const rsiOversold of rsiOversoldLevels) {
                // Skip invalid RSI combinations
                if (rsiOverbought <= rsiOversold + 10) continue;
                
                for (const macdFast of macdFastValues) {
                  for (const macdSlow of macdSlowValues) {
                    // Skip invalid MACD combinations
                    if (macdFast >= macdSlow) continue;
                    
                    for (const macdSignal of macdSignalValues) {
                      for (const volumeThreshold of volumeThresholds) {
                        for (const profitTarget of profitTargets) {
                          for (const stopLossPercent of stopLossPercents) {
                            // Skip unfavorable risk/reward ratios
                            if (profitTarget / stopLossPercent < 1.2) continue;
                            
                            for (const maxHoldingPeriod of maxHoldingPeriods) {
                              for (const leverage of leverageValues) {
                                currentTest++;
                                
                                const config: DayTradingConfig = {
                                  ...this.baseConfig,
                                  period,
                                  stdDev,
                                  offset,
                                  rsiPeriod,
                                  rsiOverbought,
                                  rsiOversold,
                                  macdFast,
                                  macdSlow,
                                  macdSignal,
                                  volumeThreshold,
                                  profitTarget,
                                  stopLossPercent,
                                  maxHoldingPeriod,
                                  maxLeverage: leverage
                                };

                                const currentConfigStr = `BB(${period},${stdDev},${offset}) RSI(${rsiPeriod},${rsiOverbought},${rsiOversold}) MACD(${macdFast},${macdSlow},${macdSignal}) Vol(${volumeThreshold}) P/L(${(profitTarget*100).toFixed(1)}%/${(stopLossPercent*100).toFixed(1)}%) Hold(${maxHoldingPeriod}h) Lev(${leverage}x)`;
                                
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
                                  const dayTradingBot = new DayTradingBot(config);
                                  const backtestResult = dayTradingBot.backtest(this.candles, bands);

                                  const totalReturn = config.initialCapital > 0 ? backtestResult.totalPnL / config.initialCapital : 0;
                                  
                                  // Apply filters before adding to results
                                  if (this.passesFilters(backtestResult, totalReturn, filters)) {
                                    // Calculate optimization score
                                    const score = this.calculateDayTradingScore(backtestResult, totalReturn, leverage, config);

                                    const optimizationResult: DayTradingOptimizationResult = {
                                      period,
                                      stdDev,
                                      offset,
                                      rsiPeriod,
                                      rsiOverbought,
                                      rsiOversold,
                                      macdFast,
                                      macdSlow,
                                      macdSignal,
                                      volumeThreshold,
                                      profitTarget,
                                      stopLossPercent,
                                      maxHoldingPeriod,
                                      leverage,
                                      totalReturn,
                                      totalPnL: backtestResult.totalPnL,
                                      winRate: backtestResult.winRate,
                                      totalTrades: backtestResult.totalTrades,
                                      maxDrawdown: backtestResult.maxDrawdown,
                                      sharpeRatio: backtestResult.sharpeRatio,
                                      score,
                                      tradingPeriodDays: backtestResult.tradingPeriodDays,
                                      averageTradesPerDay: backtestResult.averageTradesPerDay
                                    };

                                    results.push(optimizationResult);
                                  } else {
                                    filteredResults++;
                                  }

                                  // Log progress every 5000 tests
                                  if (currentTest % 5000 === 0) {
                                    console.log(`✅ Day Trading: ${currentTest.toLocaleString()}/${totalCombinations.toLocaleString()} tests (${((currentTest/totalCombinations)*100).toFixed(1)}%)`);
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
                                  console.warn(`Failed day trading test: ${currentConfigStr}`, error);
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
      }
    }

    // Sort by score (best first)
    results.sort((a, b) => b.score - a.score);

    const totalTime = Date.now() - this.startTime;
    console.log(`🎉 Day Trading optimization complete! ${totalCombinations.toLocaleString()} combinations in ${this.formatTimeRemaining(totalTime)}`);
    console.log(`📊 Results: ${results.length.toLocaleString()} strategies passed, ${filteredResults.toLocaleString()} filtered`);
    
    if (results.length > 0) {
      const best = results[0];
      console.log(`🥇 Best Day Trading Config:`);
      console.log(`   Return: ${(best.totalReturn * 100).toFixed(2)}%, Win Rate: ${(best.winRate * 100).toFixed(1)}%`);
      console.log(`   BB: ${best.period}/${best.stdDev}/${best.offset}, RSI: ${best.rsiPeriod}/${best.rsiOverbought}/${best.rsiOversold}`);
      console.log(`   MACD: ${best.macdFast}/${best.macdSlow}/${best.macdSignal}, Vol: ${best.volumeThreshold}`);
      console.log(`   Risk: ${(best.profitTarget*100).toFixed(1)}%/${(best.stopLossPercent*100).toFixed(1)}%, Hold: ${best.maxHoldingPeriod}h, Lev: ${best.leverage}x`);
    }

    if (this.onProgress) {
      this.onProgress({
        current: totalCombinations,
        total: totalCombinations,
        currentConfig: 'Day Trading Optimization Complete',
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

  private calculateDayTradingScore(result: any, totalReturn: number, leverage: number, config: DayTradingConfig): number {
    // Day trading specific scoring system
    const returnWeight = 0.25;
    const winRateWeight = 0.25; // Higher weight for win rate in day trading
    const sharpeWeight = 0.15;
    const drawdownWeight = 0.15;
    const tradesWeight = 0.10;
    const riskRewardWeight = 0.10; // New: reward risk/reward ratio

    // Normalize metrics
    const returnScore = Math.max(0, Math.min(100, (totalReturn + 1) * 50));
    const winRateScore = result.winRate * 100;
    const sharpeScore = Math.max(0, Math.min(100, (result.sharpeRatio + 2) * 25));
    const drawdownScore = Math.max(0, 100 - (result.maxDrawdown * 100));
    const tradesScore = Math.min(100, result.totalTrades * 1); // Day trading should have more trades
    
    // Risk/reward ratio score (higher is better for day trading)
    const riskRewardRatio = config.profitTarget / config.stopLossPercent;
    const riskRewardScore = Math.min(100, (riskRewardRatio - 1) * 25); // 1:1 = 0, 2:1 = 25, 3:1 = 50, etc.

    const score = (
      returnScore * returnWeight +
      winRateScore * winRateWeight +
      sharpeScore * sharpeWeight +
      drawdownScore * drawdownWeight +
      tradesScore * tradesWeight +
      riskRewardScore * riskRewardWeight
    );

    return score;
  }

  private getBestResult(results: DayTradingOptimizationResult[]): any {
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

  private convertToOptimizationResults(results: DayTradingOptimizationResult[]): any[] {
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