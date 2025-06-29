import React from 'react';
import { BollingerFibonacciConfig } from '../utils/bollingerFibonacciHybridStrategy';
import { TrendingUp, Play, Clock, Target, TrendingDown, BarChart3, Zap, Layers } from 'lucide-react';

interface BollingerFibonacciHybridPanelProps {
  config: BollingerFibonacciConfig;
  onConfigChange: (config: BollingerFibonacciConfig) => void;
  onRunHybrid: (config: BollingerFibonacciConfig) => void;
  isRunning: boolean;
}

export function BollingerFibonacciHybridPanel({ 
  config, 
  onConfigChange, 
  onRunHybrid, 
  isRunning 
}: BollingerFibonacciHybridPanelProps) {
  const handleChange = (field: keyof BollingerFibonacciConfig, value: number | boolean) => {
    const newConfig = {
      ...config,
      [field]: value
    };
    onConfigChange(newConfig);
  };

  const handleRunHybrid = () => {
    // Make sure we have the required fields
    const updatedConfig = {
      ...config,
      confirmationCandles: config.confirmationCandles || 1,
      fibRetracementLevels: config.fibRetracementLevels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
    };
    
    // Log the config to help with debugging
    console.log("Running hybrid strategy with config:", updatedConfig);
    
    onRunHybrid(updatedConfig);
  };

  const isStrategyEnabled = config.enableLongPositions || config.enableShortPositions;
  
  // Detect if we're working with seconds data
  const isSecondsTimeframe = config.maxHoldingMinutes < 1;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Layers className="mr-2 h-6 w-6 text-indigo-600" />
        Bollinger + Fibonacci Hybrid {isSecondsTimeframe ? '(Seconds Scalping)' : '(1-Min Scalping)'}
      </h3>

      <div className="space-y-6">
        {/* Strategy Overview */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Hybrid Scalping Strategy</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Step 1:</strong> Bollinger Band breakout for momentum detection</p>
            <p>• <strong>Step 2:</strong> Fibonacci retracement to golden zone for precision entry</p>
            <p>• <strong>Step 3:</strong> Volume + momentum confirmation for high-probability trades</p>
            <p>• <strong>Target:</strong> {(config.profitTarget * 100).toFixed(1)}% profit with {(config.stopLossPercent * 100).toFixed(1)}% stop loss ({(config.profitTarget / config.stopLossPercent).toFixed(1)}:1 R/R ratio)</p>
            <p>• <strong>Timeframe:</strong> Optimized for {isSecondsTimeframe ? 'seconds' : '1-minute'} chart scalping</p>
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
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <TrendingUp className="ml-2 mr-2 h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Enable Long Positions (BB Breakout + Fib Pullback)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableShortPositions}
                onChange={(e) => handleChange('enableShortPositions', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <TrendingDown className="ml-2 mr-2 h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-gray-700">Enable Short Positions (BB Breakdown + Fib Bounce)</span>
            </label>
          </div>
          {!isStrategyEnabled && (
            <p className="text-sm text-red-600 mt-2">⚠️ At least one strategy must be enabled</p>
          )}
        </div>

        {/* Bollinger Bands Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Bollinger Bands (Momentum Detection)</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <input
                type="number"
                value={config.period}
                onChange={(e) => handleChange('period', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                min={isSecondsTimeframe ? "3" : "10"} 
                max={isSecondsTimeframe ? "15" : "30"}
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: {isSecondsTimeframe ? '3-8 for seconds data' : '15-20 for 1-minute scalping'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard Deviation</label>
              <input
                type="number"
                step="0.1"
                value={config.stdDev}
                onChange={(e) => handleChange('stdDev', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                min="1.5" max="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offset</label>
              <input
                type="number"
                value={config.offset}
                onChange={(e) => handleChange('offset', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                min="0" max={isSecondsTimeframe ? "5" : "10"}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Fibonacci Settings (Precision Entry)</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Swing Lookback</label>
              <input
                type="number"
                value={config.swingLookback}
                onChange={(e) => handleChange('swingLookback', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                min={isSecondsTimeframe ? "2" : "3"} 
                max={isSecondsTimeframe ? "6" : "8"}
              />
              <p className="text-xs text-gray-500 mt-1">Candles to look back for swing points</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Golden Zone Min</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.goldenZoneMin}
                  onChange={(e) => handleChange('goldenZoneMin', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0.4" max="0.6"
                />
                <p className="text-xs text-gray-500 mt-1">50% level</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Golden Zone Max</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.goldenZoneMax}
                  onChange={(e) => handleChange('goldenZoneMax', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0.6" max="0.8"
                />
                <p className="text-xs text-gray-500 mt-1">61.8% level</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hybrid Requirements */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Hybrid Entry Requirements</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.requireBollingerBreakout}
                onChange={(e) => handleChange('requireBollingerBreakout', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Require Bollinger Band Breakout</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.requireFibonacciRetracement}
                onChange={(e) => handleChange('requireFibonacciRetracement', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Require Fibonacci Golden Zone Entry</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.requireVolumeConfirmation}
                onChange={(e) => handleChange('requireVolumeConfirmation', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Require Volume Confirmation</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.requireMomentumConfirmation}
                onChange={(e) => handleChange('requireMomentumConfirmation', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Require Momentum Confirmation</span>
            </label>
          </div>
        </div>

        {/* Risk Management */}
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="h-5 w-5 mr-2 text-green-600" />
            Risk Management ({isSecondsTimeframe ? 'Seconds' : '1-Minute'} Scalping)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profit Target (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.profitTarget * 100}
                onChange={(e) => handleChange('profitTarget', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                min={isSecondsTimeframe ? "0.1" : "0.5"} 
                max="2"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                min={isSecondsTimeframe ? "0.05" : "0.3"} 
                max="1.5"
              />
              <p className="text-xs text-gray-500 mt-1">Current: {(config.stopLossPercent * 100).toFixed(1)}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Hold Time ({isSecondsTimeframe ? 'Seconds' : 'Minutes'})
              </label>
              <input
                type="number"
                value={config.maxHoldingMinutes}
                onChange={(e) => handleChange('maxHoldingMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                min={isSecondsTimeframe ? "5" : "2"} 
                max={isSecondsTimeframe ? "60" : "15"}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isSecondsTimeframe ? 'For seconds data, this is in seconds' : 'Maximum minutes to hold a trade'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leverage</label>
              <input
                type="number"
                value={config.maxLeverage}
                onChange={(e) => handleChange('maxLeverage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                min="2" max="25"
              />
            </div>
          </div>
          <div className="mt-3 p-3 bg-green-100 rounded">
            <p className="text-sm text-green-800">
              <strong>Risk/Reward Ratio:</strong> {(config.profitTarget / config.stopLossPercent).toFixed(2)}:1 
              {(config.profitTarget / config.stopLossPercent) >= 1.5 ? ' ✅ Excellent' : ' ⚠️ Consider improving'}
            </p>
          </div>
        </div>

        {/* Volume Settings */}
        {config.requireVolumeConfirmation && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Volume Confirmation</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volume Threshold</label>
              <input
                type="number"
                step="0.1"
                value={config.volumeThreshold}
                onChange={(e) => handleChange('volumeThreshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                min="1" max="3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Require {((config.volumeThreshold - 1) * 100).toFixed(0)}% above average volume
              </p>
            </div>
          </div>
        )}

        {/* Capital */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital ($)</label>
          <input
            type="number"
            value={config.initialCapital}
            onChange={(e) => handleChange('initialCapital', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            min="1000" step="1000"
          />
        </div>

        {/* Run Button */}
        <button
          onClick={handleRunHybrid}
          disabled={isRunning || !isStrategyEnabled}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Hybrid Strategy...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run Bollinger + Fibonacci Hybrid
            </>
          )}
        </button>

        {/* Strategy Info */}
        <div className="bg-indigo-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-indigo-600" />
            Hybrid Strategy Logic
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Entry:</strong> BB breakout followed by pullback to Fibonacci golden zone (50%-61.8%)</p>
            <p>• <strong>Confirmation:</strong> Volume spike + momentum confirmation for high-probability setups</p>
            <p>• <strong>Exit:</strong> Profit target ({(config.profitTarget * 100).toFixed(1)}%), stop loss ({(config.stopLossPercent * 100).toFixed(1)}%), or signal reversal</p>
            <p>• <strong>Time Limit:</strong> Maximum {config.maxHoldingMinutes} {isSecondsTimeframe ? 'seconds' : 'minutes'} per trade</p>
            <p>• <strong>Advantage:</strong> Combines momentum detection with precision entry for optimal {isSecondsTimeframe ? 'seconds' : '1-minute'} scalping</p>
          </div>
        </div>
      </div>
    </div>
  );
}