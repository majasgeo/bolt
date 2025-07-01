import React, { useState, useEffect } from 'react';
import { TradingConfig, BacktestResult, Candle, BollingerBands, OptimizationProgress, OptimizationResult, OptimizationFilters, TickData } from './types/trading';
import { calculateBollingerBands } from './utils/bollingerBands';
import { Backtester } from './utils/backtester';
import { StrategyOptimizer } from './utils/optimizer';
import { MultiTimeframeOptimizer, DatasetInfo, MultiTimeframeOptimizationResult, MultiTimeframeOptimizationProgress } from './utils/multiTimeframeOptimizer';
import { ConfigPanel } from './components/ConfigPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { Chart } from './components/Chart';
import { DataSourcePanel } from './components/DataSourcePanel';
import { OptimizationPanel } from './components/OptimizationPanel';
import { OptimizationResults } from './components/OptimizationResults';
import { MultiTimeframeOptimizationPanel } from './components/MultiTimeframeOptimizationPanel';
import { MultiTimeframeResults } from './components/MultiTimeframeResults';
import { Bot, TrendingUp, Upload, Layers, BarChart3 } from 'lucide-react';
import { parseCSVData, detectTimeframe } from './utils/csvParser';

function App() {
  const [bollingerConfig, setBollingerConfig] = useState<TradingConfig>({
    period: 20,
    stdDev: 2,
    offset: 10,
    maxLeverage: 10,
    initialCapital: 10000,
    enableLongPositions: true,
    enableShortPositions: true
  });

  const [candles, setCandles] = useState<Candle[]>([]);
  const [bands, setBands] = useState<BollingerBands[]>([]);
  const [dataSource, setDataSource] = useState<string>('');
  const [results, setResults] = useState<BacktestResult>({
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
  });
  const [isRunning, setIsRunning] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<OptimizationProgress | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [multiTimeframeProgress, setMultiTimeframeProgress] = useState<MultiTimeframeOptimizationProgress | null>(null);
  const [multiTimeframeResults, setMultiTimeframeResults] = useState<MultiTimeframeOptimizationResult[]>([]);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');

  // Calculate bands when candles or config changes
  useEffect(() => {
    if (candles.length > 0) {
      const calculatedBands = calculateBollingerBands(candles, bollingerConfig.period, bollingerConfig.stdDev, bollingerConfig.offset);
      setBands(calculatedBands);
    }
  }, [candles, bollingerConfig]);

  const handleDataLoaded = (newCandles: Candle[], source: string) => {
    setCandles(newCandles);
    setDataSource(source);
    
    // Add to datasets for multi-timeframe optimization
    const timeframe = detectTimeframe(newCandles);
    const datasetName = source.split('(')[0].trim() || 'Dataset';
    
    // Check if this dataset already exists
    const existingIndex = datasets.findIndex(d => d.name === datasetName);
    if (existingIndex >= 0) {
      // Update existing dataset
      const updatedDatasets = [...datasets];
      updatedDatasets[existingIndex] = {
        name: datasetName,
        candles: newCandles,
        timeframe
      };
      setDatasets(updatedDatasets);
    } else {
      // Add new dataset
      setDatasets([...datasets, {
        name: datasetName,
        candles: newCandles,
        timeframe
      }]);
    }
    
    // Reset results when new data is loaded
    setResults({
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
    });
    setOptimizationResults([]);
    setMultiTimeframeResults([]);
  };

  const runBacktest = async () => {
    if (candles.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsRunning(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const manualBands = calculateBollingerBands(candles, bollingerConfig.period, bollingerConfig.stdDev, bollingerConfig.offset);
      const backtester = new Backtester(bollingerConfig);
      const backtestResults = backtester.backtest(candles, manualBands);
      
      setResults(backtestResults);
    } catch (error) {
      console.error('Manual backtest failed:', error);
      alert('Backtest failed. Please check the console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartOptimization = async (filters?: OptimizationFilters): Promise<OptimizationResult[]> => {
    if (candles.length === 0) {
      alert('Please upload CSV data first');
      return [];
    }

    try {
      const optimizer = new StrategyOptimizer(candles, bollingerConfig, setOptimizationProgress);
      const results = await optimizer.optimizeAllCombinations(filters);
      setOptimizationResults(results);
      return results;
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Optimization failed. Please check the console for details.');
      return [];
    }
  };

  const handleStartMultiTimeframeOptimization = async (filters?: OptimizationFilters): Promise<MultiTimeframeOptimizationResult[]> => {
    if (datasets.length === 0) {
      alert('Please upload at least one dataset first');
      return [];
    }

    try {
      const optimizer = new MultiTimeframeOptimizer(datasets, bollingerConfig, setMultiTimeframeProgress);
      const results = await optimizer.optimizeAcrossTimeframes(filters);
      setMultiTimeframeResults(results);
      return results;
    } catch (error) {
      console.error('Multi-timeframe optimization failed:', error);
      alert('Multi-timeframe optimization failed. Please check the console for details.');
      return [];
    }
  };

  const handleOptimizationComplete = (bestConfig: TradingConfig, results: OptimizationResult[]) => {
    setBollingerConfig(bestConfig);
    setOptimizationResults(results);
    
    setTimeout(async () => {
      try {
        const verifyBands = calculateBollingerBands(candles, bestConfig.period, bestConfig.stdDev, bestConfig.offset);
        const verifyBacktester = new Backtester(bestConfig);
        const verifyResult = verifyBacktester.backtest(candles, verifyBands);
        setResults(verifyResult);
      } catch (error) {
        console.error('Immediate verification failed:', error);
      }
    }, 100);
  };

  const handleMultiTimeframeOptimizationComplete = (results: MultiTimeframeOptimizationResult[]) => {
    setMultiTimeframeResults(results);
    
    if (results.length > 0) {
      // Find the best result
      const bestResult = results[0];
      
      // Update config with best parameters
      const bestConfig: TradingConfig = {
        ...bollingerConfig,
        period: bestResult.period,
        stdDev: bestResult.stdDev,
        offset: bestResult.offset,
        maxLeverage: bestResult.leverage
      };
      
      setBollingerConfig(bestConfig);
      
      // Find the dataset that matches the best result
      const matchingDataset = datasets.find(d => d.name === bestResult.datasetName);
      if (matchingDataset) {
        // Run backtest with best config on the matching dataset
        setCandles(matchingDataset.candles);
        setDataSource(`${bestResult.datasetName} (${matchingDataset.candles.length} candles, ${bestResult.timeframe})`);
        
        setTimeout(() => {
          const verifyBands = calculateBollingerBands(matchingDataset.candles, bestConfig.period, bestConfig.stdDev, bestConfig.offset);
          const verifyBacktester = new Backtester(bestConfig);
          const verifyResult = verifyBacktester.backtest(matchingDataset.candles, verifyBands);
          setResults(verifyResult);
        }, 100);
      }
    }
  };

  const handleSelectOptimizationResult = (result: OptimizationResult) => {
    const newConfig: TradingConfig = {
      ...bollingerConfig,
      period: result.period,
      stdDev: result.stdDev,
      offset: result.offset,
      maxLeverage: result.leverage
    };
    
    setBollingerConfig(newConfig);
    
    setTimeout(() => {
      runBacktest();
    }, 500);
  };

  const handleSelectMultiTimeframeResult = (result: MultiTimeframeOptimizationResult) => {
    const newConfig: TradingConfig = {
      ...bollingerConfig,
      period: result.period,
      stdDev: result.stdDev,
      offset: result.offset,
      maxLeverage: result.leverage
    };
    
    setBollingerConfig(newConfig);
    
    // Find the dataset that matches this result
    const matchingDataset = datasets.find(d => d.name === result.datasetName);
    if (matchingDataset) {
      // Switch to this dataset
      setCandles(matchingDataset.candles);
      setDataSource(`${result.datasetName} (${matchingDataset.candles.length} candles, ${result.timeframe})`);
      
      // Run backtest with selected config on the matching dataset
      setTimeout(() => {
        const verifyBands = calculateBollingerBands(matchingDataset.candles, newConfig.period, newConfig.stdDev, newConfig.offset);
        const verifyBacktester = new Backtester(newConfig);
        const verifyResult = verifyBacktester.backtest(matchingDataset.candles, verifyBands);
        setResults(verifyResult);
      }, 500);
    } else {
      // Just run backtest on current data if dataset not found
      setTimeout(() => {
        runBacktest();
      }, 500);
    }
  };

  const getStrategyDescription = () => {
    if (bollingerConfig.enableLongPositions && bollingerConfig.enableShortPositions) {
      return "Long/Short strategy with Bollinger Bands breakouts";
    } else if (bollingerConfig.enableLongPositions) {
      return "Long-only strategy with upper band breakouts";
    } else if (bollingerConfig.enableShortPositions) {
      return "Short-only strategy with lower band breakdowns";
    }
    return "No trading strategy enabled";
  };

  // Show welcome screen if no data is loaded
  if (candles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Universal Bollinger Bands Trading Bot</h1>
                  <p className="text-sm text-gray-600">Upload your CSV data to get started</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <Upload className="h-16 w-16 text-blue-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Universal Bollinger Bands Trading Bot</h2>
            <p className="text-xl text-gray-600 mb-8">
              Upload your CSV trading data to start backtesting with Bollinger Bands strategy
            </p>
          </div>

          {/* Strategy Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 text-center mb-12">
            <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Universal Bollinger Bands Strategy</h3>
            <p className="text-gray-600 mb-4">Classic breakout strategy with customizable parameters and leverage</p>
            
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <h4 className="font-semibold text-blue-900 mb-2">Universal Support</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Any Asset Class:</strong> Crypto, Stocks, Forex, Commodities</li>
                <li>• <strong>Any Timeframe:</strong> Seconds, minutes, hours, days</li>
                <li>• <strong>Any Data Format:</strong> OHLCV candles or tick data</li>
                <li>• <strong>Multi-Timeframe Optimization:</strong> Find the best timeframe for your asset</li>
              </ul>
            </div>
          </div>

          {/* Data Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <DataSourcePanel
              onDataLoaded={handleDataLoaded}
              currentDataSource={dataSource}
              candleCount={candles.length}
            />
          </div>

          {/* Features List */}
          <div className="mt-12 bg-blue-50 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Auto-Optimization</h4>
                    <p className="text-gray-600">Test thousands of parameter combinations automatically</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Multiple Timeframes</h4>
                    <p className="text-gray-600">Works with 1-second to daily data</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Risk Management</h4>
                    <p className="text-gray-600">Built-in stop losses and position sizing</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Detailed Analytics</h4>
                    <p className="text-gray-600">Win rate, drawdown, Sharpe ratio, and more</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Visual Charts</h4>
                    <p className="text-gray-600">See entry/exit points on price charts</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Universal CSV Import</h4>
                    <p className="text-gray-600">Support for any data format with automatic detection</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Universal Bollinger Bands Trading Bot</h1>
                <p className="text-sm text-gray-600">{getStrategyDescription()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4" />
              <span>
                SMA {bollingerConfig.period} | StdDev {bollingerConfig.stdDev} | Offset {bollingerConfig.offset} | {bollingerConfig.maxLeverage}x Leverage
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Data Source Panel */}
          <div className="lg:col-span-1">
            <DataSourcePanel
              onDataLoaded={handleDataLoaded}
              currentDataSource={dataSource}
              candleCount={candles.length}
            />
          </div>

          {/* Strategy Panel */}
          <div className="lg:col-span-1">
            <ConfigPanel
              config={bollingerConfig}
              onConfigChange={setBollingerConfig}
              onRunBacktest={runBacktest}
              isRunning={isRunning}
            />
          </div>

          {/* Optimization Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg mb-4">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === 'single' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 inline mr-1" />
                  Single Timeframe
                </button>
                <button
                  onClick={() => setActiveTab('multi')}
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === 'multi' 
                      ? 'text-purple-600 border-b-2 border-purple-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Layers className="h-4 w-4 inline mr-1" />
                  Multi-Timeframe
                </button>
              </div>
            </div>
            
            {activeTab === 'single' ? (
              <OptimizationPanel
                config={bollingerConfig}
                onOptimizationComplete={handleOptimizationComplete}
                onStartOptimization={handleStartOptimization}
                progress={optimizationProgress}
              />
            ) : (
              <MultiTimeframeOptimizationPanel
                config={bollingerConfig}
                datasets={datasets}
                onOptimizationComplete={handleMultiTimeframeOptimizationComplete}
                onStartOptimization={handleStartMultiTimeframeOptimization}
                progress={multiTimeframeProgress}
              />
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-1">
            <MetricsPanel 
              results={results} 
              isRunning={isRunning} 
              initialCapital={bollingerConfig.initialCapital}
            />
          </div>
        </div>

        {/* Optimization Results */}
        {activeTab === 'single' && optimizationResults.length > 0 && (
          <div className="mt-8">
            <OptimizationResults
              results={optimizationResults}
              onSelectConfiguration={handleSelectOptimizationResult}
            />
          </div>
        )}
        
        {/* Multi-Timeframe Results */}
        {activeTab === 'multi' && multiTimeframeResults.length > 0 && (
          <div className="mt-8">
            <MultiTimeframeResults
              results={multiTimeframeResults}
              onSelectConfiguration={handleSelectMultiTimeframeResult}
            />
          </div>
        )}

        {/* Chart */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Price Chart with Bollinger Bands
            </h3>
            <div className="overflow-x-auto">
              <Chart
                candles={candles}
                bands={bands}
                trades={results.trades}
                width={1000}
                height={400}
              />
            </div>
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span>Price</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
                <span>Bollinger Bands</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span>Long Entry</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                <span>Short Entry</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
                <span>Exit/Stop Loss</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;