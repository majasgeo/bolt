import React from 'react';
import { BacktestResult } from '../types/trading';
import { TrendingUp, TrendingDown, Target, BarChart3, DollarSign, Percent, Clock, Calendar } from 'lucide-react';

interface MetricsPanelProps {
  results: BacktestResult;
  isRunning: boolean;
  initialCapital: number;
}

export function MetricsPanel({ results, isRunning, initialCapital }: MetricsPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const finalCapital = initialCapital + results.totalPnL;
  const totalReturn = initialCapital > 0 ? (results.totalPnL / initialCapital) : 0;

  if (isRunning) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg font-medium text-gray-600">Running backtest...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <BarChart3 className="mr-2 h-6 w-6 text-blue-600" />
        Backtest Results
      </h3>

      {/* Capital Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Initial Capital</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(initialCapital)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg p-4 ${
          finalCapital >= initialCapital 
            ? 'from-green-50 to-green-100' 
            : 'from-red-50 to-red-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                finalCapital >= initialCapital ? 'text-green-600' : 'text-red-600'
              }`}>Final Capital</p>
              <p className={`text-xl font-bold ${
                finalCapital >= initialCapital ? 'text-green-900' : 'text-red-900'
              }`}>{formatCurrency(finalCapital)}</p>
            </div>
            {finalCapital >= initialCapital ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
        <div className={`bg-gradient-to-br rounded-lg p-4 ${
          totalReturn >= 0 
            ? 'from-green-50 to-green-100' 
            : 'from-red-50 to-red-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>Total Return</p>
              <p className={`text-xl font-bold ${
                totalReturn >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>{formatPercentage(totalReturn)}</p>
            </div>
            <Percent className={`h-8 w-8 ${
              totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
            }`} />
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg p-4 ${
          results.totalPnL >= 0 
            ? 'from-green-50 to-green-100' 
            : 'from-red-50 to-red-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                results.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>Net P&L</p>
              <p className={`text-xl font-bold ${
                results.totalPnL >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>{formatCurrency(results.totalPnL)}</p>
            </div>
            {results.totalPnL >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* Trading Period Information */}
      {results.firstTradeTime && results.lastTradeTime && results.tradingPeriodDays && (
        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Trading Period
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-purple-600">First Trade</p>
              <p className="font-bold text-purple-900">{formatDate(results.firstTradeTime)}</p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Last Trade</p>
              <p className="font-bold text-purple-900">{formatDate(results.lastTradeTime)}</p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Trading Duration</p>
              <p className="font-bold text-purple-900">{formatDuration(results.tradingPeriodDays)}</p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Avg Trades/Day</p>
              <p className="font-bold text-purple-900">{results.averageTradesPerDay?.toFixed(2) || '0'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Trading Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Trades</p>
              <p className="text-2xl font-bold text-blue-900">{results.totalTrades}</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Win Rate</p>
              <p className="text-2xl font-bold text-green-900">{formatPercentage(results.winRate)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Max Drawdown</p>
              <p className="text-xl font-bold text-orange-900">{formatPercentage(results.maxDrawdown)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Trade Breakdown</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Winning Trades:</span>
                <span className="font-medium text-green-600">{results.winningTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Losing Trades:</span>
                <span className="font-medium text-red-600">{results.losingTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sharpe Ratio:</span>
                <span className="font-medium">{results.sharpeRatio.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Long Trades:</span>
                <span className="font-medium text-green-600">{results.longTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Short Trades:</span>
                <span className="font-medium text-red-600">{results.shortTrades}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Recent Trades</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {results.trades.slice(-5).reverse().map((trade, index) => (
              <div key={trade.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">#{results.trades.length - index}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    trade.position === 'long' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.position.toUpperCase()}
                  </span>
                </div>
                <span className={`font-medium ${
                  trade.pnl! > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(trade.pnl!)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}