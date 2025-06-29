import React from 'react';
import { FibonacciScalpingConfig } from '../utils/fibonacciScalpingStrategy';
import { TrendingUp, Play, Clock, Target, TrendingDown, BarChart3, Zap } from 'lucide-react';

interface FibonacciScalpingPanelProps {
  config: FibonacciScalpingConfig;
  onConfigChange: (config: FibonacciScalpingConfig) => void;
  onRunFibonacci: (config: FibonacciScalpingConfig) => void;
  isRunning: boolean;
}

export function FibonacciScalpingPanel({ config, onConfigChange, onRunFibonacci, isRunning }: FibonacciScalpingPanelProps) {
  const handleChange = (field: keyof FibonacciScalpingConfig, value: number | boolean) => {
    const newConfig = {
      ...config,
      [field]: value
    };
    
    // Auto-calculate risk/reward ratio when profit target or stop loss changes
    if (field === 'profitTarget' || field === 'stopLossPercent') {
      newConfig.riskRewardRatio = newConfig.profitTarget / newConfig.stopLossPercent;
    }
    
    onConfigChange(newConfig);
  };

  const handleRunFibonacci = () => {
    // Log the config to help with debugging
    console.log("Running Fibonacci Scalping with config:", config);
    
    // Make sure we have the required fields
    const updatedConfig = {
      ...config,
      fibRetracementLevels: config.fibRetracementLevels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
    };
    
    onRunFibonacci(updatedConfig);
  };

  const isStrategyEnabled = config.enableLongPositions || config.enableShortPositions;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <BarChart3 className="mr-2 h-6 w-6 text-purple-600" />
        Fibonacci Scalping Bot (1-Min Chart)
      </h3>

      <div className="space-y-6">
        {/* Strategy Overview */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Pure Price Action + Fibonacci Strategy</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>No Indicators:</strong> Pure price action and Fibonacci retracement</p>
            <p>• <strong>Golden Zone:</strong> 50% - 61.8% Fibonacci levels</p>
            <p>• <strong>Structure Breaks:</strong> Break of swing highs/lows</p>
            <p>• <strong>Quick Scalps:</strong> 2-15 minute trades targeting 1.5%</p>
            <p>• <strong>Risk/Reward:</strong> {config.riskRewardRatio.toFixed(2)}:1 ratio</p>
          </div>
        </div>

        {/* Strategy Selection */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Trading Direction</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableLongPositions}
                onChange={(e) => handleChange('enableLongPositions', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <TrendingUp className="ml-2 mr-2 h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Enable Long Positions (Uptrend Pullbacks)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableShortPositions}
                onChange={(e) => handleChange('enableShortPositions', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <TrendingDown className="ml-2 mr-2 h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-gray-700">Enable Short Positions (Downtrend Pullbacks)</span>
            </label>
          </div>
          {!isStrategyEnabled && (
            <p className="text-sm text-red-600 mt-2">⚠️ At least one strategy must be enabled</p>
          )}
        </div>

        {/* Fibonacci Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Fibonacci Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Swing Lookback</label>
              <input
                type="number"
                value={config.swingLookback}
                onChange={(e) => handleChange('swingLookback', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="3" max="10"
              />
              <p className="text-xs text-gray-500 mt-1">Candles to look back for swing points</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Golden Zone Min (%)</label>
              <input
                type="number"
                step="0.01"
                value={config.goldenZoneMin}
                onChange={(e) => handleChange('goldenZoneMin', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="0.4" max="0.6"
              />
              <p className="text-xs text-gray-500 mt-1">50% Fibonacci level (0.5)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Golden Zone Max (%)</label>
              <input
                type="number"
                step="0.01"
                value={config.goldenZoneMax}
                onChange={(e) => handleChange('goldenZoneMax', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="0.6" max="0.8"
              />
              <p className="text-xs text-gray-500 mt-1">61.8% Fibonacci level (0.618)</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Structure Break Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Break Confirmation</label>
              <input
                type="number"
                value={config.structureBreakConfirmation}
                onChange={(e) => handleChange('structureBreakConfirmation', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="1" max="5"
              />
              <p className="text-xs text-gray-500 mt-1">Candles to confirm structure break</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Swing Size (%)</label>
              <input
                type="number"
                step="0.001"
                value={config.minSwingSize * 100}
                onChange={(e) => handleChange('minSwingSize', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="0.5" max="3"
              />
              <p className="text-xs text-gray-500 mt-1">Current: {(config.minSwingSize * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Risk Management (Scalping Optimized)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profit Target (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.profitTarget * 100}
                onChange={(e) => handleChange('profitTarget', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0.5" max="3"
              />
              <p className="text-xs text-gray-500 mt-1">Current: {(config.profitTarget * 100).toFixed(1)}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stop Loss (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.stopLossPercent * 100}
                onChange={(e) => handleChange('stopLossPercent', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0.3" max="2"
              />
              <p className="text-xs text-gray-500 mt-1">Current: {(config.stopLossPercent * 100).toFixed(1)}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Hold Time (Minutes)</label>
              <input
                type="number"
                value={config.maxHoldingMinutes}
                onChange={(e) => handleChange('maxHoldingMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="2" max="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leverage</label>
              <input
                type="number"
                value={config.maxLeverage}
                onChange={(e) => handleChange('maxLeverage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="2" max="50"
              />
            </div>
          </div>
          <div className="mt-3 p-3 bg-blue-100 rounded">
            <p className="text-sm text-blue-800">
              <strong>Risk/Reward Ratio:</strong> {config.riskRewardRatio.toFixed(2)}:1 
              {config.riskRewardRatio >= 1.5 ? ' ✅ Good' : ' ⚠️ Consider improving'}
            </p>
          </div>
        </div>

        {/* Entry Confirmation */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Entry Confirmation</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.requireVolumeConfirmation}
                onChange={(e) => handleChange('requireVolumeConfirmation', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Require Volume Confirmation</span>
            </label>
            {config.requireVolumeConfirmation && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Volume Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.volumeThreshold}
                  onChange={(e) => handleChange('volumeThreshold', parseFloat(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="1" max="3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Require {((config.volumeThreshold - 1) * 100).toFixed(0)}% above average volume
                </p>
              </div>
            )}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.requireCandleColorConfirmation}
                onChange={(e) => handleChange('requireCandleColorConfirmation', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Require Candle Color Confirmation</span>
            </label>
          </div>
        </div>

        {/* Capital */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital ($)</label>
          <input
            type="number"
            value={config.initialCapital}
            onChange={(e) => handleChange('initialCapital', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            min="1000" step="1000"
          />
        </div>

        {/* Run Button */}
        <button
          onClick={handleRunFibonacci}
          disabled={isRunning || !isStrategyEnabled}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Fibonacci Scalping...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run Fibonacci Scalping Bot
            </>
          )}
        </button>

        {/* Strategy Info */}
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-purple-600" />
            Fibonacci Scalping Strategy
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Entry:</strong> Price pullback to golden zone (50%-61.8%) after structure break</p>
            <p>• <strong>Confirmation:</strong> Volume spike + candle color + Fibonacci respect</p>
            <p>• <strong>Exit:</strong> Profit target ({(config.profitTarget * 100).toFixed(1)}%), stop loss ({(config.stopLossPercent * 100).toFixed(1)}%), or previous swing level</p>
            <p>• <strong>Time Limit:</strong> Maximum {config.maxHoldingMinutes} minutes per trade</p>
            <p>• <strong>Expectancy:</strong> Quick 1-2% moves with {config.riskRewardRatio.toFixed(1)}:1 risk/reward</p>
          </div>
        </div>
      </div>
    </div>
  );
}