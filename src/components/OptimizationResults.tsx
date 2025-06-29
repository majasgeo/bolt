import React, { useState } from 'react';
import { OptimizationResult } from '../types/trading';
import { Trophy, TrendingUp, Target, BarChart3, ChevronDown, ChevronUp, Calendar, Clock, Zap, Filter, DollarSign, Timer } from 'lucide-react';

interface OptimizationResultsProps {
  results: OptimizationResult[];
  onSelectConfiguration: (result: OptimizationResult) => void;
}

export function OptimizationResults({ results, onSelectConfiguration }: OptimizationResultsProps) {
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<keyof OptimizationResult>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeFilter, setTimeFilter] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'overall' | 'profit' | 'efficiency'>('overall');

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

  // Filter results by minimum time period
  const filteredResults = results.filter(result => {
    if (timeFilter === 0) return true;
    return result.tradingPeriodDays && result.tradingPeriodDays >= timeFilter;
  });

  // Get best configurations by different criteria
  const getBestConfigurations = () => {
    if (filteredResults.length === 0) return { overall: [], profit: [], efficiency: [] };

    // Best Overall (by score)
    const overall = [...filteredResults].sort((a, b) => b.score - a.score).slice(0, 10);

    // Best Profit (by total return, regardless of time)
    const profit = [...filteredResults].sort((a, b) => b.totalReturn - a.totalReturn).slice(0, 10);

    // Best Efficiency (profit per day)
    const efficiency = [...filteredResults]
      .filter(r => r.tradingPeriodDays && r.tradingPeriodDays > 0)
      .map(r => ({
        ...r,
        profitPerDay: r.totalReturn / (r.tradingPeriodDays || 1)
      }))
      .sort((a, b) => (b as any).profitPerDay - (a as any).profitPerDay)
      .slice(0, 10);

    return { overall, profit, efficiency };
  };

  const bestConfigs = getBestConfigurations();
  
  let currentResults: OptimizationResult[] = [];
  let currentTitle = '';
  let currentIcon = <Trophy className="h-6 w-6" />;
  let currentColor = 'yellow';

  switch (viewMode) {
    case 'overall':
      currentResults = bestConfigs.overall;
      currentTitle = 'Best Overall Configurations (by Score)';
      currentIcon = <Trophy className="h-6 w-6 text-yellow-600" />;
      currentColor = 'yellow';
      break;
    case 'profit':
      currentResults = bestConfigs.profit;
      currentTitle = 'Best Profit Configurations (Regardless of Time)';
      currentIcon = <DollarSign className="h-6 w-6 text-green-600" />;
      currentColor = 'green';
      break;
    case 'efficiency':
      currentResults = bestConfigs.efficiency;
      currentTitle = 'Best Efficiency Configurations (Profit per Day)';
      currentIcon = <Timer className="h-6 w-6 text-blue-600" />;
      currentColor = 'blue';
      break;
  }

  const sortedResults = [...currentResults].sort((a, b) => {
    let aVal: number, bVal: number;
    
    if (viewMode === 'efficiency' && sortBy === 'totalReturn') {
      // For efficiency view, sort by profit per day when totalReturn is selected
      aVal = a.totalReturn / (a.tradingPeriodDays || 1);
      bVal = b.totalReturn / (b.tradingPeriodDays || 1);
    } else {
      aVal = a[sortBy] as number;
      bVal = b[sortBy] as number;
    }
    
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    return (aVal > bVal ? 1 : -1) * multiplier;
  });

  const displayResults = showAll ? sortedResults : sortedResults.slice(0, 10);

  const handleSort = (column: keyof OptimizationResult) => {
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
          {currentIcon}
          <span className="ml-2">Optimization Results</span>
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

      {/* View Mode Selector */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('overall')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'overall'
                ? 'bg-yellow-600 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Trophy className="h-4 w-4 inline mr-1" />
            Best Overall
          </button>
          <button
            onClick={() => setViewMode('profit')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'profit'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <DollarSign className="h-4 w-4 inline mr-1" />
            Best Profit
          </button>
          <button
            onClick={() => setViewMode('efficiency')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'efficiency'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Timer className="h-4 w-4 inline mr-1" />
            Best Efficiency
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">{currentTitle}</p>
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
            {sortedResults.slice(0, 3).map((result, index) => {
              const profitPerDay = viewMode === 'efficiency' && result.tradingPeriodDays 
                ? result.totalReturn / result.tradingPeriodDays 
                : null;
              
              return (
                <div
                  key={`${result.period}-${result.stdDev}-${result.offset}-${result.leverage}`}
                  className={`rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    index === 0 
                      ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300' 
                      : index === 1
                      ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300'
                      : 'bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300'
                  }`}
                  onClick={() => onSelectConfiguration(result)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {index === 0 && <Trophy className="h-5 w-5 text-yellow-600 mr-1" />}
                      <span className="font-bold text-gray-900 ml-1">#{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {viewMode === 'overall' && `Score: ${result.score.toFixed(1)}`}
                      {viewMode === 'profit' && `Return: ${formatPercentage(result.totalReturn)}`}
                      {viewMode === 'efficiency' && profitPerDay && `${formatPercentage(profitPerDay)}/day`}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <p className="text-sm text-gray-600">
                      SMA {result.period} | StdDev {result.stdDev} | Offset {result.offset}
                    </p>
                    <p className="text-sm text-purple-600 font-medium">
                      <Zap className="h-3 w-3 inline mr-1" />
                      {result.leverage}x Leverage
                    </p>
                    <p className={`text-lg font-bold ${
                      result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(result.totalReturn)}
                      {viewMode === 'efficiency' && profitPerDay && (
                        <span className="text-sm text-blue-600 ml-2">
                          ({formatPercentage(profitPerDay)}/day)
                        </span>
                      )}
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
              );
            })}
          </div>

          {/* Detailed Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Rank</th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('period')}
                  >
                    SMA {sortBy === 'period' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('stdDev')}
                  >
                    StdDev {sortBy === 'stdDev' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('offset')}
                  >
                    Offset {sortBy === 'offset' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('leverage')}
                  >
                    Leverage {sortBy === 'leverage' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('totalReturn')}
                  >
                    {viewMode === 'efficiency' ? 'Return/Day' : 'Return'} {sortBy === 'totalReturn' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('winRate')}
                  >
                    Win Rate {sortBy === 'winRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('tradingPeriodDays')}
                  >
                    Period {sortBy === 'tradingPeriodDays' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
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
                {displayResults.map((result, index) => {
                  const profitPerDay = viewMode === 'efficiency' && result.tradingPeriodDays 
                    ? result.totalReturn / result.tradingPeriodDays 
                    : null;
                  
                  return (
                    <tr 
                      key={`${result.period}-${result.stdDev}-${result.offset}-${result.leverage}`}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center">
                          {index === 0 && <Trophy className="h-4 w-4 text-yellow-500 mr-1" />}
                          {sortedResults.indexOf(result) + 1}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium">{result.period}</td>
                      <td className="py-2 px-3">{result.stdDev}</td>
                      <td className="py-2 px-3">{result.offset}</td>
                      <td className="py-2 px-3">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                          {result.leverage}x
                        </span>
                      </td>
                      <td className={`py-2 px-3 font-medium ${
                        result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {viewMode === 'efficiency' && profitPerDay ? (
                          <div>
                            <div>{formatPercentage(profitPerDay)}</div>
                            <div className="text-xs text-gray-500">({formatPercentage(result.totalReturn)} total)</div>
                          </div>
                        ) : (
                          formatPercentage(result.totalReturn)
                        )}
                      </td>
                      <td className="py-2 px-3">{formatPercentage(result.winRate)}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {formatDuration(result.tradingPeriodDays)}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium">{result.score.toFixed(1)}</td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => onSelectConfiguration(result)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Use Config
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Show More/Less Button */}
          {currentResults.length > 10 && (
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
                    Show All {currentResults.length.toLocaleString()} Results
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