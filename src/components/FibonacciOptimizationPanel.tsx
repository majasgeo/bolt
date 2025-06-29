import React, { useState } from 'react';
import { FibonacciScalpingConfig } from '../utils/fibonacciScalpingStrategy';
import { FibonacciOptimizer, FibonacciOptimizationResult } from '../utils/fibonacciOptimizer';
import { OptimizationProgress, OptimizationFilters, Candle } from '../types/trading';
import { BarChart3, Trophy, Play, Clock, AlertTriangle, Filter, Target, Zap } from 'lucide-react';

interface FibonacciOptimizationPanelProps {
  candles: Candle[];
  config: FibonacciScalpingConfig;
  onOptimizationComplete: (bestConfig: FibonacciScalpingConfig, results: FibonacciOptimizationResult[]) => void;
  progress: OptimizationProgress | null;
  onProgressUpdate: (progress: OptimizationProgress | null) => void;
}

export function FibonacciOptimizationPanel({ 
  candles,
  config, 
  onOptimizationComplete,
  progress,
  onProgressUpdate
}: FibonacciOptimizationPanelProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OptimizationFilters>({
    minimumTradingPeriodDays: 1,
    minimumTrades: 15,
    minimumWinRate: 0.55, // 55% minimum for scalping
    maximumDrawdown: 0.25,
    minimumReturn: 0
  });

  const handleStartOptimization = async () => {
    setIsOptimizing(true);
    try {
      const optimizer = new FibonacciOptimizer(candles, config, onProgressUpdate);
      
      const results = await optimizer.optimizeAllCombinations(filters);
      
      if (results.length > 0) {
        const bestResult = results[0];
        const bestConfig: FibonacciScalpingConfig = {
          ...config,
          swingLookback: bestResult.swingLookback,
          goldenZoneMin: bestResult.goldenZoneMin,
          goldenZoneMax: bestResult.goldenZoneMax,
          structureBreakConfirmation: bestResult.structureBreakConfirmation,
          minSwingSize: bestResult.minSwingSize,
          profitTarget: bestResult.profitTarget,
          stopLossPercent: bestResult.stopLossPercent,
          riskRewardRatio: bestResult.riskRewardRatio,
          maxHoldingMinutes: bestResult.maxHoldingMinutes,
          maxLeverage: bestResult.leverage,
          volumeThreshold: bestResult.volumeThreshold,
          requireVolumeConfirmation: bestResult.requireVolumeConfirmation,
          requireCandleColorConfirmation: bestResult.requireCandleColorConfirmation
        };
        
        onOptimizationComplete(bestConfig, results);
      }
    } catch (error) {
      console.error('Fibonacci optimization failed:', error);
      // Reset optimization state on error
      onProgressUpdate(null);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
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

  // Estimated combinations for Fibonacci scalping
  const estimatedCombinations = 6 * 3 * 3 * 3 * 5 * 6 * 5 * 5 * 6 * 4 * 2 * 2; // Large number

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <BarChart3 className="mr-2 h-6 w-6 text-purple-600" />
        Fibonacci Scalping Auto-Optimization
      </h3>

      <div className="space-y-6">
        {/* Filter Controls */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 mr-2 text-purple-600" />
              Scalping Filters
            </h4>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
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
                  value={filters.minimumTrades || 15}
                  onChange={(e) => handleFilterChange('minimumTrades', parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Win Rate (Scalping Target: 55%+)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    value={(filters.minimumWinRate || 0.55) * 100}
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
                    value={(filters.maximumDrawdown || 0.25) * 100}
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
                    value={(filters.minimumReturn || 0) * 100}
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
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-600" />
            Comprehensive Fibonacci Scalping Optimization
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Test all parameter combinations to find the optimal scalping configuration:
          </p>
          <div className="text-xs text-gray-500 space-y-1 mb-4">
            <p>• <strong>Swing Detection:</strong> Lookback (6), Golden Zone (9) = 54 combinations</p>
            <p>• <strong>Structure Breaks:</strong> Confirmation (3), Min Swing (5) = 15 combinations</p>
            <p>• <strong>Risk Management:</strong> Profit (6), Stop (5), Hold (5), Leverage (6) = 900 combinations</p>
            <p>• <strong>Entry Confirmation:</strong> Volume (4), Confirmations (4) = 16 combinations</p>
            <p>• <strong>Total:</strong> {estimatedCombinations.toLocaleString()}+ combinations</p>
          </div>
          
          <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-800">
                This comprehensive optimization may take 45+ minutes to complete
              </span>
            </div>
          </div>
          
          <button
            onClick={handleStartOptimization}
            disabled={isOptimizing}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Optimizing Fibonacci Scalping...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start Fibonacci Optimization
              </>
            )}
          </button>
        </div>

        {/* Progress Display */}
        {progress && progress.isRunning && (
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-600">Fibonacci Optimization Progress</span>
              <span className="text-sm text-purple-600">
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
              </span>
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
                <div className="flex items-center flex-shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{progress.estimatedTimeRemaining} remaining</span>
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-purple-600">
              {((progress.current / progress.total) * 100).toFixed(2)}% complete
            </div>
          </div>
        )}

        {/* Best Result So Far */}
        {progress && progress.bestResult && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
              <h4 className="font-semibold text-gray-900">Best Fibonacci Configuration Found</h4>
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
                <p className="text-xs text-gray-600">Total Trades</p>
                <p className="font-bold text-gray-900">{progress.bestResult.totalTrades}</p>
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

        {/* Fibonacci Optimization Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-gray-600" />
            Fibonacci Scalping Optimization Scoring
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Return (30%):</strong> Total percentage return</p>
            <p>• <strong>Win Rate (25%):</strong> Critical for scalping profitability</p>
            <p>• <strong>Sharpe Ratio (15%):</strong> Risk-adjusted returns</p>
            <p>• <strong>Drawdown (15%):</strong> Maximum capital loss</p>
            <p>• <strong>Trade Frequency (10%):</strong> More scalping opportunities</p>
            <p>• <strong>Speed (5%):</strong> Faster trades = better scalping</p>
          </div>
        </div>
      </div>
    </div>
  );
}