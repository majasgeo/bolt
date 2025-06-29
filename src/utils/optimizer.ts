import { Candle, TradingConfig, OptimizationResult, OptimizationProgress, OptimizationFilters } from '../types/trading';
import { calculateBollingerBands } from './bollingerBands';
import { Backtester } from './backtester';

export class StrategyOptimizer {
  private candles: Candle[];
  private baseConfig: TradingConfig;
  private onProgress?: (progress: OptimizationProgress) => void;
  private startTime: number = 0;
  private isSecondsData: boolean = false;

  constructor(candles: Candle[], baseConfig: TradingConfig, onProgress?: (progress: OptimizationProgress) => void) {
    this.candles = candles;
    this.baseConfig = baseConfig;
    this.onProgress = onProgress;
    
    // Detect if we're working with seconds data
    this.isSecondsData = this.detectSecondsTimeframe(candles);
    console.log(`StrategyOptimizer detected ${this.isSecondsData ? 'seconds' : 'minute/hour'} timeframe data`);
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

  async optimizeAllCombinations(filters?: OptimizationFilters): Promise<OptimizationResult[]> {
    this.startTime = Date.now();
    const results: OptimizationResult[] = [];
    
    // Parameter ranges - adjust based on timeframe
    const smaRange = this.isSecondsData 
      ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20] // Smaller SMA range for seconds data
      : Array.from({ length: 49 }, (_, i) => i + 2); // SMA 2 to 50 for minute/hour data
      
    const stdDevValues = this.isSecondsData
      ? [1, 1.5, 2, 2.5] // Fewer StdDev values for seconds
      : [1, 1.5, 2, 2.5, 3]; // Common standard deviation values
      
    const offsetValues = this.isSecondsData
      ? [0, 2, 5] // Smaller offsets for seconds
      : [0, 5, 10, 15, 20]; // Common offset values
      
    const leverageValues = [2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 125]; // Leverage range
    
    const totalCombinations = smaRange.length * stdDevValues.length * offsetValues.length * leverageValues.length;
    let currentTest = 0;
    let filteredResults = 0;

    console.log(`🚀 Starting comprehensive optimization: ${totalCombinations.toLocaleString()} combinations`);
    console.log(`📊 Using EXACT same calculation method as manual backtest`);
    console.log(`📊 Optimizing for ${this.isSecondsData ? 'SECONDS' : 'MINUTE/HOUR'} timeframe data`);
    
    if (filters) {
      console.log(`📊 Filters applied:`, {
        minimumTradingPeriod: filters.minimumTradingPeriodDays ? `${filters.minimumTradingPeriodDays} days` : 'None',
        minimumTrades: filters.minimumTrades || 'None',
        minimumWinRate: filters.minimumWinRate ? `${(filters.minimumWinRate * 100).toFixed(1)}%` : 'None',
        maximumDrawdown: filters.maximumDrawdown ? `${(filters.maximumDrawdown * 100).toFixed(1)}%` : 'None',
        minimumReturn: filters.minimumReturn ? `${(filters.minimumReturn * 100).toFixed(1)}%` : 'None'
      });
    }

    for (const period of smaRange) {
      for (const stdDev of stdDevValues) {
        for (const offset of offsetValues) {
          for (const leverage of leverageValues) {
            currentTest++;
            
            // Create EXACT same config as manual backtest
            const config: TradingConfig = {
              period,
              stdDev,
              offset,
              maxLeverage: leverage,
              initialCapital: this.baseConfig.initialCapital,
              enableLongPositions: this.baseConfig.enableLongPositions,
              enableShortPositions: this.baseConfig.enableShortPositions
            };

            const currentConfigStr = `SMA ${period}, StdDev ${stdDev}, Offset ${offset}, Leverage ${leverage}x`;
            
            // Calculate estimated time remaining
            const elapsed = Date.now() - this.startTime;
            const avgTimePerTest = elapsed / currentTest;
            const remaining = (totalCombinations - currentTest) * avgTimePerTest;
            const estimatedTimeRemaining = this.formatTimeRemaining(remaining);
            
            try {
              // Use EXACT same calculation as manual backtest
              const bands = calculateBollingerBands(this.candles, period, stdDev, offset);
              const backtester = new Backtester(config);
              const backtestResult = backtester.backtest(this.candles, bands);

              // Calculate total return EXACTLY the same way as manual backtest
              const totalReturn = config.initialCapital > 0 ? backtestResult.totalPnL / config.initialCapital : 0;
              
              // Debug logging for first few results to verify calculation
              if (currentTest <= 5) {
                console.log(`🔍 Debug Test ${currentTest}:`, {
                  config: `SMA ${period}, StdDev ${stdDev}, Offset ${offset}, Leverage ${leverage}x`,
                  initialCapital: config.initialCapital,
                  totalPnL: backtestResult.totalPnL,
                  totalReturn: (totalReturn * 100).toFixed(2) + '%',
                  totalTrades: backtestResult.totalTrades,
                  winRate: (backtestResult.winRate * 100).toFixed(1) + '%'
                });
              }
              
              // Apply filters before adding to results
              if (this.passesFilters(backtestResult, totalReturn, filters)) {
                // Calculate optimization score (weighted combination of metrics)
                const score = this.calculateOptimizationScore(backtestResult, totalReturn, leverage);

                const optimizationResult: OptimizationResult = {
                  period,
                  stdDev,
                  offset,
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
                
                // Sort results immediately to keep best at top
                results.sort((a, b) => b.score - a.score);
                
                // Limit results array size to prevent memory issues
                if (results.length > 1000) {
                  results.splice(1000);
                }
              } else {
                filteredResults++;
              }

              // Update progress with current best result
              if (this.onProgress) {
                // Get the actual best result from sorted results
                const currentBest = results.length > 0 ? results[0] : undefined;
                
                this.onProgress({
                  current: currentTest,
                  total: totalCombinations,
                  currentConfig: currentConfigStr,
                  isRunning: true,
                  results: results,
                  bestResult: currentBest,
                  estimatedTimeRemaining
                });
              }

              // Log progress every 1000 tests
              if (currentTest % 1000 === 0) {
                console.log(`✅ Completed ${currentTest.toLocaleString()}/${totalCombinations.toLocaleString()} tests (${((currentTest/totalCombinations)*100).toFixed(1)}%)`);
                console.log(`📊 Results: ${results.length.toLocaleString()} passed filters, ${filteredResults.toLocaleString()} filtered out`);
                console.log(`⏱️ Estimated time remaining: ${estimatedTimeRemaining}`);
                if (results.length > 0) {
                  const best = results[0]; // Already sorted
                  console.log(`🏆 Current best: ${best?.totalReturn ? (best.totalReturn * 100).toFixed(1) : 'N/A'}% return (SMA ${best?.period}, StdDev ${best?.stdDev}, Offset ${best?.offset}, Leverage ${best?.leverage}x)`);
                  if (best?.tradingPeriodDays) {
                    console.log(`📅 Trading period: ${this.formatDuration(best.tradingPeriodDays)}, Trades/Day: ${best.averageTradesPerDay?.toFixed(2) || 'N/A'}`);
                  }
                }
              }

              // Small delay to prevent UI blocking
              if (currentTest % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
              }

            } catch (error) {
              console.warn(`Failed to test configuration: ${currentConfigStr}`, error);
            }
          }
        }
      }
    }

    // Final sort by score (best first)
    results.sort((a, b) => b.score - a.score);

    const totalTime = Date.now() - this.startTime;
    console.log(`🎉 Optimization complete! Tested ${totalCombinations.toLocaleString()} combinations in ${this.formatTimeRemaining(totalTime)}`);
    console.log(`📊 Final results: ${results.length.toLocaleString()} strategies passed filters, ${filteredResults.toLocaleString()} filtered out`);
    
    if (results.length > 0) {
      const best = results[0];
      console.log(`🥇 Best configuration: ${(best.totalReturn * 100).toFixed(2)}% return`);
      console.log(`   Parameters: SMA ${best.period}, StdDev ${best.stdDev}, Offset ${best.offset}, Leverage ${best.leverage}x`);
      console.log(`   Win Rate: ${(best.winRate * 100).toFixed(1)}%, Trades: ${best.totalTrades}, Max Drawdown: ${(best.maxDrawdown * 100).toFixed(1)}%`);
      if (best.tradingPeriodDays) {
        console.log(`   Trading Period: ${this.formatDuration(best.tradingPeriodDays)}, Trades/Day: ${best.averageTradesPerDay?.toFixed(2) || 'N/A'}`);
      }
      
      // CRITICAL: Test the best configuration manually to verify it matches
      console.log(`🔍 VERIFICATION: Testing best config manually...`);
      const verifyConfig: TradingConfig = {
        period: best.period,
        stdDev: best.stdDev,
        offset: best.offset,
        maxLeverage: best.leverage,
        initialCapital: this.baseConfig.initialCapital,
        enableLongPositions: this.baseConfig.enableLongPositions,
        enableShortPositions: this.baseConfig.enableShortPositions
      };
      
      const verifyBands = calculateBollingerBands(this.candles, best.period, best.stdDev, best.offset);
      const verifyBacktester = new Backtester(verifyConfig);
      const verifyResult = verifyBacktester.backtest(this.candles, verifyBands);
      const verifyReturn = verifyConfig.initialCapital > 0 ? verifyResult.totalPnL / verifyConfig.initialCapital : 0;
      
      console.log(`🔍 VERIFICATION RESULT:`, {
        optimizationReturn: (best.totalReturn * 100).toFixed(2) + '%',
        manualTestReturn: (verifyReturn * 100).toFixed(2) + '%',
        match: Math.abs(best.totalReturn - verifyReturn) < 0.0001 ? '✅ MATCH' : '❌ MISMATCH'
      });
      
      if (Math.abs(best.totalReturn - verifyReturn) >= 0.0001) {
        console.error(`❌ CRITICAL: Optimization and manual test results don't match!`);
        console.error(`   This explains why you see different results.`);
      }
    } else {
      console.log(`⚠️ No strategies met the specified filter criteria. Consider relaxing the filters.`);
    }

    if (this.onProgress) {
      const finalBest = results.length > 0 ? results[0] : undefined;
      
      this.onProgress({
        current: totalCombinations,
        total: totalCombinations,
        currentConfig: 'Optimization Complete',
        isRunning: false,
        results: results,
        bestResult: finalBest,
        estimatedTimeRemaining: '0 seconds'
      });
    }

    return results;
  }

  private passesFilters(result: any, totalReturn: number, filters?: OptimizationFilters): boolean {
    if (!filters) return true;

    // Check minimum trading period
    if (filters.minimumTradingPeriodDays && 
        (!result.tradingPeriodDays || result.tradingPeriodDays < filters.minimumTradingPeriodDays)) {
      return false;
    }

    // Check minimum trades
    if (filters.minimumTrades && result.totalTrades < filters.minimumTrades) {
      return false;
    }

    // Check minimum win rate
    if (filters.minimumWinRate && result.winRate < filters.minimumWinRate) {
      return false;
    }

    // Check maximum drawdown
    if (filters.maximumDrawdown && result.maxDrawdown > filters.maximumDrawdown) {
      return false;
    }

    // Check minimum return
    if (filters.minimumReturn && totalReturn < filters.minimumReturn) {
      return false;
    }

    return true;
  }

  private calculateOptimizationScore(result: any, totalReturn: number, leverage: number): number {
    // Enhanced weighted scoring system that considers leverage risk
    const returnWeight = 0.35;
    const winRateWeight = 0.15;
    const sharpeWeight = 0.20;
    const drawdownWeight = 0.15;
    const tradesWeight = 0.10;
    const leverageRiskWeight = 0.05;

    // Normalize metrics (0-100 scale)
    const returnScore = Math.max(0, Math.min(100, (totalReturn + 1) * 50)); // -100% to +100% return maps to 0-100
    const winRateScore = result.winRate * 100;
    const sharpeScore = Math.max(0, Math.min(100, (result.sharpeRatio + 2) * 25)); // -2 to +2 Sharpe maps to 0-100
    const drawdownScore = Math.max(0, 100 - (result.maxDrawdown * 100)); // Lower drawdown = higher score
    const tradesScore = Math.min(100, result.totalTrades * 2); // More trades up to 50 = higher score
    
    // Leverage risk penalty: higher leverage gets lower score (risk adjustment)
    const leverageRiskScore = Math.max(0, 100 - ((leverage - 2) / 123) * 30); // 2x = 100, 125x = 70

    const score = (
      returnScore * returnWeight +
      winRateScore * winRateWeight +
      sharpeScore * sharpeWeight +
      drawdownScore * drawdownWeight +
      tradesScore * tradesWeight +
      leverageRiskScore * leverageRiskWeight
    );

    return score;
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

  private formatDuration(days: number): string {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (days < 30) {
      return `${Math.round(days)} day${Math.round(days) !== 1 ? 's' : ''}`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.round(days / 365 * 10) / 10;
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  }
}