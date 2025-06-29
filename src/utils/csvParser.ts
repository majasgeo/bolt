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

    if (!columnMap.timestamp && !columnMap.date && !columnMap.time) {
      return {
        success: false,
        error: 'Required timestamp/date column not found. CSV must contain timestamp, date, or time column.'
      };
    }

    if (!columnMap.close && !columnMap.price) {
      return {
        success: false,
        error: 'Required close price column not found. CSV must contain close or price column.'
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

    // Log timeframe detection for debugging
    const timeframe = detectTimeframe(candles);
    console.log(`Detected timeframe: ${timeframe}`);
    console.log(`Parsed ${candles.length} candles from CSV`);

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
  date?: string;
  time?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  price?: string;
  volume?: string;
}

function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Timestamp/Date detection
    if (!mapping.timestamp && (
      normalized.includes('time') || 
      normalized === 'timestamp' ||
      normalized === 'datetime'
    )) {
      mapping.timestamp = header;
    }
    
    if (!mapping.date && (
      normalized === 'date' ||
      normalized.includes('date')
    )) {
      mapping.date = header;
    }
    
    if (!mapping.time && (
      normalized === 'time' ||
      normalized.includes('time') && !normalized.includes('timestamp')
    )) {
      mapping.time = header;
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
  } else if (mapping.date && mapping.time) {
    // Combine date and time
    const dateValue = row[mapping.date];
    const timeValue = row[mapping.time];
    if (!dateValue || !timeValue) throw new Error('Missing date or time');
    
    const dateTime = new Date(`${dateValue} ${timeValue}`);
    if (isNaN(dateTime.getTime())) {
      throw new Error(`Invalid date/time format: ${dateValue} ${timeValue}`);
    }
    timestamp = dateTime.getTime();
  } else if (mapping.date) {
    // Date only
    const dateValue = row[mapping.date];
    if (!dateValue) throw new Error('Missing date');
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateValue}`);
    }
    timestamp = date.getTime();
  } else {
    // Use row index as timestamp if no timestamp column
    timestamp = Date.now() - (1000 * 60 * 60 * rowNumber); // Hourly intervals going backwards
  }

  // Parse prices
  const closeField = mapping.close || mapping.price;
  if (!closeField || !row[closeField]) {
    throw new Error('Missing close/price value');
  }
  
  const close = parseFloat(row[closeField]);
  if (isNaN(close) || close <= 0) {
    throw new Error(`Invalid close price: ${row[closeField]}`);
  }

  const open = mapping.open && row[mapping.open] ? parseFloat(row[mapping.open]) : close;
  const high = mapping.high && row[mapping.high] ? parseFloat(row[mapping.high]) : Math.max(open, close);
  const low = mapping.low && row[mapping.low] ? parseFloat(row[mapping.low]) : Math.min(open, close);
  const volume = mapping.volume && row[mapping.volume] ? parseFloat(row[mapping.volume]) : Math.random() * 1000 + 500;

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

function detectTimeframe(candles: Candle[]): string {
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