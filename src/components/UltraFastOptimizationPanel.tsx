import React, { useState } from 'react';
import { UltraFastScalpingConfig } from '../utils/ultraFastScalpingStrategy';
import { UltraFastOptimizer, UltraFastOptimizationResult } from '../utils/ultraFastOptimizer';
import { OptimizationProgress, OptimizationFilters, Candle } from '../types/trading';
import { Activity, Trophy, Play, Clock, AlertTriangle, Filter, Target, Zap } from 'lucide-react';

interface UltraFastOptimizationPanelProps {
  candles: Candle[];
  config: UltraFastScalpingConfig;
  onOptimizationComplete: (bestConfig: UltraFastScalpingConfig, results: UltraFastOptimizationResult[]) => void;
  progress: OptimizationProgress | null;
  onProgressUpdate: (progress: OptimizationProgress | null) => void;
}

export function UltraFastOptimizationPanel({ 
  candles,
  config, 
  onOptimizationComplete,
  progress,
  onProgressUpdate
}: UltraFastOptimizationPanelProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OptimizationFilters>({
    minimumTradingPeriodDays: 1,
    minimumTrades: 20,
    minimumWinRate: 0.50, // 50% minimum for ultra-fast scalping
    maximumDrawdown: 0.25,
    minimumReturn: 0
  });

  const handleStartOptimization = async () => {
    setIsOptimizing(true);
    try {
      const optimizer = new UltraFastOptimizer(candles, config, onProgressUpdate);
      
      const results = await optimizer.optimizeAllCombinations(filters);
      
      if (results.length > 0) {
        const bestResult = results[0];
        const bestConfig: UltraFastScalpingConfig = {
          ...config,
          maxHoldingSeconds: bestResult.maxHoldingSeconds,
          quickProfitTarget: bestResult.quickProfitTarget,
          tightStopLoss: bestResult.tightStopLoss,
          scalpTargetTicks: bestResult.scalpTargetTicks,
          scalpStopTicks: bestResult.scalpStopTicks,
          velocityThreshold: bestResult.velocityThreshold,
          minPriceMovement: bestResult.minPriceMovement,
          maxSlippage: bestResult.maxSlippage,
          subMinutePeriods: bestResult.subMinutePeriods,
          maxLeverage: bestResult.leverage,
          enableInstantEntry: bestResult.enableInstantEntry,
          enableInstantExit: bestResult.enableInstantExit,
          enableMicroProfits: bestResult.enableMicroProfits,
          enableScalpMode: bestResult.enableScalpMode,
          enableVelocityFilter: bestResult.enableVelocityFilter,
          enableTickConfirmation: bestResult.enableTickConfirmation,
          enableSubMinuteAnalysis: bestResult.enableSubMinuteAnalysis
        };
        
        onOptimizationComplete(bestConfig, results);
      }
    } catch (error) {
      console.error('Ultra-fast optimization failed:', error);
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

  // Estimated combinations for ultra-fast scalping
  const estimatedCombinations = 6 * 5 * 4 * 5 * 3 * 4 * 3 * 6 * 4; // Smaller but focused

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Activity className="mr-2 h-6 w-6 text-red-600" />
        Ultra-Fast Scalping Auto-Optimization
      </h3>

      <div className="space-y-6">
        {/* Filter Controls */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 mr-2 text-red-600" />
              Ultra-Fast Scalping Filters
            </h4>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
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
                  value={filters.minimumTrades || 20}
                  onChange={(e) => handleFilterChange('minimumTrades', parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Win Rate (Ultra-Fast Target: 50%+)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    value={(filters.minimumWinRate || 0.50) * 100}
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
        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="h-5 w-5 mr-2 text-red-600" />
            Lightning-Fast Scalping Optimization
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Test all parameter combinations for ultra-fast 1-minute scalping:
          </p>
          <div className="text-xs text-gray-500 space-y-1 mb-4">
            <p>• <strong>Holding Time:</strong> 10-60 seconds (6 values)</p>
            <p>• <strong>Profit/Loss:</strong> 0.1%-0.3% targets, 0.05%-0.2% stops</p>
            <p>• <strong>Scalp Ticks:</strong> 1-5 target ticks, 1-3 stop ticks</p>
            <p>• <strong>Speed Filters:</strong> Velocity, movement, leverage combinations</p>
            <p>• <strong>Feature Sets:</strong> 4 optimized feature combinations</p>
            <p>• <strong>Total:</strong> {estimatedCombinations.toLocaleString()}+ combinations</p>
          </div>
          
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">
                Ultra-fast optimization focuses on second-level precision
              </span>
            </div>
          </div>
          
          <button
            onClick={handleStartOptimization}
            disabled={isOptimizing}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Optimizing Ultra-Fast Scalping...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start Ultra-Fast Optimization
              </>
            )}
          </button>
        </div>

        {/* Progress Display */}
        {progress && progress.isRunning && (
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-600">Ultra-Fast Optimization Progress</span>
              <span className="text-sm text-red-600">
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-red-200 rounded-full h-2 mb-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-red-600">
              <span className="truncate mr-2">Testing: {progress.currentConfig}</span>
              {progress.estimatedTimeRemaining && (
                <div className="flex items-center flex-shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{progress.estimatedTimeRemaining} remaining</span>
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-red-600">
              {((progress.current / progress.total) * 100).toFixed(2)}% complete
            </div>
          </div>
        )}

        {/* Best Result So Far */}
        {progress && progress.bestResult && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
              <h4 className="font-semibold text-gray-900">Best Ultra-Fast Configuration Found</h4>
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

        {/* Ultra-Fast Optimization Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-gray-600" />
            Ultra-Fast Scalping Optimization Scoring
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Return (25%):</strong> Total percentage return</p>
            <p>• <strong>Win Rate (20%):</strong> Critical for high-frequency scalping</p>
            <p>• <strong>Sharpe Ratio (15%):</strong> Risk-adjusted returns</p>
            <p>• <strong>Drawdown (15%):</strong> Maximum capital loss</p>
            <p>• <strong>Trade Frequency (15%):</strong> More trades = more opportunities</p>
            <p>• <strong>Speed (10%):</strong> Faster average trade duration = better scalping</p>
          </div>
        </div>
      </div>
    </div>
  );
}