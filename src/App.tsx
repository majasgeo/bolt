import React, { useState, useEffect } from 'react';
import { TradingConfig, BacktestResult, Candle, BollingerBands, OptimizationProgress, OptimizationResult, OptimizationFilters } from './types/trading';
import { DayTradingConfig, DayTradingBot } from './utils/dayTradingStrategy';
import { DayTradingOptimizationResult } from './utils/dayTradingOptimizer';
import { FibonacciScalpingConfig, FibonacciScalpingBot } from './utils/fibonacciScalpingStrategy';
import { FibonacciOptimizationResult } from './utils/fibonacciOptimizer';
import { UltraFastScalpingConfig, UltraFastScalpingBot, createUltraFastConfig } from './utils/ultraFastScalpingStrategy';
import { UltraFastOptimizationResult } from './utils/ultraFastOptimizer';
import { EnhancedBollingerConfig, EnhancedBollingerBot, createEnhancedConfig } from './utils/enhancedBollingerStrategy';
import { BollingerFibonacciConfig, BollingerFibonacciHybridBot, createBollingerFibonacciConfig } from './utils/bollingerFibonacciHybridStrategy';
import { HybridOptimizationResult } from './utils/hybridOptimizer';
import { calculateBollingerBands } from './utils/bollingerBands';
import { Backtester } from './utils/backtester';
import { StrategyOptimizer } from './utils/optimizer';
import { ConfigPanel } from './components/ConfigPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { Chart } from './components/Chart';
import { DataSourcePanel } from './components/DataSourcePanel';
import { OptimizationPanel } from './components/OptimizationPanel';
import { OptimizationResults } from './components/OptimizationResults';
import { DayTradingPanel } from './components/DayTradingPanel';
import { DayTradingOptimizationPanel } from './components/DayTradingOptimizationPanel';
import { DayTradingResults } from './components/DayTradingResults';
import { FibonacciScalpingPanel } from './components/FibonacciScalpingPanel';
import { FibonacciOptimizationPanel } from './components/FibonacciOptimizationPanel';
import { FibonacciResults } from './components/FibonacciResults';
import { UltraFastScalpingPanel } from './components/UltraFastScalpingPanel';
import { UltraFastOptimizationPanel } from './components/UltraFastOptimizationPanel';
import { UltraFastResults } from './components/UltraFastResults';
import { EnhancedBollingerPanel } from './components/EnhancedBollingerPanel';
import { BollingerFibonacciHybridPanel } from './components/BollingerFibonacciHybridPanel';
import { HybridOptimizationPanel } from './components/HybridOptimizationPanel';
import { HybridResults } from './components/HybridResults';
import { Bot, TrendingUp, Zap, BarChart3, Upload, Activity, Settings, Layers } from 'lucide-react';

function App() {
  // SINGLE SOURCE OF TRUTH - One config object per strategy
  const [bollingerConfig, setBollingerConfig] = useState<TradingConfig>({
    period: 20,
    stdDev: 2,
    offset: 10,
    maxLeverage: 10,
    initialCapital: 10000,
    enableLongPositions: true,
    enableShortPositions: true
  });

  const [dayTradingConfig, setDayTradingConfig] = useState<DayTradingConfig>({
    // Bollinger Bands settings (optimized for day trading)
    period: 14,
    stdDev: 2,
    offset: 5,
    
    // RSI settings
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    
    // MACD settings
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    
    // Volume and risk management
    volumeThreshold: 1.2,
    profitTarget: 0.015,
    stopLossPercent: 0.008,
    maxHoldingPeriod: 6,
    
    // Trading settings
    maxLeverage: 5,
    initialCapital: 10000,
    enableLongPositions: true,
    enableShortPositions: true
  });

  const [fibonacciConfig, setFibonacciConfig] = useState<FibonacciScalpingConfig>({
    // Base trading config
    period: 20,
    stdDev: 2,
    offset: 0,
    maxLeverage: 10,
    initialCapital: 10000,
    enableLongPositions: true,
    enableShortPositions: true,
    
    // Fibonacci specific settings
    swingLookback: 5,
    fibRetracementLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
    goldenZoneMin: 0.5,
    goldenZoneMax: 0.618,
    
    // Structure break settings
    structureBreakConfirmation: 2,
    minSwingSize: 0.01,
    
    // Risk management
    profitTarget: 0.015,
    stopLossPercent: 0.008,
    riskRewardRatio: 1.875,
    maxHoldingMinutes: 15,
    
    // Entry confirmation
    requireVolumeConfirmation: true,
    volumeThreshold: 1.5,
    requireCandleColorConfirmation: true
  });

  const [ultraFastConfig, setUltraFastConfig] = useState<UltraFastScalpingConfig>(() => 
    createUltraFastConfig(bollingerConfig)
  );

  const [enhancedConfig, setEnhancedConfig] = useState<EnhancedBollingerConfig>(() => 
    createEnhancedConfig(bollingerConfig)
  );

  const [hybridConfig, setHybridConfig] = useState<BollingerFibonacciConfig>(() => 
    createBollingerFibonacciConfig(bollingerConfig)
  );

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
  const [dayTradingOptimizationProgress, setDayTradingOptimizationProgress] = useState<OptimizationProgress | null>(null);
  const [fibonacciOptimizationProgress, setFibonacciOptimizationProgress] = useState<OptimizationProgress | null>(null);
  const [ultraFastOptimizationProgress, setUltraFastOptimizationProgress] = useState<OptimizationProgress | null>(null);
  const [hybridOptimizationProgress, setHybridOptimizationProgress] = useState<OptimizationProgress | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [dayTradingOptimizationResults, setDayTradingOptimizationResults] = useState<DayTradingOptimizationResult[]>([]);
  const [fibonacciOptimizationResults, setFibonacciOptimizationResults] = useState<FibonacciOptimizationResult[]>([]);
  const [ultraFastOptimizationResults, setUltraFastOptimizationResults] = useState<UltraFastOptimizationResult[]>([]);
  const [hybridOptimizationResults, setHybridOptimizationResults] = useState<HybridOptimizationResult[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<'bollinger' | 'daytrading' | 'fibonacci' | 'ultrafast' | 'enhanced' | 'hybrid'>('bollinger');

  // Calculate bands when candles or config changes
  useEffect(() => {
    if (candles.length > 0) {
      let currentConfig;
      if (activeStrategy === 'daytrading') {
        currentConfig = dayTradingConfig;
      } else if (activeStrategy === 'fibonacci') {
        currentConfig = fibonacciConfig;
      } else if (activeStrategy === 'ultrafast') {
        currentConfig = ultraFastConfig;
      } else if (activeStrategy === 'enhanced') {
        currentConfig = enhancedConfig;
      } else if (activeStrategy === 'hybrid') {
        currentConfig = hybridConfig;
      } else {
        currentConfig = bollingerConfig;
      }
      
      const calculatedBands = calculateBollingerBands(candles, currentConfig.period, currentConfig.stdDev, currentConfig.offset);
      setBands(calculatedBands);
    }
  }, [candles, bollingerConfig, dayTradingConfig, fibonacciConfig, ultraFastConfig, enhancedConfig, hybridConfig, activeStrategy]);

  const handleDataLoaded = (newCandles: Candle[], source: string) => {
    setCandles(newCandles);
    setDataSource(source);
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
    setDayTradingOptimizationResults([]);
    setFibonacciOptimizationResults([]);
    setUltraFastOptimizationResults([]);
    setHybridOptimizationResults([]);
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

  const runDayTradingBacktest = async (config: DayTradingConfig) => {
    if (candles.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsRunning(true);
    setDayTradingConfig(config);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const dayTradingBot = new DayTradingBot(config);
      const dayTradingBands = calculateBollingerBands(candles, config.period, config.stdDev, config.offset);
      const backtestResults = dayTradingBot.backtest(candles, dayTradingBands);
      setResults(backtestResults);
    } catch (error) {
      console.error('Day trading backtest failed:', error);
      alert('Day trading backtest failed. Please check the console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const runFibonacciBacktest = async (config: FibonacciScalpingConfig) => {
    if (candles.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsRunning(true);
    setFibonacciConfig(config);
    
    try {
      console.log("Starting Fibonacci backtest with config:", config);
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      const fibonacciBot = new FibonacciScalpingBot(config);
      const fibonacciBands = calculateBollingerBands(candles, 20, 2, 0);
      const backtestResults = fibonacciBot.backtest(candles, fibonacciBands);
      console.log("Fibonacci backtest results:", backtestResults);
      setResults(backtestResults);
    } catch (error) {
      console.error('Fibonacci backtest failed:', error);
      alert('Fibonacci backtest failed. Please check the console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const runUltraFastBacktest = async (config: UltraFastScalpingConfig) => {
    if (candles.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsRunning(true);
    setUltraFastConfig(config);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const ultraFastBot = new UltraFastScalpingBot(config);
      const ultraFastBands = calculateBollingerBands(candles, 11, 2, 0);
      const backtestResults = ultraFastBot.backtest(candles, ultraFastBands);
      setResults(backtestResults);
    } catch (error) {
      console.error('Ultra-fast backtest failed:', error);
      alert('Ultra-fast backtest failed. Please check the console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const runEnhancedBacktest = async (config: EnhancedBollingerConfig) => {
    if (candles.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsRunning(true);
    setEnhancedConfig(config);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2200));
      
      const enhancedBot = new EnhancedBollingerBot(config);
      const enhancedBands = calculateBollingerBands(candles, config.period, config.stdDev, config.offset);
      const backtestResults = enhancedBot.backtest(candles, enhancedBands);
      setResults(backtestResults);
    } catch (error) {
      console.error('Enhanced backtest failed:', error);
      alert('Enhanced backtest failed. Please check the console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const runHybridBacktest = async (config: BollingerFibonacciConfig) => {
    if (candles.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsRunning(true);
    setHybridConfig(config);
    
    try {
      console.log("Starting hybrid backtest with config:", config);
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // Make sure we have the required fields
      const updatedConfig = {
        ...config,
        confirmationCandles: config.confirmationCandles || 1,
        fibRetracementLevels: config.fibRetracementLevels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
      };
      
      const hybridBot = new BollingerFibonacciHybridBot(updatedConfig);
      const hybridBands = calculateBollingerBands(candles, config.period, config.stdDev, config.offset);
      const backtestResults = hybridBot.backtest(candles, hybridBands);
      console.log("Hybrid backtest results:", backtestResults);
      setResults(backtestResults);
    } catch (error) {
      console.error('Hybrid backtest failed:', error);
      alert('Hybrid backtest failed. Please check the console for details.');
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

  const handleDayTradingOptimizationComplete = (bestConfig: DayTradingConfig, results: DayTradingOptimizationResult[]) => {
    setDayTradingConfig(bestConfig);
    setDayTradingOptimizationResults(results);
    
    setTimeout(() => {
      runDayTradingBacktest(bestConfig);
    }, 500);
  };

  const handleFibonacciOptimizationComplete = (bestConfig: FibonacciScalpingConfig, results: FibonacciOptimizationResult[]) => {
    setFibonacciConfig(bestConfig);
    setFibonacciOptimizationResults(results);
    
    setTimeout(() => {
      runFibonacciBacktest(bestConfig);
    }, 500);
  };

  const handleUltraFastOptimizationComplete = (bestConfig: UltraFastScalpingConfig, results: UltraFastOptimizationResult[]) => {
    setUltraFastConfig(bestConfig);
    setUltraFastOptimizationResults(results);
    
    setTimeout(() => {
      runUltraFastBacktest(bestConfig);
    }, 500);
  };

  const handleHybridOptimizationComplete = (bestConfig: BollingerFibonacciConfig, results: HybridOptimizationResult[]) => {
    setHybridConfig(bestConfig);
    setHybridOptimizationResults(results);
    
    setTimeout(() => {
      runHybridBacktest(bestConfig);
    }, 500);
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

  const handleSelectDayTradingResult = (result: DayTradingOptimizationResult) => {
    const newConfig: DayTradingConfig = {
      ...dayTradingConfig,
      period: result.period,
      stdDev: result.stdDev,
      offset: result.offset,
      rsiPeriod: result.rsiPeriod,
      rsiOverbought: result.rsiOverbought,
      rsiOversold: result.rsiOversold,
      macdFast: result.macdFast,
      macdSlow: result.macdSlow,
      macdSignal: result.macdSignal,
      volumeThreshold: result.volumeThreshold,
      profitTarget: result.profitTarget,
      stopLossPercent: result.stopLossPercent,
      maxHoldingPeriod: result.maxHoldingPeriod,
      maxLeverage: result.leverage
    };
    setDayTradingConfig(newConfig);
    
    setTimeout(() => {
      runDayTradingBacktest(newConfig);
    }, 500);
  };

  const handleSelectFibonacciResult = (result: FibonacciOptimizationResult) => {
    const newConfig: FibonacciScalpingConfig = {
      ...fibonacciConfig,
      swingLookback: result.swingLookback,
      goldenZoneMin: result.goldenZoneMin,
      goldenZoneMax: result.goldenZoneMax,
      structureBreakConfirmation: result.structureBreakConfirmation,
      minSwingSize: result.minSwingSize,
      profitTarget: result.profitTarget,
      stopLossPercent: result.stopLossPercent,
      riskRewardRatio: result.riskRewardRatio,
      maxHoldingMinutes: result.maxHoldingMinutes,
      maxLeverage: result.leverage,
      volumeThreshold: result.volumeThreshold,
      requireVolumeConfirmation: result.requireVolumeConfirmation,
      requireCandleColorConfirmation: result.requireCandleColorConfirmation
    };
    setFibonacciConfig(newConfig);
    
    setTimeout(() => {
      runFibonacciBacktest(newConfig);
    }, 500);
  };

  const handleSelectUltraFastResult = (result: UltraFastOptimizationResult) => {
    const newConfig: UltraFastScalpingConfig = {
      ...ultraFastConfig,
      maxHoldingSeconds: result.maxHoldingSeconds,
      quickProfitTarget: result.quickProfitTarget,
      tightStopLoss: result.tightStopLoss,
      scalpTargetTicks: result.scalpTargetTicks,
      scalpStopTicks: result.scalpStopTicks,
      velocityThreshold: result.velocityThreshold,
      minPriceMovement: result.minPriceMovement,
      maxSlippage: result.maxSlippage,
      subMinutePeriods: result.subMinutePeriods,
      maxLeverage: result.leverage,
      enableInstantEntry: result.enableInstantEntry,
      enableInstantExit: result.enableInstantExit,
      enableMicroProfits: result.enableMicroProfits,
      enableScalpMode: result.enableScalpMode,
      enableVelocityFilter: result.enableVelocityFilter,
      enableTickConfirmation: result.enableTickConfirmation,
      enableSubMinuteAnalysis: result.enableSubMinuteAnalysis
    };
    setUltraFastConfig(newConfig);
    
    setTimeout(() => {
      runUltraFastBacktest(newConfig);
    }, 500);
  };

  const handleSelectHybridResult = (result: HybridOptimizationResult) => {
    const newConfig: BollingerFibonacciConfig = {
      ...hybridConfig,
      period: result.period,
      stdDev: result.stdDev,
      offset: result.offset,
      swingLookback: result.swingLookback,
      goldenZoneMin: result.goldenZoneMin,
      goldenZoneMax: result.goldenZoneMax,
      profitTarget: result.profitTarget,
      stopLossPercent: result.stopLossPercent,
      maxHoldingMinutes: result.maxHoldingMinutes,
      maxLeverage: result.leverage,
      volumeThreshold: result.volumeThreshold,
      requireBollingerBreakout: result.requireBollingerBreakout,
      requireFibonacciRetracement: result.requireFibonacciRetracement,
      requireVolumeConfirmation: result.requireVolumeConfirmation,
      requireMomentumConfirmation: result.requireMomentumConfirmation
    };
    setHybridConfig(newConfig);
    
    setTimeout(() => {
      runHybridBacktest(newConfig);
    }, 500);
  };

  const getStrategyDescription = () => {
    if (activeStrategy === 'fibonacci') {
      return "Fibonacci scalping bot targeting golden zone reversals";
    } else if (activeStrategy === 'daytrading') {
      return "Multi-signal day trading bot targeting 50% win rate";
    } else if (activeStrategy === 'ultrafast') {
      return "Ultra-fast 1-minute scalping bot for micro profits";
    } else if (activeStrategy === 'enhanced') {
      return "Enhanced Bollinger Bands with advanced features";
    } else if (activeStrategy === 'hybrid') {
      return "Bollinger + Fibonacci hybrid for precision 1-minute scalping";
    }
    
    if (bollingerConfig.enableLongPositions && bollingerConfig.enableShortPositions) {
      return "Long/Short strategy with Bollinger Bands breakouts";
    } else if (bollingerConfig.enableLongPositions) {
      return "Long-only strategy with upper band breakouts";
    } else if (bollingerConfig.enableShortPositions) {
      return "Short-only strategy with lower band breakdowns";
    }
    return "No trading strategy enabled";
  };

  const getCurrentCapital = () => {
    if (activeStrategy === 'fibonacci') return fibonacciConfig.initialCapital;
    if (activeStrategy === 'daytrading') return dayTradingConfig.initialCapital;
    if (activeStrategy === 'ultrafast') return ultraFastConfig.initialCapital;
    if (activeStrategy === 'enhanced') return enhancedConfig.initialCapital;
    if (activeStrategy === 'hybrid') return hybridConfig.initialCapital;
    return bollingerConfig.initialCapital;
  };

  const getCurrentProgress = () => {
    if (activeStrategy === 'fibonacci') return fibonacciOptimizationProgress;
    if (activeStrategy === 'daytrading') return dayTradingOptimizationProgress;
    if (activeStrategy === 'ultrafast') return ultraFastOptimizationProgress;
    if (activeStrategy === 'hybrid') return hybridOptimizationProgress;
    return optimizationProgress;
  };

  const getCurrentConfig = () => {
    if (activeStrategy === 'fibonacci') return fibonacciConfig;
    if (activeStrategy === 'daytrading') return dayTradingConfig;
    if (activeStrategy === 'ultrafast') return ultraFastConfig;
    if (activeStrategy === 'enhanced') return enhancedConfig;
    if (activeStrategy === 'hybrid') return hybridConfig;
    return bollingerConfig;
  };

  const currentConfig = getCurrentConfig();

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
                  <h1 className="text-2xl font-bold text-gray-900">Advanced Trading Bot Suite</h1>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Advanced Trading Bot Suite</h2>
            <p className="text-xl text-gray-600 mb-8">
              Upload your CSV trading data to start backtesting with our six powerful strategies
            </p>
          </div>

          {/* Strategy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Bollinger Bands</h3>
              <p className="text-gray-600">Classic breakout strategy with customizable parameters and leverage</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Zap className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Day Trading Bot</h3>
              <p className="text-gray-600">Multi-signal strategy combining BB, RSI, MACD for 50%+ win rate</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Fibonacci Scalping</h3>
              <p className="text-gray-600">Pure price action scalping targeting golden zone reversals</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Activity className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ultra-Fast Scalping</h3>
              <p className="text-gray-600">Lightning-fast 1-minute scalping for micro profits</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Settings className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enhanced Bollinger</h3>
              <p className="text-gray-600">Advanced Bollinger Bands with multiple enhancements</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <Layers className="h-12 w-12 text-teal-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Bollinger + Fibonacci</h3>
              <p className="text-gray-600">Hybrid strategy combining momentum detection with precision entry</p>
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
                    <p className="text-gray-600">Works with 1-minute to daily data</p>
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
                    <h4 className="font-semibold text-gray-900">CSV Import</h4>
                    <p className="text-gray-600">Easy data import with automatic format detection</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Advanced Trading Bot Suite</h1>
                <p className="text-sm text-gray-600">{getStrategyDescription()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Strategy Selector */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveStrategy('bollinger')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeStrategy === 'bollinger'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 inline mr-1" />
                  Bollinger
                </button>
                <button
                  onClick={() => setActiveStrategy('daytrading')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeStrategy === 'daytrading'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Zap className="h-4 w-4 inline mr-1" />
                  Day Trading
                </button>
                <button
                  onClick={() => setActiveStrategy('fibonacci')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeStrategy === 'fibonacci'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 inline mr-1" />
                  Fibonacci
                </button>
                <button
                  onClick={() => setActiveStrategy('ultrafast')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeStrategy === 'ultrafast'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Activity className="h-4 w-4 inline mr-1" />
                  Ultra-Fast
                </button>
                <button
                  onClick={() => setActiveStrategy('enhanced')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeStrategy === 'enhanced'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Settings className="h-4 w-4 inline mr-1" />
                  Enhanced
                </button>
                <button
                  onClick={() => setActiveStrategy('hybrid')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeStrategy === 'hybrid'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Layers className="h-4 w-4 inline mr-1" />
                  Hybrid
                </button>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {activeStrategy === 'fibonacci' 
                    ? `Fibonacci Scalping | ${fibonacciConfig.maxLeverage}x Leverage`
                    : activeStrategy === 'daytrading' 
                    ? `Multi-Signal Day Trading | ${dayTradingConfig.maxLeverage}x Leverage`
                    : activeStrategy === 'ultrafast'
                    ? `Ultra-Fast Scalping | ${ultraFastConfig.maxLeverage}x Leverage`
                    : activeStrategy === 'enhanced'
                    ? `Enhanced Bollinger | ${enhancedConfig.maxLeverage}x Leverage`
                    : activeStrategy === 'hybrid'
                    ? `Bollinger + Fibonacci | ${hybridConfig.maxLeverage}x Leverage`
                    : `SMA ${bollingerConfig.period} | StdDev ${bollingerConfig.stdDev} | Offset ${bollingerConfig.offset} | ${bollingerConfig.maxLeverage}x Leverage`
                  }
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {currentConfig.enableLongPositions && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">LONG</span>
                )}
                {currentConfig.enableShortPositions && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">SHORT</span>
                )}
              </div>
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
            {activeStrategy === 'bollinger' ? (
              <ConfigPanel
                config={bollingerConfig}
                onConfigChange={setBollingerConfig}
                onRunBacktest={runBacktest}
                isRunning={isRunning}
              />
            ) : activeStrategy === 'daytrading' ? (
              <DayTradingPanel
                config={dayTradingConfig}
                onConfigChange={setDayTradingConfig}
                onRunDayTrading={runDayTradingBacktest}
                isRunning={isRunning}
              />
            ) : activeStrategy === 'fibonacci' ? (
              <FibonacciScalpingPanel
                config={fibonacciConfig}
                onConfigChange={setFibonacciConfig}
                onRunFibonacci={runFibonacciBacktest}
                isRunning={isRunning}
              />
            ) : activeStrategy === 'ultrafast' ? (
              <UltraFastScalpingPanel
                basicConfig={bollingerConfig}
                candles={candles}
                onRunUltraFastBacktest={runUltraFastBacktest}
                isRunning={isRunning}
              />
            ) : activeStrategy === 'enhanced' ? (
              <EnhancedBollingerPanel
                basicConfig={bollingerConfig}
                candles={candles}
                onRunEnhancedBacktest={runEnhancedBacktest}
                isRunning={isRunning}
              />
            ) : (
              <BollingerFibonacciHybridPanel
                config={hybridConfig}
                onConfigChange={setHybridConfig}
                onRunHybrid={runHybridBacktest}
                isRunning={isRunning}
              />
            )}
          </div>

          {/* Optimization Panel */}
          <div className="lg:col-span-1">
            {activeStrategy === 'bollinger' ? (
              <OptimizationPanel
                config={bollingerConfig}
                onOptimizationComplete={handleOptimizationComplete}
                onStartOptimization={handleStartOptimization}
                progress={optimizationProgress}
              />
            ) : activeStrategy === 'daytrading' ? (
              <DayTradingOptimizationPanel
                candles={candles}
                config={dayTradingConfig}
                onOptimizationComplete={handleDayTradingOptimizationComplete}
                progress={dayTradingOptimizationProgress}
                onProgressUpdate={setDayTradingOptimizationProgress}
              />
            ) : activeStrategy === 'fibonacci' ? (
              <FibonacciOptimizationPanel
                candles={candles}
                config={fibonacciConfig}
                onOptimizationComplete={handleFibonacciOptimizationComplete}
                progress={fibonacciOptimizationProgress}
                onProgressUpdate={setFibonacciOptimizationProgress}
              />
            ) : activeStrategy === 'ultrafast' ? (
              <UltraFastOptimizationPanel
                candles={candles}
                config={ultraFastConfig}
                onOptimizationComplete={handleUltraFastOptimizationComplete}
                progress={ultraFastOptimizationProgress}
                onProgressUpdate={setUltraFastOptimizationProgress}
              />
            ) : activeStrategy === 'hybrid' ? (
              <HybridOptimizationPanel
                candles={candles}
                config={hybridConfig}
                onOptimizationComplete={handleHybridOptimizationComplete}
                progress={hybridOptimizationProgress}
                onProgressUpdate={setHybridOptimizationProgress}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Enhanced Bollinger Optimization</h3>
                <p className="text-gray-600">Optimization for Enhanced Bollinger strategy coming soon...</p>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-1">
            <MetricsPanel 
              results={results} 
              isRunning={isRunning} 
              initialCapital={getCurrentCapital()}
            />
          </div>
        </div>

        {/* Optimization Results */}
        {activeStrategy === 'bollinger' && optimizationResults.length > 0 && (
          <div className="mt-8">
            <OptimizationResults
              results={optimizationResults}
              onSelectConfiguration={handleSelectOptimizationResult}
            />
          </div>
        )}

        {activeStrategy === 'daytrading' && dayTradingOptimizationResults.length > 0 && (
          <div className="mt-8">
            <DayTradingResults
              results={dayTradingOptimizationResults}
              onSelectConfiguration={handleSelectDayTradingResult}
            />
          </div>
        )}

        {activeStrategy === 'fibonacci' && fibonacciOptimizationResults.length > 0 && (
          <div className="mt-8">
            <FibonacciResults
              results={fibonacciOptimizationResults}
              onSelectConfiguration={handleSelectFibonacciResult}
            />
          </div>
        )}

        {activeStrategy === 'ultrafast' && ultraFastOptimizationResults.length > 0 && (
          <div className="mt-8">
            <UltraFastResults
              results={ultraFastOptimizationResults}
              onSelectConfiguration={handleSelectUltraFastResult}
            />
          </div>
        )}

        {activeStrategy === 'hybrid' && hybridOptimizationResults.length > 0 && (
          <div className="mt-8">
            <HybridResults
              results={hybridOptimizationResults}
              onSelectConfiguration={handleSelectHybridResult}
            />
          </div>
        )}

        {/* Chart */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {activeStrategy === 'fibonacci' 
                ? 'Fibonacci Scalping Signals with Golden Zone Analysis'
                : activeStrategy === 'daytrading' 
                ? 'Day Trading Signals with Multi-Indicator Analysis'
                : activeStrategy === 'ultrafast'
                ? 'Ultra-Fast Scalping Signals with Lightning Speed'
                : activeStrategy === 'enhanced'
                ? 'Enhanced Bollinger Bands with Advanced Features'
                : activeStrategy === 'hybrid'
                ? 'Bollinger + Fibonacci Hybrid Signals with Precision Entry'
                : 'Price Chart with Bollinger Bands'
              }
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