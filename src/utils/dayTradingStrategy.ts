import { Candle, BollingerBands, Trade, BacktestResult, TradingConfig } from '../types/trading';

export interface DayTradingConfig extends TradingConfig {
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  volumeThreshold: number;
  profitTarget: number; // Percentage profit target
  stopLossPercent: number; // Stop loss percentage
  maxHoldingPeriod: number; // Maximum hours to hold a position
}

export interface RSI {
  value: number;
}

export interface MACD {
  macd: number;
  signal: number;
  histogram: number;
}

export class DayTradingBot {
  private config: DayTradingConfig;
  private trades: Trade[] = [];
  private capital: number;
  private currentTrade: Trade | null = null;

  constructor(config: DayTradingConfig) {
    this.config = config;
    this.capital = config.initialCapital;
  }

  backtest(candles: Candle[], bands: BollingerBands[]): BacktestResult {
    this.trades = [];
    this.capital = this.config.initialCapital;
    this.currentTrade = null;

    // Calculate technical indicators
    const rsiValues = this.calculateRSI(candles, this.config.rsiPeriod);
    const macdValues = this.calculateMACD(candles, this.config.macdFast, this.config.macdSlow, this.config.macdSignal);
    const volumeMA = this.calculateVolumeMA(candles, 20);

    for (let i = Math.max(this.config.rsiPeriod, this.config.macdSlow) + 1; i < candles.length; i++) {
      const candle = candles[i];
      const prevCandle = candles[i - 1];
      const band = bands[i];
      const prevBand = bands[i - 1];
      const rsi = rsiValues[i];
      const prevRSI = rsiValues[i - 1];
      const macd = macdValues[i];
      const prevMACD = macdValues[i - 1];

      if (!band || !prevBand || !rsi || !prevRSI || !macd || !prevMACD) continue;

      // Check for position timeout (day trading - close before end of day)
      if (this.currentTrade && this.shouldClosePosition(candle, i, candles)) {
        this.exitPosition(candle, i, 'timeout');
        continue;
      }

      // Long entry conditions (multiple confirmations for higher win rate)
      if (!this.currentTrade && this.config.enableLongPositions) {
        if (this.isLongEntry(candle, prevCandle, band, prevBand, rsi, prevRSI, macd, prevMACD, volumeMA[i])) {
          this.enterLongPosition(candle, i);
        }
      }

      // Short entry conditions (multiple confirmations for higher win rate)
      if (!this.currentTrade && this.config.enableShortPositions) {
        if (this.isShortEntry(candle, prevCandle, band, prevBand, rsi, prevRSI, macd, prevMACD, volumeMA[i])) {
          this.enterShortPosition(candle, i);
        }
      }

      // Exit conditions
      if (this.currentTrade) {
        if (this.shouldExitPosition(candle, band, rsi, macd)) {
          this.exitPosition(candle, i, 'strategy-exit');
        } else if (this.shouldStopLoss(candle)) {
          this.exitPosition(candle, i, 'stop-loss');
        } else if (this.shouldTakeProfit(candle)) {
          this.exitPosition(candle, i, 'target');
        }
      }
    }

    // Close any open position
    if (this.currentTrade) {
      const lastCandle = candles[candles.length - 1];
      this.exitPosition(lastCandle, candles.length - 1, 'strategy-exit');
    }

    return this.calculateResults();
  }

  private isLongEntry(
    candle: Candle, 
    prevCandle: Candle, 
    band: BollingerBands, 
    prevBand: BollingerBands,
    rsi: RSI, 
    prevRSI: RSI, 
    macd: MACD, 
    prevMACD: MACD,
    volumeMA: number
  ): boolean {
    // Multiple confirmation signals for higher win rate
    const conditions = [
      // Bollinger Band breakout
      prevCandle.close <= prevBand.upper && candle.close > band.upper,
      
      // RSI momentum (not overbought, showing strength)
      rsi.value > 50 && rsi.value < this.config.rsiOverbought && rsi.value > prevRSI.value,
      
      // MACD bullish signal
      macd.macd > macd.signal && macd.histogram > prevMACD.histogram,
      
      // Volume confirmation
      candle.volume > volumeMA * this.config.volumeThreshold,
      
      // Price action confirmation
      candle.close > candle.open, // Green candle
      
      // Trend confirmation (price above middle band)
      candle.close > band.middle
    ];

    // Require at least 4 out of 6 conditions for entry (higher selectivity = higher win rate)
    const confirmedConditions = conditions.filter(Boolean).length;
    return confirmedConditions >= 4;
  }

  private isShortEntry(
    candle: Candle, 
    prevCandle: Candle, 
    band: BollingerBands, 
    prevBand: BollingerBands,
    rsi: RSI, 
    prevRSI: RSI, 
    macd: MACD, 
    prevMACD: MACD,
    volumeMA: number
  ): boolean {
    // Multiple confirmation signals for higher win rate
    const conditions = [
      // Bollinger Band breakdown
      prevCandle.close >= prevBand.lower && candle.close < band.lower,
      
      // RSI momentum (not oversold, showing weakness)
      rsi.value < 50 && rsi.value > this.config.rsiOversold && rsi.value < prevRSI.value,
      
      // MACD bearish signal
      macd.macd < macd.signal && macd.histogram < prevMACD.histogram,
      
      // Volume confirmation
      candle.volume > volumeMA * this.config.volumeThreshold,
      
      // Price action confirmation
      candle.close < candle.open, // Red candle
      
      // Trend confirmation (price below middle band)
      candle.close < band.middle
    ];

    // Require at least 4 out of 6 conditions for entry (higher selectivity = higher win rate)
    const confirmedConditions = conditions.filter(Boolean).length;
    return confirmedConditions >= 4;
  }

  private shouldExitPosition(candle: Candle, band: BollingerBands, rsi: RSI, macd: MACD): boolean {
    if (!this.currentTrade) return false;

    if (this.currentTrade.position === 'long') {
      // Exit long when momentum weakens
      return (
        candle.close <= band.upper || // Price back below upper band
        rsi.value >= this.config.rsiOverbought || // Overbought
        macd.histogram < 0 // MACD momentum turning negative
      );
    } else {
      // Exit short when momentum weakens
      return (
        candle.close >= band.lower || // Price back above lower band
        rsi.value <= this.config.rsiOversold || // Oversold
        macd.histogram > 0 // MACD momentum turning positive
      );
    }
  }

  private shouldStopLoss(candle: Candle): boolean {
    if (!this.currentTrade) return false;

    if (this.currentTrade.position === 'long') {
      return candle.low <= this.currentTrade.stopLoss;
    } else {
      return candle.high >= this.currentTrade.stopLoss;
    }
  }

  private shouldTakeProfit(candle: Candle): boolean {
    if (!this.currentTrade) return false;

    const profitTarget = this.currentTrade.position === 'long' 
      ? this.currentTrade.entryPrice * (1 + this.config.profitTarget)
      : this.currentTrade.entryPrice * (1 - this.config.profitTarget);

    if (this.currentTrade.position === 'long') {
      return candle.high >= profitTarget;
    } else {
      return candle.low <= profitTarget;
    }
  }

  private shouldClosePosition(candle: Candle, index: number, candles: Candle[]): boolean {
    if (!this.currentTrade) return false;

    // Find entry index
    const entryIndex = candles.findIndex(c => c.timestamp >= this.currentTrade!.entryTime);
    if (entryIndex === -1) return false;

    // Close position if held for maximum period
    const hoursHeld = index - entryIndex;
    return hoursHeld >= this.config.maxHoldingPeriod;
  }

  private enterLongPosition(candle: Candle, index: number) {
    const stopLoss = candle.close * (1 - this.config.stopLossPercent);

    this.currentTrade = {
      id: `trade_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'long',
      leverage: this.config.maxLeverage,
      isOpen: true
    };
  }

  private enterShortPosition(candle: Candle, index: number) {
    const stopLoss = candle.close * (1 + this.config.stopLossPercent);

    this.currentTrade = {
      id: `trade_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'short',
      leverage: this.config.maxLeverage,
      isOpen: true
    };
  }

  private exitPosition(candle: Candle, index: number, reason: 'stop-loss' | 'target' | 'strategy-exit' | 'timeout') {
    if (!this.currentTrade) return;

    let exitPrice: number;
    if (reason === 'stop-loss') {
      exitPrice = this.currentTrade.stopLoss;
    } else if (reason === 'target') {
      exitPrice = this.currentTrade.position === 'long' 
        ? this.currentTrade.entryPrice * (1 + this.config.profitTarget)
        : this.currentTrade.entryPrice * (1 - this.config.profitTarget);
    } else {
      exitPrice = candle.close;
    }

    let pnl: number;
    if (this.currentTrade.position === 'long') {
      pnl = ((exitPrice - this.currentTrade.entryPrice) / this.currentTrade.entryPrice) * 
            this.config.maxLeverage * this.capital;
    } else {
      pnl = ((this.currentTrade.entryPrice - exitPrice) / this.currentTrade.entryPrice) * 
            this.config.maxLeverage * this.capital;
    }

    this.currentTrade.exitTime = candle.timestamp;
    this.currentTrade.exitPrice = exitPrice;
    this.currentTrade.pnl = pnl;
    this.currentTrade.isOpen = false;
    this.currentTrade.reason = reason;

    this.capital += pnl;
    this.trades.push({ ...this.currentTrade });
    this.currentTrade = null;
  }

  private calculateRSI(candles: Candle[], period: number): RSI[] {
    const rsi: RSI[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        gains.push(0);
        losses.push(0);
        rsi.push({ value: 50 });
        continue;
      }

      const change = candles[i].close - candles[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);

      if (i < period) {
        rsi.push({ value: 50 });
        continue;
      }

      const avgGain = gains.slice(i - period + 1, i + 1).reduce((sum, gain) => sum + gain, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((sum, loss) => sum + loss, 0) / period;

      if (avgLoss === 0) {
        rsi.push({ value: 100 });
      } else {
        const rs = avgGain / avgLoss;
        const rsiValue = 100 - (100 / (1 + rs));
        rsi.push({ value: rsiValue });
      }
    }

    return rsi;
  }

  private calculateMACD(candles: Candle[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MACD[] {
    const closes = candles.map(c => c.close);
    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);
    
    const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    return macdLine.map((macd, i) => ({
      macd,
      signal: signalLine[i],
      histogram: macd - signalLine[i]
    }));
  }

  private calculateEMA(values: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < values.length; i++) {
      if (i === 0) {
        ema.push(values[i]);
      } else {
        ema.push((values[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
      }
    }

    return ema;
  }

  private calculateVolumeMA(candles: Candle[], period: number): number[] {
    const volumeMA: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        volumeMA.push(candles[i].volume);
      } else {
        const sum = candles.slice(i - period + 1, i + 1).reduce((sum, c) => sum + c.volume, 0);
        volumeMA.push(sum / period);
      }
    }
    
    return volumeMA;
  }

  private calculateResults(): BacktestResult {
    const winningTrades = this.trades.filter(t => t.pnl! > 0).length;
    const losingTrades = this.trades.filter(t => t.pnl! <= 0).length;
    const longTrades = this.trades.filter(t => t.position === 'long').length;
    const shortTrades = this.trades.filter(t => t.position === 'short').length;
    const totalPnL = this.trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    // Calculate trading period
    let firstTradeTime: number | undefined;
    let lastTradeTime: number | undefined;
    let tradingPeriodDays: number | undefined;
    let averageTradesPerDay: number | undefined;

    if (this.trades.length > 0) {
      const completedTrades = this.trades.filter(t => t.exitTime);
      if (completedTrades.length > 0) {
        firstTradeTime = Math.min(...completedTrades.map(t => t.entryTime));
        lastTradeTime = Math.max(...completedTrades.map(t => t.exitTime!));
        tradingPeriodDays = (lastTradeTime - firstTradeTime) / (1000 * 60 * 60 * 24);
        averageTradesPerDay = tradingPeriodDays > 0 ? this.trades.length / tradingPeriodDays : 0;
      }
    }
    
    // Calculate max drawdown
    let peak = this.config.initialCapital;
    let maxDrawdown = 0;
    let runningCapital = this.config.initialCapital;

    for (const trade of this.trades) {
      runningCapital += trade.pnl || 0;
      if (runningCapital > peak) {
        peak = runningCapital;
      }
      const drawdown = (peak - runningCapital) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Simple Sharpe ratio calculation
    const returns = this.trades.map(t => (t.pnl || 0) / this.config.initialCapital);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1;
    const sharpeRatio = avgReturn / Math.sqrt(returnVariance) * Math.sqrt(252); // Annualized

    return {
      totalTrades: this.trades.length,
      winningTrades,
      losingTrades,
      winRate: this.trades.length > 0 ? winningTrades / this.trades.length : 0,
      totalPnL: totalPnL,
      maxDrawdown: maxDrawdown,
      sharpeRatio: isNaN(sharpeRatio) ? 0 : sharpeRatio,
      trades: this.trades,
      longTrades,
      shortTrades,
      firstTradeTime,
      lastTradeTime,
      tradingPeriodDays,
      averageTradesPerDay
    };
  }
}