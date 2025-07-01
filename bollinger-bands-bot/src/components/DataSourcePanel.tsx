import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Database, FileText, AlertCircle, CheckCircle, Clock, Settings, RefreshCw } from 'lucide-react';
import { parseCSVData, generateSampleCSV, generateSampleTickData, TIMEFRAME_OPTIONS, aggregateTicksToCandles } from '../utils/csvParser';
import { Candle, TickData, CSVColumnMapping, TimeframeOption, AssetInfo } from '../types/trading';

interface DataSourcePanelProps {
  onDataLoaded: (candles: Candle[], source: string) => void;
  currentDataSource: string;
  candleCount: number;
}

export function DataSourcePanel({ onDataLoaded, currentDataSource, candleCount }: DataSourcePanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({});
  const [hasCustomMapping, setHasCustomMapping] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('');
  const [rawData, setRawData] = useState<Candle[] | TickData[] | null>(null);
  const [dataType, setDataType] = useState<'candle' | 'tick'>('candle');
  const [assetInfo, setAssetInfo] = useState<AssetInfo>({
    name: 'Unknown',
    type: 'crypto',
    symbol: 'UNKNOWN'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });
    setRawData(null);
    setDataType('candle');
    setColumnMapping({});
    setHasCustomMapping(false);

    try {
      const csvContent = await file.text();
      const result = parseCSVData(csvContent);

      if (result.success && result.data) {
        // Store raw data and metadata
        setRawData(result.data);
        setDataType(result.dataType);
        setColumnMapping(result.columnMapping);
        
        // Set detected timeframe
        if (result.detectedTimeframe) {
          setSelectedTimeframe(result.detectedTimeframe);
        }
        
        // Set asset info if available
        if (result.assetName) {
          setAssetInfo({
            ...assetInfo,
            name: result.assetName,
            symbol: result.assetName
          });
        } else {
          // Try to extract from filename
          const filenameParts = file.name.split('.');
          if (filenameParts.length > 1) {
            const possibleSymbol = filenameParts[0].toUpperCase();
            setAssetInfo({
              ...assetInfo,
              name: possibleSymbol,
              symbol: possibleSymbol
            });
          }
        }
        
        // Process data based on type
        if (result.dataType === 'tick') {
          // For tick data, we need to aggregate to candles
          const tickData = result.data as TickData[];
          const timeframeOption = TIMEFRAME_OPTIONS.find(t => t.value === '1m') || TIMEFRAME_OPTIONS[4]; // Default to 1m
          const candles = aggregateTicksToCandles(tickData, timeframeOption.seconds);
          
          const source = `${file.name} (${result.rowCount} ticks → ${candles.length} candles, ${timeframeOption.label})`;
          onDataLoaded(candles, source);
          
          setUploadStatus({
            type: 'success',
            message: `Successfully loaded ${result.rowCount} ticks and converted to ${candles.length} candles (${timeframeOption.label}) from ${file.name}`
          });
        } else {
          // For candle data, use as-is
          const candles = result.data as Candle[];
          const timeframe = result.detectedTimeframe || 'Unknown';
          const source = `${file.name} (${result.rowCount} candles, ${timeframe})`;
          
          onDataLoaded(candles, source);
          setUploadStatus({
            type: 'success',
            message: `Successfully loaded ${result.rowCount} candles (${timeframe}) from ${file.name}`
          });
        }
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || 'Failed to parse CSV file'
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // When timeframe changes for tick data, reaggregate
  useEffect(() => {
    if (rawData && dataType === 'tick' && selectedTimeframe) {
      const timeframeOption = TIMEFRAME_OPTIONS.find(t => t.value === selectedTimeframe);
      if (timeframeOption) {
        const tickData = rawData as TickData[];
        const candles = aggregateTicksToCandles(tickData, timeframeOption.seconds);
        
        const source = `${currentDataSource.split('(')[0] || 'Data'} (${tickData.length} ticks → ${candles.length} candles, ${timeframeOption.label})`;
        onDataLoaded(candles, source);
        
        setUploadStatus({
          type: 'success',
          message: `Converted ${tickData.length} ticks to ${candles.length} candles (${timeframeOption.label})`
        });
      }
    }
  }, [selectedTimeframe, rawData, dataType]);

  const handleCustomMappingChange = (field: keyof CSVColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value
    }));
    setHasCustomMapping(true);
  };

  const applyCustomMapping = () => {
    if (!rawData || !hasCustomMapping) return;
    
    setIsUploading(true);
    
    try {
      if (dataType === 'tick') {
        // Re-parse tick data with new mapping
        const tickData = rawData as TickData[];
        // TODO: Implement custom mapping for tick data
        
        // Then reaggregate to candles
        const timeframeOption = TIMEFRAME_OPTIONS.find(t => t.value === selectedTimeframe) || TIMEFRAME_OPTIONS[4];
        const candles = aggregateTicksToCandles(tickData, timeframeOption.seconds);
        
        const source = `Custom Mapped Data (${tickData.length} ticks → ${candles.length} candles, ${timeframeOption.label})`;
        onDataLoaded(candles, source);
        
        setUploadStatus({
          type: 'success',
          message: `Applied custom mapping and converted to ${candles.length} candles (${timeframeOption.label})`
        });
      } else {
        // Re-parse candle data with new mapping
        const candles = rawData as Candle[];
        // TODO: Implement custom mapping for candle data
        
        const source = `Custom Mapped Data (${candles.length} candles)`;
        onDataLoaded(candles, source);
        
        setUploadStatus({
          type: 'success',
          message: `Applied custom mapping to ${candles.length} candles`
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: `Error applying custom mapping: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleCSV = (assetType: 'crypto' | 'stock' | 'forex' | 'commodity') => {
    const csvContent = generateSampleCSV(false, assetType);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${assetType}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSecondsTimeframeCSV = (assetType: 'crypto' | 'stock' | 'forex' | 'commodity') => {
    const csvContent = generateSampleCSV(true, assetType);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${assetType}_seconds_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSampleTickData = (assetType: 'crypto' | 'stock' | 'forex') => {
    const csvContent = generateSampleTickData(assetType);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${assetType}_tick_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentTimeframe = currentDataSource.includes('(') ? 
    currentDataSource.split('(')[1]?.split(')')[0]?.split(',')[1]?.trim() || 'Unknown timeframe' : 
    'Unknown timeframe';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <Database className="mr-2 h-6 w-6 text-blue-600" />
        Data Source
      </h3>

      <div className="space-y-6">
        {/* Current Data Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Current Dataset</p>
              <p className="text-lg font-semibold text-blue-900">{currentDataSource || 'No data loaded'}</p>
              <p className="text-sm text-blue-700">{candleCount.toLocaleString()} candles loaded</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        {/* Timeframe Selector (for tick data) */}
        {dataType === 'tick' && rawData && (
          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 mb-2 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 text-indigo-600" />
              Tick Data Aggregation
            </h4>
            <div className="text-sm text-indigo-700 mb-3">
              <p>Convert tick data to candles by selecting a timeframe:</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {TIMEFRAME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (rawData && dataType === 'tick' && selectedTimeframe) {
                    const timeframeOption = TIMEFRAME_OPTIONS.find(t => t.value === selectedTimeframe);
                    if (timeframeOption) {
                      const tickData = rawData as TickData[];
                      const candles = aggregateTicksToCandles(tickData, timeframeOption.seconds);
                      
                      const source = `${currentDataSource.split('(')[0] || 'Data'} (${tickData.length} ticks → ${candles.length} candles, ${timeframeOption.label})`;
                      onDataLoaded(candles, source);
                      
                      setUploadStatus({
                        type: 'success',
                        message: `Converted ${tickData.length} ticks to ${candles.length} candles (${timeframeOption.label})`
                      });
                    }
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Apply Timeframe
              </button>
            </div>
          </div>
        )}

        {/* Asset Information */}
        {rawData && (
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              Asset Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Asset Symbol</label>
                <input
                  type="text"
                  value={assetInfo.symbol}
                  onChange={(e) => setAssetInfo({...assetInfo, symbol: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Asset Type</label>
                <select
                  value={assetInfo.type}
                  onChange={(e) => setAssetInfo({...assetInfo, type: e.target.value as any})}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="crypto">Cryptocurrency</option>
                  <option value="stock">Stock</option>
                  <option value="forex">Forex</option>
                  <option value="commodity">Commodity</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Timeframe Warning */}
        {currentTimeframe.includes('second') && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">Seconds Timeframe Detected</h4>
                <div className="text-sm text-orange-700 space-y-1">
                  <p>• <strong>Different Parameters:</strong> Use smaller periods (2-5) and tighter stops</p>
                  <p>• <strong>More Trades:</strong> Expect many more trades with micro profits/losses</p>
                  <p>• <strong>Recommendation:</strong> Use smaller Bollinger Band periods (3-8) for seconds data</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {currentTimeframe.includes('1-minute') && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">1-Minute Data Detected</h4>
                <div className="text-sm text-orange-700 space-y-1">
                  <p>• <strong>High Noise:</strong> 1-minute data contains more false signals</p>
                  <p>• <strong>Different Parameters:</strong> Strategies need different settings for 1-min vs hourly</p>
                  <p>• <strong>More Trades:</strong> Expect many more trades with smaller profits/losses</p>
                  <p>• <strong>Recommendation:</strong> Use smaller Bollinger Band periods (5-15) and tighter stops</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeframe Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Clock className="h-5 w-5 text-gray-600 mr-2" />
            <h4 className="font-semibold text-gray-900">Timeframe Information</h4>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Current:</strong> {currentTimeframe}</p>
            <p><strong>Recommended Bollinger Periods:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• <strong>1-second:</strong> Period 3-5, StdDev 1.5-2.0</li>
              <li>• <strong>5-second:</strong> Period 5-8, StdDev 1.5-2.0</li>
              <li>• <strong>1-minute:</strong> Period 5-15, StdDev 1.5-2.5</li>
              <li>• <strong>5-minute:</strong> Period 10-20, StdDev 2.0</li>
              <li>• <strong>1-hour:</strong> Period 20-50, StdDev 2.0-3.0</li>
              <li>• <strong>Daily:</strong> Period 20-30, StdDev 2.0</li>
            </ul>
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Click to upload your CSV file or drag and drop
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Choose File'
                )}
              </button>
            </div>
          </div>

          {/* Upload Status */}
          {uploadStatus.type && (
            <div className={`flex items-center p-3 rounded-lg ${
              uploadStatus.type === 'success' 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {uploadStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              <span className="text-sm">{uploadStatus.message}</span>
            </div>
          )}

          {/* Advanced Settings Toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Settings className="h-4 w-4 mr-1" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              {/* Column Mapping */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Custom Column Mapping</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp Column</label>
                    <input
                      type="text"
                      value={columnMapping.timestamp || ''}
                      onChange={(e) => handleCustomMappingChange('timestamp', e.target.value)}
                      placeholder="timestamp, time, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Column</label>
                    <input
                      type="text"
                      value={columnMapping.date || ''}
                      onChange={(e) => handleCustomMappingChange('date', e.target.value)}
                      placeholder="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Open Column</label>
                    <input
                      type="text"
                      value={columnMapping.open || ''}
                      onChange={(e) => handleCustomMappingChange('open', e.target.value)}
                      placeholder="open"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">High Column</label>
                    <input
                      type="text"
                      value={columnMapping.high || ''}
                      onChange={(e) => handleCustomMappingChange('high', e.target.value)}
                      placeholder="high"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Low Column</label>
                    <input
                      type="text"
                      value={columnMapping.low || ''}
                      onChange={(e) => handleCustomMappingChange('low', e.target.value)}
                      placeholder="low"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Close Column</label>
                    <input
                      type="text"
                      value={columnMapping.close || ''}
                      onChange={(e) => handleCustomMappingChange('close', e.target.value)}
                      placeholder="close, price, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume Column</label>
                    <input
                      type="text"
                      value={columnMapping.volume || ''}
                      onChange={(e) => handleCustomMappingChange('volume', e.target.value)}
                      placeholder="volume, vol, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bid Column (Tick Data)</label>
                    <input
                      type="text"
                      value={columnMapping.bid || ''}
                      onChange={(e) => handleCustomMappingChange('bid', e.target.value)}
                      placeholder="bid"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ask Column (Tick Data)</label>
                    <input
                      type="text"
                      value={columnMapping.ask || ''}
                      onChange={(e) => handleCustomMappingChange('ask', e.target.value)}
                      placeholder="ask, offer, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={applyCustomMapping}
                    disabled={!hasCustomMapping || !rawData}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Apply Custom Mapping
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">CSV Format Support</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Universal Support:</strong> Crypto, Stocks, Forex, Commodities</p>
              <p>• <strong>Data Types:</strong> OHLCV candles or tick data (bid/ask/last)</p>
              <p>• <strong>Timeframes:</strong> Seconds, minutes, hours, days - any granularity</p>
              <p>• <strong>Headers:</strong> Automatic column detection with custom mapping option</p>
              <p>• <strong>Timestamps:</strong> Unix timestamps or date strings (YYYY-MM-DD HH:mm:ss)</p>
            </div>
          </div>

          {/* Sample Download */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 mb-2">Sample Data Files</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-3">
                <h5 className="font-medium text-blue-800 mb-2">Cryptocurrency</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => downloadSampleCSV('crypto')}
                    className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    BTC/USDT Hourly
                  </button>
                  <button
                    onClick={() => downloadSecondsTimeframeCSV('crypto')}
                    className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    BTC/USDT Seconds
                  </button>
                  <button
                    onClick={() => downloadSampleTickData('crypto')}
                    className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    BTC/USDT Ticks
                  </button>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <h5 className="font-medium text-green-800 mb-2">Stocks</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => downloadSampleCSV('stock')}
                    className="w-full bg-green-100 hover:bg-green-200 text-green-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    AAPL Hourly
                  </button>
                  <button
                    onClick={() => downloadSecondsTimeframeCSV('stock')}
                    className="w-full bg-green-100 hover:bg-green-200 text-green-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    AAPL Seconds
                  </button>
                  <button
                    onClick={() => downloadSampleTickData('stock')}
                    className="w-full bg-green-100 hover:bg-green-200 text-green-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    AAPL Ticks
                  </button>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-3">
                <h5 className="font-medium text-purple-800 mb-2">Forex</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => downloadSampleCSV('forex')}
                    className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    EUR/USD Hourly
                  </button>
                  <button
                    onClick={() => downloadSecondsTimeframeCSV('forex')}
                    className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    EUR/USD Seconds
                  </button>
                  <button
                    onClick={() => downloadSampleTickData('forex')}
                    className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    EUR/USD Ticks
                  </button>
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-3">
                <h5 className="font-medium text-yellow-800 mb-2">Commodities</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => downloadSampleCSV('commodity')}
                    className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Gold (XAU/USD) Hourly
                  </button>
                  <button
                    onClick={() => downloadSecondsTimeframeCSV('commodity')}
                    className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Gold (XAU/USD) Seconds
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}