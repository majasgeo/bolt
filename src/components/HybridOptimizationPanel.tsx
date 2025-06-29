import React, { useState } from 'react';
import { BollingerFibonacciConfig } from '../utils/bollingerFibonacciHybridStrategy';
import { HybridOptimizer, HybridOptimizationResult } from '../utils/hybridOptimizer';
import { OptimizationProgress, OptimizationFilters, Candle } from '../types/trading';
import { Layers, Trophy, Play, Clock, AlertTriangle, Filter, Target, Zap } from 'lucide-react';

interface HybridOptimizationPanelProps {
  candles: Candle[];
  config: BollingerFibonacciConfig;
  onOptimizationComplete: (bestConfig: BollingerFibonacciConfig, results: HybridOptimizationResult[]) => void;
  progress: OptimizationProgress | null;
  onProgressUpdate: (progress: OptimizationProgress | null) => void;
}

export function HybridOptimizationPanel({ 
  candles,
  config, 
  onOptimizationComplete,
  progress,
  onProgressUpdate
}: HybridOptimizationPanelProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OptimizationFilters>({
    minimumTradingPeriodDays: 1,
    minimumTrades: 15,
    minimumWinRate: 0.55, // 55% minimum for hybrid scalping
    maximumDrawdown: 0.25,
    minimumReturn: 0
  });

  const handleStartOptimization = async () => {
    setIsOptimizing(true);
    try {
      const optimizer = new HybridOptimizer(candles, config, onProgressUpdate);
      
      const results = await optimizer.optimizeAllCombinations(filters);
      
      if (results.length > 0) {
        const bestResult = results[0];
        const bestConfig: BollingerFibonacciConfig = {
          ...config,
          period: bestResult.period,
          stdDev: bestResult.stdDev,
          offset: bestResult.offset,
          swingLookback: bestResult.swingLookback,
          goldenZoneMin: bestResult.goldenZoneMin,
          goldenZoneMax: bestResult.goldenZoneMax,
          profitTarget: bestResult.profitTarget,
          stopLossPercent: bestResult.stopLossPercent,
          maxHoldingMinutes: bestResult.maxHoldingMinutes,
          maxLeverage: bestResult.leverage,
          volumeThreshold: bestResult.volumeThreshold,
          requireBollingerBreakout: bestResult.requireBollingerBreakout,
          requireFibonacciRetracement: bestResult.requireFibonacciRetracement,
          requireVolumeConfirmation: bestResult.requireVolumeConfirmation,
          requireMomentumConfirmation: bestResult.requireMomentumConfirmation
        };
        
        onOptimizationComplete(bestConfig, results);
      }
    } catch (error) {
      console.error('Hybrid optimization failed:', error);
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

  // Estimated combinations for hybrid optimization
  const estimatedCombinations = 6 * 4 * 4 * 5 * 3 * 3 * 5 * 5 * 5 * 5 * 4 * 5; // Large optimization space

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Layers className="mr-2 h-6 w-6 text-indigo-600" />
        Hybrid (BB + Fibonacci) Auto-Optimization
      </h3>

      <div className="space-y-6">
        {/* Filter Controls */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 mr-2 text-indigo-600" />
              Hybrid Strategy Filters
            </h4>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
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
                  Minimum Win Rate (Hybrid Target: 55%+)
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
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="h-5 w-5 mr-2 text-indigo-600" />
            Comprehensive Hybrid Strategy Optimization
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Test all parameter combinations for the Bollinger + Fibonacci hybrid strategy:
          </p>
          <div className="text-xs text-gray-500 space-y-1 mb-4">
            <p>• <strong>Bollinger Bands:</strong> Period (6), StdDev (4), Offset (4) = 96 combinations</p>
            <p>• <strong>Fibonacci:</strong> Swing (5), Golden Zone (9) = 45 combinations</p>
            <p>• <strong>Risk Management:</strong> Profit (5), Stop (5), Hold (5), Leverage (5) = 625 combinations</p>
            <p>• <strong>Confirmations:</strong> Volume (4), Feature sets (5) = 20 combinations</p>
            <p>• <strong>Total:</strong> {estimatedCombinations.toLocaleString()}+ combinations</p>
          </div>
          
          <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-indigo-800">
                Hybrid optimization tests both momentum and precision parameters
              </span>
            </div>
          </div>
          
          <button
            onClick={handleStartOptimization}
            disabled={isOptimizing}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Optimizing Hybrid Strategy...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start Hybrid Optimization
              </>
            )}
          </button>
        </div>

        {/* Progress Display */}
        {progress && progress.isRunning && (
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-600">Hybrid Optimization Progress</span>
              <span className="text-sm text-indigo-600">
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-2 mb-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-indigo-600">
              <span className="truncate mr-2">Testing: {progress.currentConfig}</span>
              {progress.estimatedTimeRemaining && (
                <div className="flex items-center flex-shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{progress.estimatedTimeRemaining} remaining</span>
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-indigo-600">
              {((progress.current / progress.total) * 100).toFixed(2)}% complete
            </div>
          </div>
        )}

        {/* Best Result So Far */}
        {progress && progress.bestResult && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
              <h4 className="font-semibold text-gray-900">Best Hybrid Configuration Found</h4>
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

        {/* Hybrid Optimization Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-gray-600" />
            Hybrid Strategy Optimization Scoring
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Return (25%):</strong> Total percentage return</p>
            <p>• <strong>Win Rate (20%):</strong> Critical for hybrid precision</p>
            <p>• <strong>Sharpe Ratio (15%):</strong> Risk-adjusted returns</p>
            <p>• <strong>Drawdown (15%):</strong> Maximum capital loss</p>
            <p>• <strong>Trade Frequency (10%):</strong> Balanced trade opportunities</p>
            <p>• <strong>Signal Quality (10%):</strong> Confirmation strength</p>
            <p>• <strong>Speed (5%):</strong> Average trade duration</p>
          </div>
        </div>
      </div>
    </div>
  );
}