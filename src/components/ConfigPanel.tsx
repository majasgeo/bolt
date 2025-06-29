import React from 'react';
import { TradingConfig } from '../types/trading';
import { Settings, Play, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface ConfigPanelProps {
  config: TradingConfig;
  onConfigChange: (config: TradingConfig) => void;
  onRunBacktest: () => void;
  isRunning: boolean;
}

export function ConfigPanel({ config, onConfigChange, onRunBacktest, isRunning }: ConfigPanelProps) {
  const handleChange = (field: keyof TradingConfig, value: number | boolean) => {
    onConfigChange({
      ...config,
      [field]: value
    });
  };

  const isStrategyEnabled = config.enableLongPositions || config.enableShortPositions;

  // Get timeframe-specific recommendations
  const getRecommendations = () => {
    if (config.period <= 15) {
      return {
        timeframe: "1-5 minute",
        periodRange: "5-15",
        stdDevRange: "1.5-2.5",
        offsetRange: "0-5",
        leverageRange: "2-10x",
        warning: "Short timeframes have more noise and false signals"
      };
    } else if (config.period <= 30) {
      return {
        timeframe: "15-30 minute",
        periodRange: "15-30",
        stdDevRange: "2.0-2.5",
        offsetRange: "0-10",
        leverageRange: "3-15x",
        warning: "Medium timeframes balance signal quality and frequency"
      };
    } else {
      return {
        timeframe: "1+ hour",
        periodRange: "20-50",
        stdDevRange: "2.0-3.0",
        offsetRange: "5-20",
        leverageRange: "5-25x",
        warning: "Longer timeframes have fewer but higher quality signals"
      };
    }
  };

  const recommendations = getRecommendations();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Settings className="mr-2 h-6 w-6 text-blue-600" />
        Trading Configuration
      </h3>

      <div className="space-y-6">
        {/* Timeframe Recommendations */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Current Settings Suggest: {recommendations.timeframe}</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>Recommended Period:</strong> {recommendations.periodRange}</p>
            <p>• <strong>Recommended StdDev:</strong> {recommendations.stdDevRange}</p>
            <p>• <strong>Recommended Offset:</strong> {recommendations.offsetRange}</p>
            <p>• <strong>Recommended Leverage:</strong> {recommendations.leverageRange}</p>
          </div>
          {config.period <= 15 && (
            <div className="mt-2 flex items-start">
              <AlertTriangle className="h-4 w-4 text-orange-600 mr-2 mt-0.5" />
              <p className="text-sm text-orange-700">{recommendations.warning}</p>
            </div>
          )}
        </div>

        {/* Strategy Selection */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Trading Strategy</h4>
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

        {/* Bollinger Bands Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bollinger Bands Period
            </label>
            <input
              type="number"
              value={config.period}
              onChange={(e) => handleChange('period', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="5"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {config.period} (Recommended: {recommendations.periodRange})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard Deviation
            </label>
            <input
              type="number"
              step="0.1"
              value={config.stdDev}
              onChange={(e) => handleChange('stdDev', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0.5"
              max="5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {config.stdDev} (Recommended: {recommendations.stdDevRange})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offset
            </label>
            <input
              type="number"
              value={config.offset}
              onChange={(e) => handleChange('offset', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {config.offset} (Recommended: {recommendations.offsetRange})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Leverage
            </label>
            <input
              type="number"
              value={config.maxLeverage}
              onChange={(e) => handleChange('maxLeverage', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="2"
              max="125"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {config.maxLeverage}x (Recommended: {recommendations.leverageRange})
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Capital ($)
          </label>
          <input
            type="number"
            value={config.initialCapital}
            onChange={(e) => handleChange('initialCapital', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1000"
            step="1000"
          />
        </div>

        <button
          onClick={onRunBacktest}
          disabled={isRunning || !isStrategyEnabled}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Backtest...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Run Backtest
            </>
          )}
        </button>
      </div>
    </div>
  );
}