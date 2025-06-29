import React, { useState } from 'react';
import { UltraFastScalpingConfig, createUltraFastConfig, UltraFastScalpingBot } from '../utils/ultraFastScalpingStrategy';
import { TradingConfig } from '../types/trading';
import { Zap, Play, Clock, Target, TrendingUp, TrendingDown, AlertTriangle, Timer, Activity } from 'lucide-react';

interface UltraFastScalpingPanelProps {
  basicConfig: TradingConfig;
  candles: any[];
  onRunUltraFastBacktest: (config: UltraFastScalpingConfig) => void;
  isRunning: boolean;
}

export function UltraFastScalpingPanel({ 
  basicConfig, 
  candles, 
  onRunUltraFastBacktest, 
  isRunning 
}: UltraFastScalpingPanelProps) {
  const [config, setConfig] = useState<UltraFastScalpingConfig>(() => createUltraFastConfig(basicConfig));
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detect if we have seconds timeframe data
  const isSecondsTimeframe = candles.length >= 2 && 
    (candles[1].timestamp - candles[0].timestamp) < 60000;

  const handleChange = (field: keyof UltraFastScalpingConfig, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRunTest = () => {
    console.log("Running UltraFast Scalping with config:", config);
    onRunUltraFastBacktest(config);
  };

  const isStrategyEnabled = config.enableLongPositions || config.enableShortPositions;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Activity className="mr-2 h-6 w-6 text-red-600" />
        Ultra-Fast {isSecondsTimeframe ? 'Seconds' : '1-Minute'} Scalping Bot
      </h3>

      <div className="space-y-6">
        {/* Timeframe Info */}
        {isSecondsTimeframe && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">Seconds Timeframe Detected</h4>
                <div className="mt-2 text-sm text-green-700">
                  <p>⚡ <strong>Optimal Settings:</strong> This bot is perfectly suited for seconds data</p>
                  <p>🎯 <strong>Recommended:</strong> 5-15 second holding times for best results</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning Banner */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Ultra-Fast Scalping Mode</h4>
              <div className="mt-2 text-sm text-red-700">
                <p>⚡ <strong>Maximum Speed:</strong> Trades execute in seconds, not minutes</p>
                <p>🎯 <strong>Micro Targets:</strong> 0.1% - 0.5% profit per trade</p>
                <p>⏱️ <strong>Time Limit:</strong> Maximum {config.maxHoldingSeconds} seconds per trade</p>
                <p>🔥 <strong>High Frequency:</strong> Designed for {isSecondsTimeframe ? 'seconds' : '1-minute'} chart scalping</p>
              </div>
            </div>
          </div>
        </div>

        {/* Speed Settings */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Timer className="h-5 w-5 mr-2 text-red-600" />
            Ultra-Fast Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Holding Time (Seconds)</label>
              <input
                type="number"
                value={config.maxHoldingSeconds}
                onChange={(e) => handleChange('maxHoldingSeconds', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                min={isSecondsTimeframe ? "3" : "10"} 
                max={isSecondsTimeframe ? "60" : "300"}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isSecondsTimeframe 
                  ? "Recommended: 5-15 seconds for seconds data" 
                  : "Current: " + config.maxHoldingSeconds + " seconds"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quick Profit Target (%)</label>
              <input
                type="number"
                step="0.01"
                value={config.quickProfitTarget * 100}
                onChange={(e) => handleChange('quickProfitTarget', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                min={isSecondsTimeframe ? "0.01" : "0.05"} 
                max="1"
              />
              <p className="text-xs text-gray-500 mt-1">Current: {(config.quickProfitTarget * 100).toFixed(2)}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tight Stop Loss (%)</label>
              <input
                type="number"
                step="0.01"
                value={config.tightStopLoss * 100}
                onChange={(e) => handleChange('tightStopLoss', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                min={isSecondsTimeframe ? "0.005" : "0.02"} 
                max="0.5"
              />
              <p className="text-xs text-gray-500 mt-1">Current: {(config.tightStopLoss * 100).toFixed(2)}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leverage</label>
              <input
                type="number"
                value={config.maxLeverage}
                onChange={(e) => handleChange('maxLeverage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                min="5" max="125"
              />
              <p className="text-xs text-gray-500 mt-1">High leverage for micro profits</p>
            </div>
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
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <TrendingUp className="ml-2 mr-2 h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Enable Long Scalps</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableShortPositions}
                onChange={(e) => handleChange('enableShortPositions', e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <TrendingDown className="ml-2 mr-2 h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-gray-700">Enable Short Scalps</span>
            </label>
          </div>
          {!isStrategyEnabled && (
            <p className="text-sm text-red-600 mt-2">⚠️ At least one strategy must be enabled</p>
          )}
        </div>

        {/* Speed Optimizations */}
        <div className="bg-orange-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Speed Optimizations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableInstantEntry}
                onChange={(e) => handleChange('enableInstantEntry', e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Instant Entry</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableInstantExit}
                onChange={(e) => handleChange('enableInstantExit', e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Instant Exit</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableMicroProfits}
                onChange={(e) => handleChange('enableMicroProfits', e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Micro Profits</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableScalpMode}
                onChange={(e) => handleChange('enableScalpMode', e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Pure Scalp Mode</span>
            </label>
          </div>
        </div>

        {/* Scalp Mode Settings */}
        {config.enableScalpMode && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-3">Scalp Mode Settings</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Ticks</label>
                <input
                  type="number"
                  value={config.scalpTargetTicks}
                  onChange={(e) => handleChange('scalpTargetTicks', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  min="1" max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stop Ticks</label>
                <input
                  type="number"
                  value={config.scalpStopTicks}
                  onChange={(e) => handleChange('scalpStopTicks', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  min="1" max="5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings Toggle */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm font-medium text-red-600 hover:text-red-700"
          >
            <Zap className="h-4 w-4 mr-1" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Speed Settings
          </button>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-6">
            <div className="bg-purple-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-3">Velocity & Tick Settings</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Velocity Threshold ({isSecondsTimeframe ? '%/sec' : '%/min'})
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={config.velocityThreshold * 100}
                    onChange={(e) => handleChange('velocityThreshold', parseFloat(e.target.value) / 100)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    min="0.01" max="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Price Movement (%)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={config.minPriceMovement * 100}
                    onChange={(e) => handleChange('minPriceMovement', parseFloat(e.target.value) / 100)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    min="0.001" max="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Slippage (%)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={config.maxSlippage * 100}
                    onChange={(e) => handleChange('maxSlippage', parseFloat(e.target.value) / 100)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    min="0" max="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub-{isSecondsTimeframe ? 'Second' : 'Minute'} Periods
                  </label>
                  <input
                    type="number"
                    value={config.subMinutePeriods}
                    onChange={(e) => handleChange('subMinutePeriods', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    min="2" max="10"
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-3">Additional Filters</h5>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enableVelocityFilter}
                    onChange={(e) => handleChange('enableVelocityFilter', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Velocity Filter</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enableTickConfirmation}
                    onChange={(e) => handleChange('enableTickConfirmation', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Tick Confirmation</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enableSubMinuteAnalysis}
                    onChange={(e) => handleChange('enableSubMinuteAnalysis', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Sub-{isSecondsTimeframe ? 'Second' : 'Minute'} Analysis
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleRunTest}
          disabled={isRunning || !isStrategyEnabled || candles.length === 0}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Ultra-Fast Scalping...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run Ultra-Fast Scalping Bot
            </>
          )}
        </button>

        {/* Strategy Info */}
        <div className="bg-red-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-red-600" />
            Ultra-Fast Scalping Features
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Lightning Speed:</strong> Maximum {config.maxHoldingSeconds} seconds per trade</p>
            <p>• <strong>Micro Targets:</strong> {(config.quickProfitTarget * 100).toFixed(2)}% profit targets</p>
            <p>• <strong>Tight Stops:</strong> {(config.tightStopLoss * 100).toFixed(2)}% stop losses</p>
            <p>• <strong>High Frequency:</strong> Designed for {isSecondsTimeframe ? 'seconds' : '1-minute'} chart scalping</p>
            <p>• <strong>Instant Execution:</strong> No delays, immediate entry/exit</p>
            <p>• <strong>Tick-Level Precision:</strong> Works with simulated tick data</p>
            <p>• <strong>Velocity Filtering:</strong> Only trades on fast price movements</p>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800 mb-1">Ultra-High Risk Warning</h4>
              <div className="text-sm text-red-700 space-y-1">
                <p>• <strong>Extreme Speed:</strong> Trades execute in seconds with minimal analysis time</p>
                <p>• <strong>High Leverage:</strong> Small price movements amplified by leverage</p>
                <p>• <strong>Slippage Risk:</strong> Fast execution may result in price slippage</p>
                <p>• <strong>Overtrading:</strong> High frequency can lead to excessive trading costs</p>
                <p>• <strong>{isSecondsTimeframe ? 'Seconds' : '1-Minute'} Data:</strong> Limited to {isSecondsTimeframe ? 'seconds' : '1-minute'} chart resolution</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}