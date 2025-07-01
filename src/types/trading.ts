export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickData {
  timestamp: number;
  price: number;
  bid?: number;
  ask?: number;
  volume?: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export interface Trade {
  id: string;
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  position: 'long' | 'short';
  leverage: number;
  pnl?: number;
  isOpen: boolean;
  reason?: 'stop-loss' | 'target' | 'strategy-exit';
  asset?: string;
  timeframe?: string;
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: Trade[];
  longTrades: number;
  shortTrades: number;
  firstTradeTime?: number;
  lastTradeTime?: number;
  tradingPeriodDays?: number;
  averageTradesPerDay?: number;
  asset?: string;
  timeframe?: string;
}

export interface TradingConfig {
  period: number;
  stdDev: number;
  offset: number;
  maxLeverage: number;
  initialCapital: number;
  enableLongPositions: boolean;
  enableShortPositions: boolean;
  takeProfitPercent?: number;
  stopLossPercent?: number;
  trailingStopPercent?: number;
  maxHoldingPeriods?: number;
  asset?: string;
  timeframe?: string;
}

export interface OptimizationResult {
  period: number;
  stdDev: number;
  offset: number;
  leverage: number;
  totalReturn: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  score: number;
  tradingPeriodDays?: number;
  averageTradesPerDay?: number;
  asset?: string;
  timeframe?: string;
  takeProfitPercent?: number;
  stopLossPercent?: number;
  trailingStopPercent?: number;
}

export interface OptimizationProgress {
  current: number;
  total: number;
  currentConfig: string;
  isRunning: boolean;
  results: OptimizationResult[];
  bestResult?: OptimizationResult;
  estimatedTimeRemaining?: string;
}

export interface OptimizationFilters {
  minimumTradingPeriodDays?: number;
  minimumTrades?: number;
  minimumWinRate?: number;
  maximumDrawdown?: number;
  minimumReturn?: number;
}

export interface CSVColumnMapping {
  timestamp?: string;
  date?: string;
  time?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  price?: string;
  volume?: string;
  bid?: string;
  ask?: string;
  last?: string;
  symbol?: string;
  exchange?: string;
}

export interface TimeframeOption {
  value: string;
  label: string;
  seconds: number;
}

export interface AssetInfo {
  name: string;
  type: 'crypto' | 'stock' | 'forex' | 'commodity' | 'other';
  symbol: string;
  exchange?: string;
  tickSize?: number;
  pipValue?: number;
}