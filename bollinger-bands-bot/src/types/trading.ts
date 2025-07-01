export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
}

export interface TradingConfig {
  period: number;
  stdDev: number;
  offset: number;
  maxLeverage: number;
  initialCapital: number;
  enableLongPositions: boolean;
  enableShortPositions: boolean;
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