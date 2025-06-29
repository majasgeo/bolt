import React from 'react';
import { DayTradingConfig } from '../utils/dayTradingStrategy';
import { Zap, Play, Clock, Target, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface DayTradingPanelProps {
  config: DayTradingConfig;
  onConfigChange: (config: DayTradingConfig) => void;
  onRunDayTrading: (config: DayTradingConfig) => void;
  isRunning: boolean;
}

export function DayTradingPanel({ config, onConfigChange, onRunDayTrading, isRunning }: DayTradingPanelProps) {
  const handleChange = (field: keyof DayTradingConfig, value: number | boolean) => {
    const newConfig = {
      ...config,
      [field]: value
    };
    onConfigChange(newConfig);
  };

  const handleRunDayTrading = () => {
    onRunDayTrading(config);
  };

  const isStrategyEnabled = config.enableLongPositions || config.enableShortPositions;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Zap className="mr-2 h-6 w-6 text-orange-600" />
        Day Trading Bot (50% Win Rate Target)
      </h3>

      <div className="space-y-6">
        {/* Strategy Overview */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Multi-Signal Day Trading Strategy</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Bollinger Bands:</strong> Breakout detection</p>
            <p>• <strong>RSI:</strong> Momentum confirmation</p>
            <p>• <strong>MACD:</strong> Trend validation</p>
            <p>• <strong>Volume:</strong> Strength confirmation</p>
            <p>• <strong>Target:</strong> 50%+ win rate with 1.5% profit targets</p>
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

        {/* Technical Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Bollinger Bands</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <input
                type="number"
                value={config.period}
                onChange={(e) => handleChange('period', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                min="5" max="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Std Dev</label>
              <input
                type="number"
                step="0.1"
                value={config.stdDev}
                onChange={(e) => handleChange('stdDev', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                min="0.5" max="5"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">RSI Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RSI Period</label>
              <input
                type="number"
                value={config.rsiPeriod}
                onChange={(e) => handleChange('rsiPeriod', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                min="5" max="30"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overbought</label>
                <input
                  type="number"
                  value={config.rsiOverbought}
                  onChange={(e) => handleChange('rsiOverbought', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min="60" max="90"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oversold</label>
                <input
                  type="number"
                  value={config.rsiOversold}
                  onChange={(e) => handleChange('rsiOversold', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min="10" max="40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Risk Management
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
                min="0.5" max="5"
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
                min="0.3" max="3"
              />
              <p className="text-xs text-gray-500 mt-1">Current: {(config.stopLossPercent * 100).toFixed(1)}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Holding (Hours)</label>
              <input
                type="number"
                value={config.maxHoldingPeriod}
                onChange={(e) => handleChange('maxHoldingPeriod', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1" max="24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leverage</label>
              <input
                type="number"
                value={config.maxLeverage}
                onChange={(e) => handleChange('maxLeverage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1" max="10"
              />
            </div>
          </div>
        </div>

        {/* Volume Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Volume Threshold</label>
          <input
            type="number"
            step="0.1"
            value={config.volumeThreshold}
            onChange={(e) => handleChange('volumeThreshold', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            min="1" max="3"
          />
          <p className="text-xs text-gray-500 mt-1">
            Require {((config.volumeThreshold - 1) * 100).toFixed(0)}% above average volume
          </p>
        </div>

        {/* Capital */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital ($)</label>
          <input
            type="number"
            value={config.initialCapital}
            onChange={(e) => handleChange('initialCapital', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            min="1000" step="1000"
          />
        </div>

        {/* Run Button */}
        <button
          onClick={handleRunDayTrading}
          disabled={isRunning || !isStrategyEnabled}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Day Trading Bot...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run Day Trading Bot
            </>
          )}
        </button>

        {/* Strategy Info */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-yellow-600" />
            50% Win Rate Strategy
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Entry:</strong> Requires 4+ confirmations (BB breakout, RSI momentum, MACD signal, volume, price action, trend)</p>
            <p>• <strong>Exit:</strong> Profit target ({(config.profitTarget * 100).toFixed(1)}%), stop loss ({(config.stopLossPercent * 100).toFixed(1)}%), or signal reversal</p>
            <p>• <strong>Risk/Reward:</strong> ~1.9:1 ratio for positive expectancy</p>
            <p>• <strong>Time Limit:</strong> Maximum {config.maxHoldingPeriod} hours per trade</p>
            <p>• <strong>Selectivity:</strong> High-quality setups only for better win rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}