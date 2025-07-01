import React, { useState } from 'react';
import { MultiTimeframeOptimizationResult } from '../utils/multiTimeframeOptimizer';
import { Trophy, TrendingUp, Target, BarChart3, ChevronDown, ChevronUp, Calendar, Clock, Zap, Filter, DollarSign, Database } from 'lucide-react';

interface MultiTimeframeResultsProps {
  results: MultiTimeframeOptimizationResult[];
  onSelectConfiguration: (result: MultiTimeframeOptimizationResult) => void;
}

export function MultiTimeframeResults({ results, onSelectConfiguration }: MultiTimeframeResultsProps) {
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<keyof MultiTimeframeOptimizationResult>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
  const [datasetFilter, setDatasetFilter] = useState<string>('all');

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
    if (days < 0.01) { // Less than ~15 minutes
      const minutes = Math.round(days * 24 * 60);
      return `${minutes}m`;
    } else if (days < 1) {
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

  // Get unique timeframes and datasets for filtering
  const uniqueTimeframes = ['all', ...new Set(results.map(r => r.timeframe))];
  const uniqueDatasets = ['all', ...new Set(results.map(r => r.datasetName))];

  // Filter results
  const filteredResults = results.filter(result => {
    if (timeframeFilter !== 'all' && result.timeframe !== timeframeFilter) return false;
    if (datasetFilter !== 'all' && result.datasetName !== datasetFilter) return false;
    return true;
  });

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    return (aVal > bVal ? 1 : -1) * multiplier;
  });

  const displayResults = showAll ? sortedResults : sortedResults.slice(0, 10);

  const handleSort = (column: keyof MultiTimeframeOptimizationResult) => {
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

  // Group results by timeframe for summary
  const resultsByTimeframe = results.reduce((acc, result) => {
    if (!acc[result.timeframe]) {
      acc[result.timeframe] = [];
    }
    acc[result.timeframe].push(result);
    return acc;
  }, {} as Record<string, MultiTimeframeOptimizationResult[]>);

  // Get best result for each timeframe
  const bestByTimeframe = Object.entries(resultsByTimeframe).map(([timeframe, timeframeResults]) => {
    return timeframeResults.sort((a, b) => b.score - a.score)[0];
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <Trophy className="mr-2 h-6 w-6 text-purple-600" />
          <span className="ml-2">Multi-Timeframe Optimization Results</span>
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={timeframeFilter}
              onChange={(e) => setTimeframeFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {uniqueTimeframes.map(tf => (
                <option key={tf} value={tf}>
                  {tf === 'all' ? 'All Timeframes' : tf}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-gray-500" />
            <select
              value={datasetFilter}
              onChange={(e) => setDatasetFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {uniqueDatasets.map(ds => (
                <option key={ds} value={ds}>
                  {ds === 'all' ? 'All Datasets' : ds}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-600">
            {filteredResults.length.toLocaleString()} of {results.length.toLocaleString()} results
          </span>
        </div>
      </div>

      {/* Timeframe Comparison Summary */}
      <div className="mb-8">
        <h4 className="font-semibold text-gray-900 mb-4">Timeframe Comparison</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {bestByTimeframe.map((result) => (
            <div
              key={result.timeframe}
              className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => onSelectConfiguration(result)}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-900">{result.timeframe}</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                  {result.datasetName}
                </span>
              </div>
              
              <p className={`text-lg font-bold ${
                result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(result.totalReturn)}
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div>
                  <span className="text-gray-500">Win Rate:</span>
                  <span className="ml-1 font-medium">{formatPercentage(result.winRate)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Trades:</span>
                  <span className="ml-1 font-medium">{result.totalTrades}</span>
                </div>
                <div>
                  <span className="text-gray-500">SMA:</span>
                  <span className="ml-1 font-medium">{result.period}</span>
                </div>
                <div>
                  <span className="text-gray-500">StdDev:</span>
                  <span className="ml-1 font-medium">{result.stdDev}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 3 Overall Results */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-4">Top Performing Configurations</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedResults.slice(0, 3).map((result, index) => (
            <div
              key={`${result.timeframe}-${result.period}-${result.stdDev}-${result.offset}-${result.leverage}`}
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
                <div className="flex items-center">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded mr-1">
                    {result.timeframe}
                  </span>
                  <span className="text-xs text-gray-600">
                    Score: {result.score.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1 mb-3">
                <p className="text-sm text-gray-600">
                  {result.datasetName}
                </p>
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
      </div>

      {/* Detailed Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-600">Rank</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Dataset</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Timeframe</th>
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
                onClick={() => handleSort('leverage')}
              >
                Leverage {sortBy === 'leverage' && (sortOrder === 'desc' ? '↓' : '↑')}
              </th>
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
              <th 
                className="text-left py-2 px-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleSort('totalTrades')}
              >
                Trades {sortBy === 'totalTrades' && (sortOrder === 'desc' ? '↓' : '↑')}
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
            {displayResults.map((result, index) => (
              <tr 
                key={`${result.timeframe}-${result.period}-${result.stdDev}-${result.offset}-${result.leverage}`}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-2 px-3">
                  <div className="flex items-center">
                    {index === 0 && <Trophy className="h-4 w-4 text-yellow-500 mr-1" />}
                    {sortedResults.indexOf(result) + 1}
                  </div>
                </td>
                <td className="py-2 px-3 font-medium">{result.datasetName}</td>
                <td className="py-2 px-3">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                    {result.timeframe}
                  </span>
                </td>
                <td className="py-2 px-3 font-medium">{result.period}</td>
                <td className="py-2 px-3">{result.stdDev}</td>
                <td className="py-2 px-3">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                    {result.leverage}x
                  </span>
                </td>
                <td className={`py-2 px-3 font-medium ${
                  result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(result.totalReturn)}
                </td>
                <td className="py-2 px-3">{formatPercentage(result.winRate)}</td>
                <td className="py-2 px-3">{result.totalTrades}</td>
                <td className="py-2 px-3 font-medium">{result.score.toFixed(1)}</td>
                <td className="py-2 px-3">
                  <button
                    onClick={() => onSelectConfiguration(result)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
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
    </div>
  );
}