import Papa from 'papaparse';
import { Candle, TickData, CSVColumnMapping, TimeframeOption } from '../types/trading';
import { format } from 'date-fns';

export interface CSVRow {
  [key: string]: string;
}

export interface CSVParseResult {
  success: boolean;
  data?: Candle[] | TickData[];
  error?: string;
  rowCount?: number;
  dataType: 'candle' | 'tick';
  columnMapping: CSVColumnMapping;
  detectedTimeframe?: string;
  assetName?: string;
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { value: '1s', label: '1 Second', seconds: 1 },
  { value: '5s', label: '5 Seconds', seconds: 5 },
  { value: '15s', label: '15 Seconds', seconds: 15 },
  { value: '30s', label: '30 Seconds', seconds: 30 },
  { value: '1m', label: '1 Minute', seconds: 60 },
  { value: '5m', label: '5 Minutes', seconds: 300 },
  { value: '15m', label: '15 Minutes', seconds: 900 },
  { value: '30m', label: '30 Minutes', seconds: 1800 },
  { value: '1h', label: '1 Hour', seconds: 3600 },
  { value: '4h', label: '4 Hours', seconds: 14400 },
  { value: '1d', label: '1 Day', seconds: 86400 },
  { value: '1w', label: '1 Week', seconds: 604800 }
];

export function parseCSVData(csvContent: string): CSVParseResult {
  try {
    const parseResult = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    });

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        error: `CSV parsing error: ${parseResult.errors[0].message}`,
        dataType: 'candle',
        columnMapping: {}
      };
    }

    const rows = parseResult.data;
    if (rows.length === 0) {
      return {
        success: false,
        error: 'CSV file is empty or contains no valid data',
        dataType: 'candle',
        columnMapping: {}
      };
    }

    // Detect column mappings
    const headers = Object.keys(rows[0]);
    const columnMap = detectColumnMapping(headers);

    if (!columnMap.timestamp && !columnMap.date && !columnMap.time) {
      return {
        success: false,
        error: 'Required timestamp/date column not found. CSV must contain timestamp, date, or time column.',
        dataType: 'candle',
        columnMapping: columnMap
      };
    }

    if (!columnMap.close && !columnMap.price && !columnMap.bid && !columnMap.ask && !columnMap.last) {
      return {
        success: false,
        error: 'Required price column not found. CSV must contain close, price, last, bid, or ask column.',
        dataType: 'candle',
        columnMapping: columnMap
      };
    }

    // Determine if this is candle data or tick data
    const isTickData = !columnMap.open && !columnMap.high && !columnMap.low && 
                      (columnMap.price || columnMap.last || (columnMap.bid && columnMap.ask));
    
    const dataType = isTickData ? 'tick' : 'candle';
    
    // Try to detect asset name from filename or headers
    const assetName = detectAssetName(headers, rows[0]);
    
    // Parse rows based on data type
    if (isTickData) {
      const tickData = parseTickData(rows, columnMap);
      const detectedTimeframe = detectTimeframeFromTicks(tickData);
      
      return {
        success: true,
        data: tickData,
        rowCount: tickData.length,
        dataType: 'tick',
        columnMapping: columnMap,
        detectedTimeframe,
        assetName
      };
    } else {
      const candles = parseCandleData(rows, columnMap);
      const detectedTimeframe = detectTimeframe(candles);
      
      return {
        success: true,
        data: candles,
        rowCount: candles.length,
        dataType: 'candle',
        columnMapping: columnMap,
        detectedTimeframe,
        assetName
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      dataType: 'candle',
      columnMapping: {}
    };
  }
}

function detectColumnMapping(headers: string[]): CSVColumnMapping {
  const mapping: CSVColumnMapping = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Asset/Symbol detection
    if (!mapping.symbol && (
      normalized === 'symbol' || 
      normalized === 'ticker' || 
      normalized === 'asset' ||
      normalized === 'pair' ||
      normalized === 'instrument'
    )) {
      mapping.symbol = header;
    }
    
    // Exchange detection
    if (!mapping.exchange && (
      normalized === 'exchange' || 
      normalized === 'market' || 
      normalized === 'venue'
    )) {
      mapping.exchange = header;
    }
    
    // Timestamp/Date detection
    if (!mapping.timestamp && (
      normalized.includes('time') || 
      normalized === 'timestamp' ||
      normalized === 'datetime' ||
      normalized === 'ts'
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
      normalized.includes('close')
    )) {
      mapping.close = header;
    }
    
    // Price detection (for tick data)
    if (!mapping.price && (
      normalized === 'price' ||
      normalized.includes('price')
    )) {
      mapping.price = header;
    }
    
    if (!mapping.last && (
      normalized === 'last' ||
      normalized.includes('last') ||
      normalized.includes('lastprice')
    )) {
      mapping.last = header;
    }
    
    // Bid/Ask detection (for tick data)
    if (!mapping.bid && (
      normalized === 'bid' ||
      normalized.includes('bid')
    )) {
      mapping.bid = header;
    }
    
    if (!mapping.ask && (
      normalized === 'ask' ||
      normalized.includes('ask') ||
      normalized.includes('offer')
    )) {
      mapping.ask = header;
    }
    
    // Volume detection
    if (!mapping.volume && (
      normalized === 'volume' || 
      normalized.includes('vol') || 
      normalized.includes('size') ||
      normalized.includes('quantity')
    )) {
      mapping.volume = header;
    }
  }

  return mapping;
}

function parseCandleData(rows: CSVRow[], mapping: CSVColumnMapping): Candle[] {
  const candles: Candle[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const candle = parseRowToCandle(rows[i], mapping, i + 2);
      if (candle) {
        candles.push(candle);
      }
    } catch (error) {
      errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (errors.length > 10) break; // Limit error reporting
    }
  }

  if (candles.length === 0 && errors.length > 0) {
    console.error(`Failed to parse candle data: ${errors.slice(0, 3).join(', ')}`);
  }

  // Sort by timestamp
  candles.sort((a, b) => a.timestamp - b.timestamp);
  
  return candles;
}

function parseTickData(rows: CSVRow[], mapping: CSVColumnMapping): TickData[] {
  const ticks: TickData[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const tick = parseRowToTick(rows[i], mapping, i + 2);
      if (tick) {
        ticks.push(tick);
      }
    } catch (error) {
      errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (errors.length > 10) break; // Limit error reporting
    }
  }

  if (ticks.length === 0 && errors.length > 0) {
    console.error(`Failed to parse tick data: ${errors.slice(0, 3).join(', ')}`);
  }

  // Sort by timestamp
  ticks.sort((a, b) => a.timestamp - b.timestamp);
  
  return ticks;
}

function parseRowToCandle(row: CSVRow, mapping: CSVColumnMapping, rowNumber: number): Candle | null {
  // Parse timestamp
  const timestamp = parseTimestamp(row, mapping, rowNumber);

  // Parse prices
  const closeField = mapping.close || mapping.price || mapping.last;
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
  const volume = mapping.volume && row[mapping.volume] ? parseFloat(row[mapping.volume]) : 0;

  // Validate OHLC relationships
  const maxPrice = Math.max(open, close);
  const minPrice = Math.min(open, close);
  
  return {
    timestamp,
    open: isNaN(open) ? close : open,
    high: isNaN(high) ? maxPrice : Math.max(high, maxPrice),
    low: isNaN(low) ? minPrice : Math.min(low, minPrice),
    close,
    volume: isNaN(volume) ? 0 : volume
  };
}

function parseRowToTick(row: CSVRow, mapping: CSVColumnMapping, rowNumber: number): TickData | null {
  // Parse timestamp
  const timestamp = parseTimestamp(row, mapping, rowNumber);

  // Parse price data
  let price: number | undefined;
  let bid: number | undefined;
  let ask: number | undefined;
  
  // Try to get price from various fields
  if (mapping.price && row[mapping.price]) {
    price = parseFloat(row[mapping.price]);
  } else if (mapping.last && row[mapping.last]) {
    price = parseFloat(row[mapping.last]);
  } else if (mapping.close && row[mapping.close]) {
    price = parseFloat(row[mapping.close]);
  }
  
  // Try to get bid/ask
  if (mapping.bid && row[mapping.bid]) {
    bid = parseFloat(row[mapping.bid]);
  }
  
  if (mapping.ask && row[mapping.ask]) {
    ask = parseFloat(row[mapping.ask]);
  }
  
  // If we have bid/ask but no price, calculate mid price
  if (!price && bid && ask) {
    price = (bid + ask) / 2;
  }
  
  if (!price && !bid && !ask) {
    throw new Error('No valid price data found');
  }
  
  // Parse volume if available
  const volume = mapping.volume && row[mapping.volume] ? parseFloat(row[mapping.volume]) : undefined;
  
  return {
    timestamp,
    price: price || (bid && ask ? (bid + ask) / 2 : 0),
    bid,
    ask,
    volume
  };
}

function parseTimestamp(row: CSVRow, mapping: CSVColumnMapping, rowNumber: number): number {
  if (mapping.timestamp) {
    const timeValue = row[mapping.timestamp];
    if (!timeValue) throw new Error('Missing timestamp');
    
    // Try parsing as Unix timestamp first
    const unixTime = parseInt(timeValue);
    if (!isNaN(unixTime) && unixTime > 1000000000) {
      return unixTime * (unixTime < 10000000000 ? 1000 : 1); // Convert seconds to milliseconds if needed
    } else {
      // Try parsing as date string
      const date = new Date(timeValue);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid timestamp format: ${timeValue}`);
      }
      return date.getTime();
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
    return dateTime.getTime();
  } else if (mapping.date) {
    // Date only
    const dateValue = row[mapping.date];
    if (!dateValue) throw new Error('Missing date');
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateValue}`);
    }
    return date.getTime();
  } else {
    // Use row index as timestamp if no timestamp column
    return Date.now() - (1000 * 60 * 60 * rowNumber); // Hourly intervals going backwards
  }
}

function detectAssetName(headers: string[], firstRow: CSVRow): string | undefined {
  // Try to find asset name from symbol column
  for (const header of headers) {
    const normalized = header.toLowerCase();
    if (normalized.includes('symbol') || 
        normalized.includes('ticker') || 
        normalized.includes('asset') || 
        normalized.includes('pair') || 
        normalized.includes('instrument')) {
      const value = firstRow[header];
      if (value) return value.toUpperCase();
    }
  }
  
  // Try to find from filename or other context
  return undefined;
}

export function detectTimeframe(candles: Candle[]): string {
  if (candles.length < 2) return 'Unknown';
  
  const timeDiffs = [];
  for (let i = 1; i < Math.min(10, candles.length); i++) {
    timeDiffs.push(candles[i].timestamp - candles[i-1].timestamp);
  }
  
  const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
  const seconds = avgDiff / 1000;
  
  if (seconds <= 1.5) return '1s';
  if (seconds <= 5.5) return '5s';
  if (seconds <= 15.5) return '15s';
  if (seconds <= 30.5) return '30s';
  if (seconds <= 65) return '1m';
  if (seconds <= 300.5) return '5m';
  if (seconds <= 900.5) return '15m';
  if (seconds <= 1830) return '30m';
  if (seconds <= 3650) return '1h';
  if (seconds <= 14400) return '4h';
  if (seconds <= 86500) return '1d';
  return '1w';
}

function detectTimeframeFromTicks(ticks: TickData[]): string {
  if (ticks.length < 2) return 'Unknown';
  
  // For tick data, we look at the average time between ticks
  const timeDiffs = [];
  for (let i = 1; i < Math.min(100, ticks.length); i++) {
    timeDiffs.push(ticks[i].timestamp - ticks[i-1].timestamp);
  }
  
  const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
  const milliseconds = avgDiff;
  
  if (milliseconds < 100) return 'tick';
  if (milliseconds < 1000) return 'ms100';
  if (milliseconds < 5000) return '1s';
  return '5s';
}

export function aggregateTicksToCandles(ticks: TickData[], timeframeSeconds: number): Candle[] {
  if (ticks.length === 0) return [];
  
  const candles: Candle[] = [];
  const msPerCandle = timeframeSeconds * 1000;
  
  // Sort ticks by timestamp
  ticks.sort((a, b) => a.timestamp - b.timestamp);
  
  // Determine start time (round down to nearest timeframe boundary)
  const firstTimestamp = ticks[0].timestamp;
  const startTime = Math.floor(firstTimestamp / msPerCandle) * msPerCandle;
  
  let currentCandle: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    tickCount: number;
  } | null = null;
  
  for (const tick of ticks) {
    const candleTimestamp = Math.floor(tick.timestamp / msPerCandle) * msPerCandle;
    
    // Get the price from the tick
    const price = tick.price || (tick.bid && tick.ask ? (tick.bid + tick.ask) / 2 : 0);
    if (!price) continue;
    
    // If this is a new candle or the first tick
    if (!currentCandle || candleTimestamp > currentCandle.timestamp) {
      // Save the previous candle if it exists
      if (currentCandle) {
        candles.push({
          timestamp: currentCandle.timestamp,
          open: currentCandle.open,
          high: currentCandle.high,
          low: currentCandle.low,
          close: currentCandle.close,
          volume: currentCandle.volume
        });
      }
      
      // Start a new candle
      currentCandle = {
        timestamp: candleTimestamp,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: tick.volume || 0,
        tickCount: 1
      };
    } else {
      // Update the current candle
      currentCandle.high = Math.max(currentCandle.high, price);
      currentCandle.low = Math.min(currentCandle.low, price);
      currentCandle.close = price;
      currentCandle.volume += tick.volume || 0;
      currentCandle.tickCount += 1;
    }
  }
  
  // Add the last candle if it exists
  if (currentCandle) {
    candles.push({
      timestamp: currentCandle.timestamp,
      open: currentCandle.open,
      high: currentCandle.high,
      low: currentCandle.low,
      close: currentCandle.close,
      volume: currentCandle.volume
    });
  }
  
  return candles;
}

export function generateSampleCSV(secondsTimeframe: boolean = false, assetType: 'crypto' | 'stock' | 'forex' | 'commodity' = 'crypto'): string {
  let headers: string[];
  let rows: string[] = [];
  
  // Different headers based on asset type
  switch (assetType) {
    case 'crypto':
      headers = ['timestamp', 'symbol', 'open', 'high', 'low', 'close', 'volume'];
      break;
    case 'stock':
      headers = ['date', 'time', 'ticker', 'open', 'high', 'low', 'close', 'volume'];
      break;
    case 'forex':
      headers = ['timestamp', 'pair', 'bid', 'ask', 'volume'];
      break;
    case 'commodity':
      headers = ['date', 'contract', 'open', 'high', 'low', 'close', 'volume', 'open_interest'];
      break;
    default:
      headers = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
  }
  
  rows.push(headers.join(','));
  
  let price = assetType === 'crypto' ? 50000 : 
              assetType === 'stock' ? 150 : 
              assetType === 'forex' ? 1.1250 : 
              assetType === 'commodity' ? 1850 : 100;
              
  const symbol = assetType === 'crypto' ? 'BTCUSDT' : 
                assetType === 'stock' ? 'AAPL' : 
                assetType === 'forex' ? 'EURUSD' : 
                assetType === 'commodity' ? 'XAUUSD' : 'ASSET';
                
  const startTime = Date.now() - (secondsTimeframe ? (3 * 60 * 60 * 1000) : (30 * 24 * 60 * 60 * 1000));
  const interval = secondsTimeframe ? 1000 : (60 * 60 * 1000);
  const count = secondsTimeframe ? 10800 : 720;
  const volatility = secondsTimeframe ? 0.0005 : 0.01;
  
  for (let i = 0; i < count; i++) {
    const timestamp = startTime + (i * interval);
    const date = new Date(timestamp);
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = format(date, 'HH:mm:ss');
    
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = Math.floor(Math.random() * 1000 + 500);
    const bid = close - (close * 0.0001);
    const ask = close + (close * 0.0001);
    const openInterest = Math.floor(Math.random() * 10000 + 5000);
    
    let row: string[];
    
    switch (assetType) {
      case 'crypto':
        row = [timestamp.toString(), symbol, open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), volume.toString()];
        break;
      case 'stock':
        row = [dateStr, timeStr, symbol, open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), volume.toString()];
        break;
      case 'forex':
        row = [timestamp.toString(), symbol, bid.toFixed(4), ask.toFixed(4), volume.toString()];
        break;
      case 'commodity':
        row = [dateStr, symbol, open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), volume.toString(), openInterest.toString()];
        break;
      default:
        row = [timestamp.toString(), open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2), volume.toString()];
    }
    
    rows.push(row.join(','));
    price = close;
  }
  
  return rows.join('\n');
}

export function generateSampleTickData(assetType: 'crypto' | 'stock' | 'forex' = 'crypto'): string {
  let headers: string[];
  let rows: string[] = [];
  
  switch (assetType) {
    case 'crypto':
      headers = ['timestamp', 'symbol', 'price', 'volume', 'side'];
      break;
    case 'stock':
      headers = ['timestamp', 'ticker', 'last', 'bid', 'ask', 'volume'];
      break;
    case 'forex':
      headers = ['timestamp', 'pair', 'bid', 'ask', 'volume'];
      break;
    default:
      headers = ['timestamp', 'price', 'volume'];
  }
  
  rows.push(headers.join(','));
  
  let price = assetType === 'crypto' ? 50000 : 
              assetType === 'stock' ? 150 : 
              assetType === 'forex' ? 1.1250 : 100;
              
  const symbol = assetType === 'crypto' ? 'BTCUSDT' : 
                assetType === 'stock' ? 'AAPL' : 
                assetType === 'forex' ? 'EURUSD' : 'ASSET';
                
  const startTime = Date.now() - (10 * 60 * 1000); // 10 minutes of tick data
  const tickCount = 1000; // 1000 ticks
  
  for (let i = 0; i < tickCount; i++) {
    const timestamp = startTime + Math.floor(i * (10 * 60 * 1000 / tickCount) + Math.random() * 100);
    const change = (Math.random() - 0.5) * 0.0002; // Small price changes
    price = price * (1 + change);
    
    const volume = Math.random() * 0.5 + 0.01;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const bid = price - (price * 0.0001);
    const ask = price + (price * 0.0001);
    
    let row: string[];
    
    switch (assetType) {
      case 'crypto':
        row = [timestamp.toString(), symbol, price.toFixed(2), volume.toFixed(8), side];
        break;
      case 'stock':
        row = [timestamp.toString(), symbol, price.toFixed(2), bid.toFixed(2), ask.toFixed(2), volume.toFixed(2)];
        break;
      case 'forex':
        row = [timestamp.toString(), symbol, bid.toFixed(5), ask.toFixed(5), volume.toFixed(2)];
        break;
      default:
        row = [timestamp.toString(), price.toFixed(2), volume.toFixed(8)];
    }
    
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}