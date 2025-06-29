import Papa from 'papaparse';
import { Candle } from '../types/trading';

export interface CSVRow {
  [key: string]: string;
}

export interface CSVParseResult {
  success: boolean;
  data?: Candle[];
  error?: string;
  rowCount?: number;
}

export function parseCSVToCandles(csvContent: string): CSVParseResult {
  try {
    const parseResult = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    });

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        error: `CSV parsing error: ${parseResult.errors[0].message}`
      };
    }

    const rows = parseResult.data;
    if (rows.length === 0) {
      return {
        success: false,
        error: 'CSV file is empty or contains no valid data'
      };
    }

    // Detect column mappings
    const headers = Object.keys(rows[0]);
    const columnMap = detectColumnMapping(headers);

    if (!columnMap.timestamp || !columnMap.close) {
      return {
        success: false,
        error: 'Required columns not found. CSV must contain timestamp/date and close price columns.'
      };
    }

    const candles: Candle[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const candle = parseRowToCandle(row, columnMap, i + 2); // +2 for header and 1-based indexing
        if (candle) {
          candles.push(candle);
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (errors.length > 10) break; // Limit error reporting
      }
    }

    if (candles.length === 0) {
      return {
        success: false,
        error: `No valid candles could be parsed. Errors: ${errors.slice(0, 3).join(', ')}`
      };
    }

    // Sort by timestamp
    candles.sort((a, b) => a.timestamp - b.timestamp);

    return {
      success: true,
      data: candles,
      rowCount: candles.length
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

interface ColumnMapping {
  timestamp?: string;
  open?: string;
  high?: string;
  low?: string;
  close: string;
  volume?: string;
}

function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { close: '' };

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
    
    // Timestamp/Date detection
    if (!mapping.timestamp && (
      normalized.includes('time') || 
      normalized.includes('date') || 
      normalized === 'timestamp' ||
      normalized === 'datetime'
    )) {
      mapping.timestamp = header;
    }
    
    // OHLC detection
    if (!mapping.open && (normalized === 'open' || normalized.includes('open'))) {
      mapping.open = header;
    }
    if (!mapping.high && (normalized === 'high' || normalized.includes('high'))) {
      mapping.high = header;
    }
    if (!mapping.low && (normalized === 'low' || normalized.includes('low'))) {
      mapping.low = header;
    }
    if (!mapping.close && (
      normalized === 'close' || 
      normalized.includes('close') || 
      normalized === 'price' ||
      normalized.includes('price')
    )) {
      mapping.close = header;
    }
    
    // Volume detection
    if (!mapping.volume && (normalized === 'volume' || normalized.includes('vol'))) {
      mapping.volume = header;
    }
  }

  return mapping;
}

function parseRowToCandle(row: CSVRow, mapping: ColumnMapping, rowNumber: number): Candle | null {
  // Parse timestamp
  let timestamp: number;
  if (mapping.timestamp) {
    const timeValue = row[mapping.timestamp];
    if (!timeValue) throw new Error('Missing timestamp');
    
    // Try parsing as Unix timestamp first
    const unixTime = parseInt(timeValue);
    if (!isNaN(unixTime) && unixTime > 1000000000) {
      timestamp = unixTime * (unixTime < 10000000000 ? 1000 : 1); // Convert seconds to milliseconds if needed
    } else {
      // Try parsing as date string
      const date = new Date(timeValue);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid timestamp format: ${timeValue}`);
      }
      timestamp = date.getTime();
    }
  } else {
    // Use row index as timestamp if no timestamp column
    timestamp = Date.now() - (1000 * 60 * 60 * rowNumber); // Hourly intervals going backwards
  }

  // Parse prices
  const close = parseFloat(row[mapping.close]);
  if (isNaN(close) || close <= 0) {
    throw new Error(`Invalid close price: ${row[mapping.close]}`);
  }

  const open = mapping.open ? parseFloat(row[mapping.open]) : close;
  const high = mapping.high ? parseFloat(row[mapping.high]) : close;
  const low = mapping.low ? parseFloat(row[mapping.low]) : close;
  const volume = mapping.volume ? parseFloat(row[mapping.volume]) : Math.random() * 1000 + 500;

  // Validate OHLC relationships
  const maxPrice = Math.max(open, close);
  const minPrice = Math.min(open, close);
  
  return {
    timestamp,
    open: isNaN(open) ? close : open,
    high: isNaN(high) ? maxPrice : Math.max(high, maxPrice),
    low: isNaN(low) ? minPrice : Math.min(low, minPrice),
    close,
    volume: isNaN(volume) ? Math.random() * 1000 + 500 : volume
  };
}

export function generateSampleCSV(secondsTimeframe: boolean = false): string {
  const headers = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
  const rows = [headers.join(',')];
  
  let price = 100;
  const startTime = Date.now() - (secondsTimeframe ? (3 * 60 * 60 * 1000) : (30 * 24 * 60 * 60 * 1000)); // 3 hours for seconds, 30 days for hourly
  const interval = secondsTimeframe ? 1000 : (60 * 60 * 1000); // 1 second or 1 hour
  const count = secondsTimeframe ? 10800 : 720; // 3 hours of seconds or 30 days of hourly
  const volatility = secondsTimeframe ? 0.0005 : 0.01; // Lower volatility for seconds data
  
  for (let i = 0; i < count; i++) {
    const timestamp = startTime + (i * interval);
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = Math.floor(Math.random() * 1000 + 500);
    
    rows.push([timestamp, open.toFixed(4), high.toFixed(4), low.toFixed(4), close.toFixed(4), volume].join(','));
    price = close;
  }
  
  return rows.join('\n');
}