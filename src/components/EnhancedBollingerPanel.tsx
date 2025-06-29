import React, { useState } from 'react';
import { EnhancedBollingerConfig, createEnhancedConfig, EnhancedBollingerBot } from '../utils/enhancedBollingerStrategy';
import { TradingConfig } from '../types/trading';
import { Settings, Play, Zap, TrendingUp, TrendingDown, Clock, Target, BarChart3, AlertTriangle } from 'lucide-react';

interface EnhancedBollingerPanelProps {
  basicConfig: TradingConfig;
  candles: any[];
  onRunEnhancedBacktest: (config: EnhancedBollingerConfig) => void;
  isRunning: boolean;
}

export function EnhancedBollingerPanel({ 
  basicConfig, 
  candles, 
  onRunEnhancedBacktest, 
  isRunning 
}: EnhancedBollingerPanelProps) {
  const [config, setConfig] = useState<EnhancedBollingerConfig>(() => createEnhancedConfig(basicConfig));
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: keyof EnhancedBollingerConfig, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRunTest = () => {
    onRunEnhancedBacktest(config);
  };

  const getEnabledFeaturesCount = () => {
    const features = [
      config.enableAdaptivePeriod,
      config.enableVolumeFilter,
      config.enableVolatilityPositioning,
      config.enableTrailingStop,
      config.enablePartialTakeProfit,
      config.enableMarketRegimeFilter,
      config.enableTimeFilter,
      config.enableSqueezeDetection,
      config.enableMeanReversion
    ];
    return features.filter(Boolean).length;
  };

  const isStrategyEnabled = config.enableLongPositions || config.enableShortPositions;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Zap className="mr-2 h-6 w-6 text-purple-600" />
        Enhanced Bollinger Bands Strategy
      </h3>

      <div className="space-y-6">
        {/* Status Overview */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Enhancement Status</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Base Strategy:</strong> {basicConfig.enableLongPositions && basicConfig.enableShortPositions ? 'Long/Short' : basicConfig.enableLongPositions ? 'Long Only' : 'Short Only'}</p>
            <p>• <strong>Enhanced Features:</strong> {getEnabledFeaturesCount()}/9 enabled</p>
            <p>• <strong>Current Settings:</strong> SMA {config.period}, StdDev {config.stdDev}, Offset {config.offset}</p>
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
              <span className="text-sm font-medium text-gray-700">Enable Long Positions</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableShortPositions}
                onChange={(e) => handleChange('enableShortPositions', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <TrendingDown className="ml-2 mr-2 h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-gray-700">Enable Short Positions</span>
            </label>
          </div>
          {!isStrategyEnabled && (
            <p className="text-sm text-red-600 mt-2">⚠️ At least one strategy must be enabled</p>
          )}
        </div>

        {/* Quick Enhancement Toggles */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Quick Enhancements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableAdaptivePeriod}
                onChange={(e) => handleChange('enableAdaptivePeriod', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Adaptive Period</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableVolumeFilter}
                onChange={(e) => handleChange('enableVolumeFilter', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Volume Filter</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableTrailingStop}
                onChange={(e) => handleChange('enableTrailingStop', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Trailing Stop</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.enableMarketRegimeFilter}
                onChange={(e) => handleChange('enableMarketRegimeFilter', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Market Regime Filter</span>
            </label>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            <Settings className="h-4 w-4 mr-1" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </button>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-6 border-t pt-6">
            {/* Adaptive Period Settings */}
            {config.enableAdaptivePeriod && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3">Adaptive Period Settings</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Period</label>
                    <input
                      type="number"
                      value={config.adaptivePeriodMin}
                      onChange={(e) => handleChange('adaptivePeriodMin', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      min="5" max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Period</label>
                    <input
                      type="number"
                      value={config.adaptivePeriodMax}
                      onChange={(e) => handleChange('adaptivePeriodMax', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      min="10" max="100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Volume Filter Settings */}
            {config.enableVolumeFilter && (
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3">Volume Filter Settings</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume Period</label>
                    <input
                      type="number"
                      value={config.volumePeriod}
                      onChange={(e) => handleChange('volumePeriod', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      min="5" max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume Threshold</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.volumeThreshold}
                      onChange={(e) => handleChange('volumeThreshold', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      min="1" max="5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Trailing Stop Settings */}
            {config.enableTrailingStop && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3">Trailing Stop Settings</h5>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trailing Stop %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.trailingStopPercent * 100}
                    onChange={(e) => handleChange('trailingStopPercent', parseFloat(e.target.value) / 100)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    min="0.5" max="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {(config.trailingStopPercent * 100).toFixed(1)}%</p>
                </div>
              </div>
            )}

            {/* Risk Management */}
            <div className="bg-red-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Risk Management
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Daily Loss ($)</label>
                  <input
                    type="number"
                    value={config.maxDailyLoss}
                    onChange={(e) => handleChange('maxDailyLoss', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Losses</label>
                  <input
                    type="number"
                    value={config.maxConsecutiveLosses}
                    onChange={(e) => handleChange('maxConsecutiveLosses', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleRunTest}
          disabled={isRunning || !isStrategyEnabled || candles.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Enhanced Backtest...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run Enhanced Bollinger Strategy
            </>
          )}
        </button>

        {/* Strategy Info */}
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Enhanced Features Available
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Adaptive Periods:</strong> Automatically adjust BB period based on volatility</p>
            <p>• <strong>Volume Confirmation:</strong> Only trade on above-average volume</p>
            <p>• <strong>Trailing Stops:</strong> Lock in profits as price moves favorably</p>
            <p>• <strong>Market Regime Filter:</strong> Avoid trading in unfavorable conditions</p>
            <p>• <strong>Volatility Positioning:</strong> Adjust position size based on market volatility</p>
            <p>• <strong>Squeeze Detection:</strong> Wait for volatility expansion before entering</p>
            <p>• <strong>Mean Reversion Mode:</strong> Alternative entry strategy for ranging markets</p>
          </div>
        </div>
      </div>
    </div>
  );
}