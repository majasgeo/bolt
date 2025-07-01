import { Candle, TradingConfig, OptimizationResult, OptimizationProgress, OptimizationFilters } from '../types/trading';
import { calculateBollingerBands } from './bollingerBands';
import { Backtester } from './backtester';
import { detectTimeframe } from './csvParser';

export interface MultiTimeframeOptimizationResult extends OptimizationResult {
  timeframe: string;
  datasetName: string;
}

export interface MultiTimeframeOptimizationProgress extends OptimizationProgress {
  currentDataset: string;
  currentTimeframe: string;
  totalDatasets: number;
  currentDatasetIndex: number;
}

export interface DatasetInfo {
  name: string;
  candles: Candle[];
  timeframe: string;
}

export class MultiTimeframeOptimizer {
  private datasets: DatasetInfo[];
  private baseConfig: TradingConfig;
  private onProgress?: (progress: MultiTimeframeOptimizationProgress) => void;
  private startTime: number = 0;

  constructor(
    datasets: DatasetInfo[],
    baseConfig: TradingConfig,
    onProgress?: (progress: MultiTimeframeOptimizationProgress) => void
  ) {
    this.datasets = datasets;
    this.baseConfig = baseConfig;
    this.onProgress = onProgress;
  }

  async optimizeAcrossTimeframes(filters?: OptimizationFilters): Promise<MultiTimeframeOptimizationResult[]> {
    this.startTime = Date.now();
    const allResults: MultiTimeframeOptimizationResult[] = [];
    
    // Parameter ranges - we'll use the same for all timeframes
    const smaRange = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 25, 30, 40, 50];
    const stdDevValues = [1, 1.5, 2, 2.5, 3];
    const offsetValues = [0, 5, 10, 15, 20];
    const leverageValues = [2, 3, 5, 10, 15, 20, 25, 30, 40, 50];
    
    const paramCombinations = smaRange.length * stdDevValues.length * offsetValues.length * leverageValues.length;
    const totalCombinations = paramCombinations * this.datasets.length;
    
    console.log(`🚀 Starting multi-timeframe optimization across ${this.datasets.length} datasets`);
    console.log(`📊 Testing ${paramCombinations.toLocaleString()} parameter combinations per dataset`);
    console.log(`📊 Total of ${totalCombinations.toLocaleString()} tests to run`);
    
    let globalCurrentTest = 0;
    
    for (let datasetIndex = 0; datasetIndex < this.datasets.length; datasetIndex++) {
      const dataset = this.datasets[datasetIndex];
      const candles = dataset.candles;
      const timeframe = dataset.timeframe || detectTimeframe(candles);
      const datasetName = dataset.name || `Dataset ${datasetIndex + 1}`;
      
      console.log(`\n🔍 Optimizing dataset: ${datasetName} (${timeframe})`);
      console.log(`📈 Contains ${candles.length.toLocaleString()} candles`);
      
      // Detect if we're working with seconds data
      const isSecondsData = timeframe.includes('s');
      
      // For large datasets, we'll use a more efficient approach
      const isLargeDataset = candles.length > 50000;
      if (isLargeDataset) {
        console.log(`⚠️ Large dataset detected (${candles.length.toLocaleString()} candles). Using optimized processing.`);
      }
      
      let datasetCurrentTest = 0;
      const datasetResults: MultiTimeframeOptimizationResult[] = [];
      
      // Create all test configurations first
      const allTests = [];
      for (const period of smaRange) {
        for (const stdDev of stdDevValues) {
          for (const offset of offsetValues) {
            for (const leverage of leverageValues) {
              allTests.push({ period, stdDev, offset, leverage });
            }
          }
        }
      }
      
      console.log(`📊 Created ${allTests.length.toLocaleString()} test configurations for ${datasetName}`);
      
      // Process in batches to prevent UI freezing
      const batchSize = isLargeDataset ? 10 : 50;
      let batch = 0;
      
      while (batch * batchSize < allTests.length) {
        const startIdx = batch * batchSize;
        const endIdx = Math.min((batch + 1) * batchSize, allTests.length);
        const batchTests = allTests.slice(startIdx, endIdx);
        
        console.log(`📊 Processing batch ${batch + 1}/${Math.ceil(allTests.length / batchSize)} for ${datasetName} (tests ${startIdx + 1}-${endIdx})`);
        
        for (const test of batchTests) {
          const { period, stdDev, offset, leverage } = test;
          datasetCurrentTest++;
          globalCurrentTest++;
          
          // Create config for this test
          const config: TradingConfig = {
            period,
            stdDev,
            offset,
            maxLeverage: leverage,
            initialCapital: this.baseConfig.initialCapital,
            enableLongPositions: this.baseConfig.enableLongPositions,
            enableShortPositions: this.baseConfig.enableShortPositions,
            timeframe: timeframe,
            asset: datasetName
          };

          const currentConfigStr = `SMA ${period}, StdDev ${stdDev}, Offset ${offset}, Leverage ${leverage}x`;
          
          // Calculate estimated time remaining
          const elapsed = Date.now() - this.startTime;
          const avgTimePerTest = elapsed / globalCurrentTest;
          const remaining = (totalCombinations - globalCurrentTest) * avgTimePerTest;
          const estimatedTimeRemaining = this.formatTimeRemaining(remaining);
          
          try {
            // Run backtest with this configuration
            const bands = calculateBollingerBands(candles, period, stdDev, offset);
            const backtester = new Backtester(config);
            const backtestResult = backtester.backtest(candles, bands);

            // Calculate total return
            const totalReturn = config.initialCapital > 0 ? backtestResult.totalPnL / config.initialCapital : 0;
            
            // Apply filters before adding to results
            if (this.passesFilters(backtestResult, totalReturn, filters)) {
              // Calculate optimization score
              const score = this.calculateOptimizationScore(backtestResult, totalReturn, leverage, timeframe);

              const optimizationResult: MultiTimeframeOptimizationResult = {
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
                averageTradesPerDay: backtestResult.averageTradesPerDay,
                timeframe,
                datasetName
              };

              datasetResults.push(optimizationResult);
              allResults.push(optimizationResult);
              
              // Sort results by score
              datasetResults.sort((a, b) => b.score - a.score);
              allResults.sort((a, b) => b.score - a.score);
              
              // Limit results array size to prevent memory issues
              if (datasetResults.length > 500) {
                datasetResults.splice(500);
              }
              if (allResults.length > 1000) {
                allResults.splice(1000);
              }
            }

            // Update progress
            if (this.onProgress) {
              const bestResult = datasetResults.length > 0 ? datasetResults[0] : undefined;
              const globalBestResult = allResults.length > 0 ? allResults[0] : undefined;
              
              this.onProgress({
                current: datasetCurrentTest,
                total: paramCombinations,
                currentConfig: currentConfigStr,
                isRunning: true,
                results: allResults,
                bestResult: globalBestResult,
                estimatedTimeRemaining,
                currentDataset: datasetName,
                currentTimeframe: timeframe,
                totalDatasets: this.datasets.length,
                currentDatasetIndex: datasetIndex
              });
            }

            // Log progress periodically
            if (datasetCurrentTest % 500 === 0) {
              console.log(`✅ Dataset ${datasetIndex + 1}/${this.datasets.length}: ${datasetCurrentTest.toLocaleString()}/${paramCombinations.toLocaleString()} tests (${((datasetCurrentTest/paramCombinations)*100).toFixed(1)}%)`);
              console.log(`📊 Global progress: ${globalCurrentTest.toLocaleString()}/${totalCombinations.toLocaleString()} (${((globalCurrentTest/totalCombinations)*100).toFixed(1)}%)`);
              console.log(`⏱️ ETA: ${estimatedTimeRemaining}`);
              
              if (datasetResults.length > 0) {
                const best = datasetResults[0];
                console.log(`🏆 Best for ${datasetName} (${timeframe}): ${(best.totalReturn * 100).toFixed(1)}% return, ${(best.winRate * 100).toFixed(1)}% win rate`);
              }
            }
          } catch (error) {
            console.warn(`Failed to test configuration: ${currentConfigStr} on ${datasetName}`, error);
          }
        }
        
        // Yield to UI thread between batches
        await new Promise(resolve => setTimeout(resolve, 10));
        batch++;
      }
      
      // Log dataset results
      console.log(`\n✅ Completed dataset: ${datasetName} (${timeframe})`);
      console.log(`📊 Found ${datasetResults.length} valid configurations`);
      
      if (datasetResults.length > 0) {
        const best = datasetResults[0];
        console.log(`🥇 Best configuration: ${(best.totalReturn * 100).toFixed(2)}% return`);
        console.log(`   Parameters: SMA ${best.period}, StdDev ${best.stdDev}, Offset ${best.offset}, Leverage ${best.leverage}x`);
        console.log(`   Win Rate: ${(best.winRate * 100).toFixed(1)}%, Trades: ${best.totalTrades}, Max Drawdown: ${(best.maxDrawdown * 100).toFixed(1)}%`);
      }
    }

    // Final sort by score (best first)
    allResults.sort((a, b) => b.score - a.score);

    const totalTime = Date.now() - this.startTime;
    console.log(`\n🎉 Multi-timeframe optimization complete! Tested ${totalCombinations.toLocaleString()} combinations in ${this.formatTimeRemaining(totalTime)}`);
    console.log(`📊 Final results: ${allResults.length.toLocaleString()} strategies passed filters`);
    
    if (allResults.length > 0) {
      const best = allResults[0];
      console.log(`🥇 Best overall configuration: ${(best.totalReturn * 100).toFixed(2)}% return on ${best.datasetName} (${best.timeframe})`);
      console.log(`   Parameters: SMA ${best.period}, StdDev ${best.stdDev}, Offset ${best.offset}, Leverage ${best.leverage}x`);
      console.log(`   Win Rate: ${(best.winRate * 100).toFixed(1)}%, Trades: ${best.totalTrades}, Max Drawdown: ${(best.maxDrawdown * 100).toFixed(1)}%`);
    }

    if (this.onProgress) {
      const finalBest = allResults.length > 0 ? allResults[0] : undefined;
      
      this.onProgress({
        current: totalCombinations,
        total: totalCombinations,
        currentConfig: 'Optimization Complete',
        isRunning: false,
        results: allResults,
        bestResult: finalBest,
        estimatedTimeRemaining: '0 seconds',
        currentDataset: 'Complete',
        currentTimeframe: 'All',
        totalDatasets: this.datasets.length,
        currentDatasetIndex: this.datasets.length
      });
    }

    return allResults;
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

  private calculateOptimizationScore(result: any, totalReturn: number, leverage: number, timeframe: string): number {
    // Adjust weights based on timeframe
    let returnWeight = 0.35;
    let winRateWeight = 0.15;
    let sharpeWeight = 0.20;
    let drawdownWeight = 0.15;
    let tradesWeight = 0.10;
    let leverageRiskWeight = 0.05;
    
    // For shorter timeframes, we value win rate and trade frequency more
    if (timeframe.includes('s') || timeframe.includes('1m')) {
      winRateWeight = 0.20;
      tradesWeight = 0.15;
      returnWeight = 0.30;
    }
    
    // For longer timeframes, we value return and sharpe ratio more
    if (timeframe.includes('1h') || timeframe.includes('4h') || timeframe.includes('1d')) {
      returnWeight = 0.40;
      sharpeWeight = 0.25;
      tradesWeight = 0.05;
    }

    // Normalize metrics (0-100 scale)
    const returnScore = Math.max(0, Math.min(100, (totalReturn + 1) * 50)); // -100% to +100% return maps to 0-100
    const winRateScore = result.winRate * 100;
    const sharpeScore = Math.max(0, Math.min(100, (result.sharpeRatio + 2) * 25)); // -2 to +2 Sharpe maps to 0-100
    const drawdownScore = Math.max(0, 100 - (result.maxDrawdown * 100)); // Lower drawdown = higher score
    
    // Adjust trade score based on timeframe
    let tradesScore;
    if (timeframe.includes('s')) {
      tradesScore = Math.min(100, result.totalTrades * 0.1); // Seconds: expect many trades
    } else if (timeframe.includes('m')) {
      tradesScore = Math.min(100, result.totalTrades * 0.5); // Minutes: expect moderate trades
    } else {
      tradesScore = Math.min(100, result.totalTrades * 2); // Hours/days: expect fewer trades
    }
    
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
}