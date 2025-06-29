import React, { useState } from 'react';
import { DayTradingOptimizationResult } from '../utils/dayTradingOptimizer';
import { Trophy, TrendingUp, Target, BarChart3, ChevronDown, ChevronUp, Calendar, Clock, Zap, Filter } from 'lucide-react';

interface DayTradingResultsProps {
  results: DayTradingOptimizationResult[];
  onSelectConfiguration: (result: DayTradingOptimizationResult) => void;
}

export function DayTradingResults({ results, onSelectConfiguration }: DayTradingResultsProps) {
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<keyof DayTradingOptimizationResult>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeFilter, setTimeFilter] = useState<number>(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDuration = (days?: number) => {
    if (!days) return 'N/A';
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours}h`;
    } else if (days < 30) {
      return `${Math.round(days)}d`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months}mo`;
    } else {
      const years = Math.round(days / 365 * 10) / 10;
      return `${years}y`;
    }
  };

  const filteredResults = results.filter(result => {
    if (timeFilter === 0) return true;
    return result.tradingPeriodDays && result.tradingPeriodDays >= timeFilter;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    return (aVal > bVal ? 1 : -1) * multiplier;
  });

  const displayResults = showAll ? sortedResults : sortedResults.slice(0, 10);

  const handleSort = (column: keyof DayTradingOptimizationResult) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (results.length === 0) {
    return null;
  }

  const timeFilterOptions = [
    { value: 0, label: 'All Results' },
    { value: 1, label: '1+ Day' },
    { value: 7, label: '1+ Week' },
    { value: 30, label: '1+ Month' },
    { value: 90, label: '3+ Months' },
    { value: 180, label: '6+ Months' },
    { value: 365, label: '1+ Year' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <Trophy className="mr-2 h-6 w-6 text-orange-600" />
          Day Trading Optimization Results
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {timeFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-600">
            {filteredResults.length.toLocaleString()} of {results.length.toLocaleString()} results
          </span>
        </div>
      </div>

      {filteredResults.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Results Match Time Filter</h4>
          <p className="text-gray-600">Try selecting a shorter minimum time period or remove the filter to see all results.</p>
        </div>
      ) : (
        <>
          {/* Top 3 Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {sortedResults.slice(0, 3).map((result, index) => (
              <div
                key={`${result.period}-${result.rsiPeriod}-${result.macdFast}-${result.leverage}`}
                className={`rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  index === 0 
                    ? 'bg-gradient-to-br from-orange-50 to-red-100 border-2 border-orange-300' 
                    : index === 1
                    ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300'
                    : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300'
                }`}
                onClick={() => onSelectConfiguration(result)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {index === 0 && <Trophy className="h-5 w-5 text-orange-600 mr-1" />}
                    <span className="font-bold text-gray-900">#{index + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    Score: {result.score.toFixed(1)}
                  </span>
                </div>
                
                <div className="space-y-1 mb-3">
                  <p className="text-xs text-gray-600">
                    BB({result.period},{result.stdDev},{result.offset}) RSI({result.rsiPeriod})
                  </p>
                  <p className="text-xs text-gray-600">
                    MACD({result.macdFast},{result.macdSlow},{result.macdSignal}) Vol({result.volumeThreshold})
                  </p>
                  <p className="text-xs text-purple-600 font-medium">
                    <Zap className="h-3 w-3 inline mr-1" />
                    {result.leverage}x | P/L: {formatPercentage(result.profitTarget)}/{formatPercentage(result.stopLossPercent)}
                  </p>
                  <p className={`text-lg font-bold ${
                    result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(result.totalReturn)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Win Rate:</span>
                    <span className="ml-1 font-medium">{formatPercentage(result.winRate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Trades:</span>
                    <span className="ml-1 font-medium">{result.totalTrades}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Period:</span>
                    <span className="ml-1 font-medium">{formatDuration(result.tradingPeriodDays)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Trades/Day:</span>
                    <span className="ml-1 font-medium">{result.averageTradesPerDay?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Rank</th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('totalReturn')}
                  >
                    Return {sortBy === 'totalReturn' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('winRate')}
                  >
                    Win Rate {sortBy === 'winRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">BB Config</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">RSI</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">MACD</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Risk Mgmt</th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('score')}
                  >
                    Score {sortBy === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((result, index) => (
                  <tr 
                    key={`${result.period}-${result.rsiPeriod}-${result.macdFast}-${result.leverage}`}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center">
                        {index === 0 && <Trophy className="h-4 w-4 text-orange-500 mr-1" />}
                        {sortedResults.indexOf(result) + 1}
                      </div>
                    </td>
                    <td className={`py-2 px-3 font-medium ${
                      result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(result.totalReturn)}
                    </td>
                    <td className="py-2 px-3 font-medium">{formatPercentage(result.winRate)}</td>
                    <td className="py-2 px-3 text-xs">
                      {result.period}/{result.stdDev}/{result.offset}
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {result.rsiPeriod}({result.rsiOverbought}/{result.rsiOversold})
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {result.macdFast}/{result.macdSlow}/{result.macdSignal}
                    </td>
                    <td className="py-2 px-3 text-xs">
                      <div className="space-y-1">
                        <div>{formatPercentage(result.profitTarget)}/{formatPercentage(result.stopLossPercent)}</div>
                        <div className="text-purple-600">{result.leverage}x | {result.maxHoldingPeriod}h</div>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-medium">{result.score.toFixed(1)}</td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => onSelectConfiguration(result)}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Use Config
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Show More/Less Button */}
          {filteredResults.length > 10 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center mx-auto"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show All {filteredResults.length.toLocaleString()} Results
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}