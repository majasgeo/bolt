import React, { useState, useRef } from 'react';
import { Upload, Download, Database, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { parseCSVToCandles, generateSampleCSV } from '../utils/csvParser';
import { Candle } from '../types/trading';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const csvContent = await file.text();
      const result = parseCSVToCandles(csvContent);

      if (result.success && result.data) {
        // Detect timeframe
        const timeframe = detectTimeframe(result.data);
        const source = `${file.name} (${result.rowCount} candles, ${timeframe})`;
        
        onDataLoaded(result.data, source);
        setUploadStatus({
          type: 'success',
          message: `Successfully loaded ${result.rowCount} candles (${timeframe}) from ${file.name}`
        });
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

  const detectTimeframe = (candles: Candle[]): string => {
    if (candles.length < 2) return 'Unknown';
    
    const timeDiffs = [];
    for (let i = 1; i < Math.min(10, candles.length); i++) {
      timeDiffs.push(candles[i].timestamp - candles[i-1].timestamp);
    }
    
    const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    const seconds = avgDiff / 1000;
    
    if (seconds <= 1.5) return '1-second';
    if (seconds <= 5.5) return '5-second';
    if (seconds <= 15.5) return '15-second';
    if (seconds <= 30.5) return '30-second';
    if (seconds <= 65) return '1-minute';
    if (seconds <= 300.5) return '5-minute';
    if (seconds <= 900.5) return '15-minute';
    if (seconds <= 1830) return '30-minute';
    if (seconds <= 3650) return '1-hour';
    if (seconds <= 14400) return '4-hour';
    if (seconds <= 86500) return '1-day';
    return `${Math.round(seconds)}-second`;
  };

  const downloadSampleCSV = () => {
    const csvContent = generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_trading_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSecondsTimeframeCSV = () => {
    const csvContent = generateSampleCSV(true); // true for seconds timeframe
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_seconds_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentTimeframe = currentDataSource.includes('(') ? 
    currentDataSource.split('(')[1]?.split(')')[0] || 'Unknown timeframe' : 
    'Generated hourly data';

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
              <p className="text-lg font-semibold text-blue-900">{currentDataSource}</p>
              <p className="text-sm text-blue-700">{candleCount.toLocaleString()} candles loaded</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        {/* Timeframe Warning */}
        {currentTimeframe.includes('second') && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">Seconds Timeframe Detected</h4>
                <div className="text-sm text-orange-700 space-y-1">
                  <p>• <strong>Ultra-High Frequency:</strong> Seconds data is ideal for Ultra-Fast Scalping Bot</p>
                  <p>• <strong>Different Parameters:</strong> Use smaller periods (2-5) and tighter stops</p>
                  <p>• <strong>More Trades:</strong> Expect many more trades with micro profits/losses</p>
                  <p>• <strong>Recommendation:</strong> Use Ultra-Fast Scalping Bot with 5-15 second holding times</p>
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

          {/* CSV Format Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">CSV Format Requirements</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Required:</strong> Close price column (close, price)</p>
              <p>• <strong>Optional:</strong> Timestamp, Open, High, Low, Volume</p>
              <p>• <strong>Headers:</strong> First row should contain column names</p>
              <p>• <strong>Timestamp:</strong> Unix timestamp or date string (YYYY-MM-DD HH:mm:ss)</p>
              <p>• <strong>Seconds Data:</strong> Timestamps with seconds precision are fully supported</p>
            </div>
          </div>

          {/* Sample Download */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={downloadSampleCSV}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Sample CSV (Hourly Data)
            </button>
            
            <button
              onClick={downloadSecondsTimeframeCSV}
              className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Sample CSV (Seconds Data)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}