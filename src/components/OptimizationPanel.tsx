import React, { useState } from 'react';
import { TradingConfig, OptimizationProgress, OptimizationResult, OptimizationFilters } from '../types/trading';
import { Zap, Trophy, TrendingUp, Target, BarChart3, Play, Clock, AlertTriangle, Filter, Calendar } from 'lucide-react';

interface OptimizationPanelProps {
  config: TradingConfig;
  onOptimizationComplete: (bestConfig: TradingConfig, results: OptimizationResult[]) => void;
  onStartOptimization: (filters?: OptimizationFilters) => Promise<OptimizationResult[]>;
  progress: OptimizationProgress | null;
}

export function OptimizationPanel({ 
  config, 
  onOptimizationComplete, 
  onStartOptimization,
  progress 
}: OptimizationPanelProps) {
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
    setIsOptimizing(true);
    try {
      const results = await onStartOptimization(filters);
      if (results.length > 0) {
        const bestResult = results[0]; // Already sorted by score
        const bestConfig: TradingConfig = {
          ...config,
          period: bestResult.period,
          stdDev: bestResult.stdDev,
          offset: bestResult.offset,
          maxLeverage: bestResult.leverage
        };
        onOptimizationComplete(bestConfig, results);
      }
    } catch (error) {
      console.error('Optimization failed:', error);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
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

  // Detect if we're working with seconds data
  const isSecondsTimeframe = progress?.currentConfig?.includes('seconds') || false;

  // Adjust total combinations based on timeframe
  const totalCombinations = isSecondsTimeframe 
    ? 19 * 5 * 5 * 13 // Smaller SMA range for seconds
    : 49 * 5 * 5 * 13; // SMA(49) * StdDev(5) * Offset(5) * Leverage(13)

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Zap className="mr-2 h-6 w-6 text-yellow-600" />
        Strategy Optimization
      </h3>

      <div className="space-y-6">
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
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Comprehensive Auto-Optimization</h4>
          <p className="text-sm text-gray-600 mb-3">
            Test all combinations of parameters to find strategies meeting your criteria:
          </p>
          <div className="text-xs text-gray-500 space-y-1 mb-4">
            {isSecondsTimeframe ? (
              <>
                <p>• <strong>SMA:</strong> 2 to 20 periods (19 values) - optimized for seconds data</p>
                <p>• <strong>StdDev:</strong> 1.0, 1.5, 2.0, 2.5, 3.0 (5 values)</p>
                <p>• <strong>Offset:</strong> 0, 5, 10, 15, 20 (5 values)</p>
                <p>• <strong>Leverage:</strong> 2x to 125x (13 values)</p>
                <p>• <strong>Total:</strong> {(19 * 5 * 5 * 13).toLocaleString()} combinations</p>
              </>
            ) : (
              <>
                <p>• <strong>SMA:</strong> 2 to 50 periods (49 values)</p>
                <p>• <strong>StdDev:</strong> 1.0, 1.5, 2.0, 2.5, 3.0 (5 values)</p>
                <p>• <strong>Offset:</strong> 0, 5, 10, 15, 20 (5 values)</p>
                <p>• <strong>Leverage:</strong> 2x to 125x (13 values)</p>
                <p>• <strong>Total:</strong> {totalCombinations.toLocaleString()} combinations</p>
              </>
            )}
          </div>
          
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-800">
                This will test {totalCombinations.toLocaleString()} combinations and may take several minutes
              </span>
            </div>
          </div>
          
          <button
            onClick={handleStartOptimization}
            disabled={isOptimizing}
            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Optimizing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start Filtered Optimization
              </>
            )}
          </button>
        </div>

        {/* Progress Display */}
        {progress && progress.isRunning && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-600">Progress</span>
              <span className="text-sm text-blue-600">
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-blue-600">
              <span>Testing: {progress.currentConfig}</span>
              {progress.estimatedTimeRemaining && (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{progress.estimatedTimeRemaining} remaining</span>
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-blue-600">
              {((progress.current / progress.total) * 100).toFixed(2)}% complete
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
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-600">SMA Period</p>
                <p className="font-bold text-gray-900">{progress.bestResult.period}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Std Dev</p>
                <p className="font-bold text-gray-900">{progress.bestResult.stdDev}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Offset</p>
                <p className="font-bold text-gray-900">{progress.bestResult.offset}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Leverage</p>
                <p className="font-bold text-purple-600">{progress.bestResult.leverage}x</p>
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
                <p className="text-xs text-gray-600">Total P&L</p>
                <p className={`font-bold ${progress.bestResult.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(progress.bestResult.totalPnL)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Score</p>
                <p className="font-bold text-green-600">{progress.bestResult.score.toFixed(1)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-600">Max Drawdown</p>
                <p className="font-bold text-orange-600">{formatPercentage(progress.bestResult.maxDrawdown)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Sharpe Ratio</p>
                <p className="font-bold text-gray-600">{progress.bestResult.sharpeRatio.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Trading Period</p>
                <p className="font-bold text-indigo-600">
                  {progress.bestResult.tradingPeriodDays ? formatDuration(progress.bestResult.tradingPeriodDays) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Trades/Day</p>
                <p className="font-bold text-indigo-600">{progress.bestResult.averageTradesPerDay?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Optimization Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Optimization Scoring</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Return (35%):</strong> Total percentage return</p>
            <p>• <strong>Win Rate (15%):</strong> Percentage of winning trades</p>
            <p>• <strong>Sharpe Ratio (20%):</strong> Risk-adjusted returns</p>
            <p>• <strong>Drawdown (15%):</strong> Maximum capital loss</p>
            <p>• <strong>Trade Frequency (10%):</strong> Number of trades</p>
            <p>• <strong>Leverage Risk (5%):</strong> Risk penalty for high leverage</p>
          </div>
        </div>
      </div>
    </div>
  );
}