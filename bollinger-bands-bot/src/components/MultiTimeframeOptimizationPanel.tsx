import React, { useState } from 'react';
import { TradingConfig, OptimizationFilters } from '../types/trading';
import { MultiTimeframeOptimizationResult, DatasetInfo, MultiTimeframeOptimizationProgress } from '../utils/multiTimeframeOptimizer';
import { Zap, Trophy, Play, Clock, AlertTriangle, Filter, Database, BarChart3 } from 'lucide-react';

interface MultiTimeframeOptimizationPanelProps {
  config: TradingConfig;
  datasets: DatasetInfo[];
  onOptimizationComplete: (results: MultiTimeframeOptimizationResult[]) => void;
  onStartOptimization: (filters?: OptimizationFilters) => Promise<MultiTimeframeOptimizationResult[]>;
  progress: MultiTimeframeOptimizationProgress | null;
}

export function MultiTimeframeOptimizationPanel({ 
  config, 
  datasets,
  onOptimizationComplete, 
  onStartOptimization,
  progress 
}: MultiTimeframeOptimizationPanelProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OptimizationFilters>({
    minimumTradingPeriodDays: 1,
    minimumTrades: 5,
    minimumWinRate: 0.3,
    maximumDrawdown: 0.5,
    minimumReturn: -0.5
  });

  const handleStartOptimization = async () => {
    if (datasets.length === 0) {
      alert('Please upload at least one dataset first');
      return;
    }
    
    setIsOptimizing(true);
    try {
      const results = await onStartOptimization(filters);
      onOptimizationComplete(results);
    } catch (error) {
      console.error('Multi-timeframe optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFilterChange = (field: keyof OptimizationFilters, value: number) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDuration = (days: number) => {
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
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <BarChart3 className="mr-2 h-6 w-6 text-purple-600" />
        Multi-Timeframe Optimization
      </h3>

      <div className="space-y-6">
        {/* Datasets Overview */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Database className="h-5 w-5 mr-2 text-purple-600" />
            Datasets for Optimization
          </h4>
          
          {datasets.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">No datasets available for optimization</p>
              <p className="text-xs text-gray-500 mt-1">Upload CSV files to add datasets</p>
            </div>
          ) : (
            <div className="space-y-2">
              {datasets.map((dataset, index) => (
                <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{dataset.name}</p>
                      <p className="text-xs text-gray-500">
                        {dataset.candles.length.toLocaleString()} candles | {dataset.timeframe}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                      {dataset.timeframe}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2 text-center">
                {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} will be tested with the same parameter ranges
              </p>
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 mr-2 text-blue-600" />
              Optimization Filters
            </h4>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Trading Period
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    value={filters.minimumTradingPeriodDays || 1}
                    onChange={(e) => handleFilterChange('minimumTradingPeriodDays', parseFloat(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0.1"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {formatDuration(filters.minimumTradingPeriodDays || 1)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Trades
                </label>
                <input
                  type="number"
                  value={filters.minimumTrades || 5}
                  onChange={(e) => handleFilterChange('minimumTrades', parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Win Rate
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    value={(filters.minimumWinRate || 0.3) * 100}
                    onChange={(e) => handleFilterChange('minimumWinRate', parseFloat(e.target.value) / 100)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Drawdown
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    value={(filters.maximumDrawdown || 0.5) * 100}
                    onChange={(e) => handleFilterChange('maximumDrawdown', parseFloat(e.target.value) / 100)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Return
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    value={(filters.minimumReturn || -0.5) * 100}
                    onChange={(e) => handleFilterChange('minimumReturn', parseFloat(e.target.value) / 100)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="-100"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optimization Controls */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Multi-Timeframe Optimization</h4>
          <p className="text-sm text-gray-600 mb-3">
            Find the optimal parameters and timeframe for your trading strategy:
          </p>
          <div className="text-xs text-gray-500 space-y-1 mb-4">
            <p>• <strong>Parameter Testing:</strong> SMA periods, StdDev, Offset, Leverage</p>
            <p>• <strong>Timeframe Analysis:</strong> Compare results across different timeframes</p>
            <p>• <strong>Unified Scoring:</strong> Find the best overall configuration</p>
            <p>• <strong>Comprehensive Report:</strong> Detailed breakdown by timeframe</p>
          </div>
          
          <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-800">
                This will test all parameters across {datasets.length} datasets and may take significant time
              </span>
            </div>
          </div>
          
          <button
            onClick={handleStartOptimization}
            disabled={isOptimizing || datasets.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Optimizing Across Timeframes...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start Multi-Timeframe Optimization
              </>
            )}
          </button>
        </div>

        {/* Progress Display */}
        {progress && progress.isRunning && (
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-purple-600 mr-2">Dataset Progress</span>
                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                  {progress.currentDatasetIndex + 1}/{progress.totalDatasets}
                </span>
              </div>
              <span className="text-sm text-purple-600">
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
              </span>
            </div>
            
            <div className="text-xs text-purple-600 mb-2">
              <span className="font-medium">{progress.currentDataset}</span> ({progress.currentTimeframe})
            </div>
            
            <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-purple-600">
              <span className="truncate mr-2">Testing: {progress.currentConfig}</span>
              {progress.estimatedTimeRemaining && (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{progress.estimatedTimeRemaining} remaining</span>
                </div>
              )}
            </div>
            
            <div className="mt-2 text-xs text-purple-600">
              {((progress.current / progress.total) * 100).toFixed(2)}% complete
            </div>
            
            {/* Overall Progress Bar */}
            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-600">Overall Progress</span>
                <span className="text-sm text-purple-600">
                  {Math.round((progress.currentDatasetIndex * progress.total + progress.current) / (progress.totalDatasets * progress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.currentDatasetIndex * progress.total + progress.current) / (progress.totalDatasets * progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Best Result So Far */}
        {progress && progress.bestResult && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
              <h4 className="font-semibold text-gray-900">Best Configuration Found</h4>
            </div>
            
            <div className="bg-white rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900">{(progress.bestResult as MultiTimeframeOptimizationResult).datasetName}</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                  {(progress.bestResult as MultiTimeframeOptimizationResult).timeframe}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">SMA Period:</span>
                  <span className="ml-1 font-medium">{progress.bestResult.period}</span>
                </div>
                <div>
                  <span className="text-gray-500">StdDev:</span>
                  <span className="ml-1 font-medium">{progress.bestResult.stdDev}</span>
                </div>
                <div>
                  <span className="text-gray-500">Offset:</span>
                  <span className="ml-1 font-medium">{progress.bestResult.offset}</span>
                </div>
                <div>
                  <span className="text-gray-500">Leverage:</span>
                  <span className="ml-1 font-medium">{progress.bestResult.leverage}x</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-600">Total Return</p>
                <p className={`font-bold ${progress.bestResult.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(progress.bestResult.totalReturn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Win Rate</p>
                <p className="font-bold text-blue-600">{formatPercentage(progress.bestResult.winRate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Trades</p>
                <p className="font-bold text-gray-900">{progress.bestResult.totalTrades}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Score</p>
                <p className="font-bold text-green-600">{progress.bestResult.score.toFixed(1)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Max Drawdown</p>
                <p className="font-bold text-orange-600">{formatPercentage(progress.bestResult.maxDrawdown)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Sharpe Ratio</p>
                <p className="font-bold text-gray-600">{progress.bestResult.sharpeRatio.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Optimization Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Multi-Timeframe Approach</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Timeframe Comparison:</strong> Find which timeframe works best</p>
            <p>• <strong>Parameter Optimization:</strong> Test the same parameters across all timeframes</p>
            <p>• <strong>Unified Scoring:</strong> Weighted metrics adjusted for each timeframe</p>
            <p>• <strong>Comprehensive Analysis:</strong> Compare performance across all datasets</p>
            <p>• <strong>Robust Results:</strong> Find parameters that work well across multiple timeframes</p>
          </div>
        </div>
      </div>
    </div>
  );
}