import { Candle, BollingerBands, Trade, BacktestResult, TradingConfig } from '../types/trading';

export interface EnhancedBollingerConfig extends TradingConfig {
  // Enhanced features (all optional and disabled by default)
  enableAdaptivePeriod: boolean;
  adaptivePeriodMin: number;
  adaptivePeriodMax: number;
  
  enableVolumeFilter: boolean;
  volumePeriod: number;
  volumeThreshold: number;
  
  enableVolatilityPositioning: boolean;
  basePositionSize: number;
  volatilityLookback: number;
  
  enableTrailingStop: boolean;
  trailingStopPercent: number;
  enablePartialTakeProfit: boolean;
  partialTakeProfitPercent: number;
  partialTakeProfitSize: number;
  
  enableMarketRegimeFilter: boolean;
  trendPeriod: number;
  trendThreshold: number;
  
  enableTimeFilter: boolean;
  tradingStartHour: number;
  tradingEndHour: number;
  
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
  cooldownPeriod: number;
  
  enableSqueezeDetection: boolean;
  squeezeThreshold: number;
  
  enableMeanReversion: boolean;
  meanReversionThreshold: number;
}

export interface MarketRegime {
  trend: 'bullish' | 'bearish' | 'sideways';
  volatility: 'low' | 'medium' | 'high';
  strength: number;
}

export class EnhancedBollingerBot {
  private config: EnhancedBollingerConfig;
  private trades: Trade[] = [];
  private capital: number;
  private currentTrade: Trade | null = null;
  private dailyLoss: number = 0;
  private consecutiveLosses: number = 0;
  private lastTradeTime: number = 0;
  private partialProfitTaken: boolean = false;
  private trailingStopPrice: number = 0;

  constructor(config: EnhancedBollingerConfig) {
    this.config = config;
    this.capital = config.initialCapital;
  }

  backtest(candles: Candle[], bands: BollingerBands[]): BacktestResult {
    this.trades = [];
    this.capital = this.config.initialCapital;
    this.currentTrade = null;
    this.dailyLoss = 0;
    this.consecutiveLosses = 0;
    this.lastTradeTime = 0;
    this.partialProfitTaken = false;
    this.trailingStopPrice = 0;

    // Calculate enhanced indicators only if enabled
    const adaptiveBands = this.config.enableAdaptivePeriod ? 
      this.calculateAdaptiveBollingerBands(candles) : bands;
    
    const volumeMA = this.config.enableVolumeFilter ? 
      this.calculateVolumeMA(candles, this.config.volumePeriod) : [];
    
    const marketRegimes = this.config.enableMarketRegimeFilter ? 
      this.calculateMarketRegime(candles) : [];
    
    const volatility = this.config.enableVolatilityPositioning ? 
      this.calculateVolatility(candles) : [];

    const squeezes = this.config.enableSqueezeDetection ?
      this.detectSqueezes(candles, bands) : [];

    for (let i = Math.max(this.config.period, this.config.trendPeriod || 20) + 1; i < candles.length; i++) {
      const candle = candles[i];
      const prevCandle = candles[i - 1];
      const band = adaptiveBands[i] || bands[i];
      const prevBand = adaptiveBands[i - 1] || bands[i - 1];

      if (!band || !prevBand) continue;

      // Reset daily loss at start of new day
      if (this.isNewDay(candle, candles[i - 1])) {
        this.dailyLoss = 0;
      }

      // Check risk management rules
      if (this.shouldSkipTrading(candle, marketRegimes[i])) {
        continue;
      }

      // Position management for existing trades
      if (this.currentTrade) {
        // Update trailing stop
        if (this.config.enableTrailingStop) {
          this.updateTrailingStop(candle);
        }

        // Check exit conditions
        if (this.shouldExitPosition(candle, band, i, candles)) {
          this.exitPosition(candle, i, 'strategy-exit');
        } else if (this.config.enableTrailingStop && this.shouldTrailingStop(candle)) {
          this.exitPosition(candle, i, 'trailing-stop');
        } else if (this.config.enablePartialTakeProfit && this.shouldPartialTakeProfit(candle)) {
          this.partialTakeProfit(candle, i);
        }
        continue;
      }

      // Entry logic with enhanced filters
      const positionSize = this.config.enableVolatilityPositioning ? 
        this.calculatePositionSize(volatility[i] || 0.02) : 1.0;

      // Enhanced entry conditions
      if (this.config.enableLongPositions && 
          this.isEnhancedLongEntry(candle, prevCandle, band, prevBand, volumeMA[i], marketRegimes[i], squeezes[i])) {
        this.enterLongPosition(candle, i, positionSize);
      } else if (this.config.enableShortPositions && 
                 this.isEnhancedShortEntry(candle, prevCandle, band, prevBand, volumeMA[i], marketRegimes[i], squeezes[i])) {
        this.enterShortPosition(candle, i, positionSize);
      }
    }

    // Close any open position
    if (this.currentTrade) {
      const lastCandle = candles[candles.length - 1];
      this.exitPosition(lastCandle, candles.length - 1, 'strategy-exit');
    }

    return this.calculateResults();
  }

  private calculateAdaptiveBollingerBands(candles: Candle[]): BollingerBands[] {
    const bands: BollingerBands[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < this.config.adaptivePeriodMax) {
        bands.push({ upper: 0, middle: 0, lower: 0 });
        continue;
      }

      // Calculate volatility to determine adaptive period
      const volatility = this.calculateLocalVolatility(candles, i, 20);
      const adaptivePeriod = Math.round(
        this.config.adaptivePeriodMin + 
        (this.config.adaptivePeriodMax - this.config.adaptivePeriodMin) * (1 - volatility)
      );

      // Calculate BB with adaptive period
      const closes = candles.slice(i - adaptivePeriod + 1, i + 1).map(c => c.close);
      const sma = closes.reduce((sum, close) => sum + close, 0) / closes.length;
      const variance = closes.reduce((sum, close) => sum + Math.pow(close - sma, 2), 0) / closes.length;
      const stdDev = Math.sqrt(variance);

      bands.push({
        upper: sma + (stdDev * this.config.stdDev) + this.config.offset,
        middle: sma,
        lower: sma - (stdDev * this.config.stdDev) - this.config.offset
      });
    }

    return bands;
  }

  private calculateLocalVolatility(candles: Candle[], index: number, period: number): number {
    if (index < period) return 0.5;

    const returns = [];
    for (let i = index - period + 1; i <= index; i++) {
      if (i > 0) {
        returns.push(Math.log(candles[i].close / candles[i - 1].close));
      }
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252); // Annualized

    // Normalize to 0-1 range
    return Math.min(1, Math.max(0, volatility / 0.5));
  }

  private calculateMarketRegime(candles: Candle[]): MarketRegime[] {
    const regimes: MarketRegime[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < this.config.trendPeriod) {
        regimes.push({ trend: 'sideways', volatility: 'medium', strength: 0 });
        continue;
      }

      // Calculate trend strength
      const startPrice = candles[i - this.config.trendPeriod].close;
      const endPrice = candles[i].close;
      const trendReturn = (endPrice - startPrice) / startPrice;

      let trend: 'bullish' | 'bearish' | 'sideways';
      if (trendReturn > this.config.trendThreshold) {
        trend = 'bullish';
      } else if (trendReturn < -this.config.trendThreshold) {
        trend = 'bearish';
      } else {
        trend = 'sideways';
      }

      // Calculate volatility regime
      const volatility = this.calculateLocalVolatility(candles, i, 20);
      let volRegime: 'low' | 'medium' | 'high';
      if (volatility < 0.3) volRegime = 'low';
      else if (volatility < 0.7) volRegime = 'medium';
      else volRegime = 'high';

      regimes.push({
        trend,
        volatility: volRegime,
        strength: Math.abs(trendReturn)
      });
    }

    return regimes;
  }

  private calculateVolatility(candles: Candle[]): number[] {
    const volatility: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < this.config.volatilityLookback) {
        volatility.push(0.02); // Default 2% volatility
        continue;
      }

      const returns = [];
      for (let j = i - this.config.volatilityLookback + 1; j <= i; j++) {
        if (j > 0) {
          returns.push(Math.log(candles[j].close / candles[j - 1].close));
        }
      }

      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      volatility.push(Math.sqrt(variance));
    }

    return volatility;
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

  private detectSqueezes(candles: Candle[], bands: BollingerBands[]): boolean[] {
    const squeezes: boolean[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (i < 20 || !bands[i]) {
        squeezes.push(false);
        continue;
      }

      // Calculate band width
      const bandWidth = (bands[i].upper - bands[i].lower) / bands[i].middle;
      
      // Calculate average band width over last 20 periods
      let avgBandWidth = 0;
      let count = 0;
      for (let j = i - 19; j <= i; j++) {
        if (bands[j]) {
          avgBandWidth += (bands[j].upper - bands[j].lower) / bands[j].middle;
          count++;
        }
      }
      avgBandWidth /= count;

      // Squeeze detected when current band width is significantly below average
      const isSqueeze = bandWidth < avgBandWidth * this.config.squeezeThreshold;
      squeezes.push(isSqueeze);
    }

    return squeezes;
  }

  private calculatePositionSize(volatility: number): number {
    // Inverse volatility position sizing
    const targetVolatility = 0.02; // 2% target volatility
    const scaleFactor = Math.min(2, Math.max(0.5, targetVolatility / volatility));
    return this.config.basePositionSize * scaleFactor;
  }

  private isEnhancedLongEntry(
    candle: Candle, 
    prevCandle: Candle, 
    band: BollingerBands, 
    prevBand: BollingerBands,
    volumeMA: number,
    regime: MarketRegime,
    isSqueeze: boolean
  ): boolean {
    // Basic BB breakout (PRESERVED original logic)
    const bbBreakout = prevCandle.close <= prevBand.upper && candle.close > band.upper;
    if (!bbBreakout) return false;

    // Mean reversion mode (alternative entry)
    if (this.config.enableMeanReversion) {
      const meanReversionEntry = candle.close < band.lower * (1 + this.config.meanReversionThreshold) &&
                                candle.close > prevCandle.close;
      if (meanReversionEntry) return true;
    }

    // Time filter
    if (this.config.enableTimeFilter && !this.isValidTradingTime(candle)) {
      return false;
    }

    // Volume filter
    if (this.config.enableVolumeFilter && volumeMA > 0 &&
        candle.volume < volumeMA * this.config.volumeThreshold) {
      return false;
    }

    // Market regime filter
    if (this.config.enableMarketRegimeFilter && regime) {
      // Only trade longs in bullish or sideways markets
      if (regime.trend === 'bearish' && regime.strength > 0.02) {
        return false;
      }
      // Avoid trading in extremely high volatility
      if (regime.volatility === 'high') {
        return false;
      }
    }

    // Squeeze filter - wait for squeeze to end before entering
    if (this.config.enableSqueezeDetection && isSqueeze) {
      return false;
    }

    return true;
  }

  private isEnhancedShortEntry(
    candle: Candle, 
    prevCandle: Candle, 
    band: BollingerBands, 
    prevBand: BollingerBands,
    volumeMA: number,
    regime: MarketRegime,
    isSqueeze: boolean
  ): boolean {
    // Basic BB breakdown (PRESERVED original logic)
    const bbBreakdown = prevCandle.close >= prevBand.lower && candle.close < band.lower;
    if (!bbBreakdown) return false;

    // Mean reversion mode (alternative entry)
    if (this.config.enableMeanReversion) {
      const meanReversionEntry = candle.close > band.upper * (1 - this.config.meanReversionThreshold) &&
                                candle.close < prevCandle.close;
      if (meanReversionEntry) return true;
    }

    // Time filter
    if (this.config.enableTimeFilter && !this.isValidTradingTime(candle)) {
      return false;
    }

    // Volume filter
    if (this.config.enableVolumeFilter && volumeMA > 0 &&
        candle.volume < volumeMA * this.config.volumeThreshold) {
      return false;
    }

    // Market regime filter
    if (this.config.enableMarketRegimeFilter && regime) {
      // Only trade shorts in bearish or sideways markets
      if (regime.trend === 'bullish' && regime.strength > 0.02) {
        return false;
      }
      // Avoid trading in extremely high volatility
      if (regime.volatility === 'high') {
        return false;
      }
    }

    // Squeeze filter - wait for squeeze to end before entering
    if (this.config.enableSqueezeDetection && isSqueeze) {
      return false;
    }

    return true;
  }

  private shouldSkipTrading(candle: Candle, regime?: MarketRegime): boolean {
    // Daily loss limit
    if (this.config.maxDailyLoss > 0 && this.dailyLoss >= this.config.maxDailyLoss) {
      return true;
    }

    // Consecutive losses limit
    if (this.config.maxConsecutiveLosses > 0 && 
        this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      return true;
    }

    // Cooldown period after last trade
    if (this.config.cooldownPeriod > 0 && 
        candle.timestamp - this.lastTradeTime < this.config.cooldownPeriod * 60 * 1000) {
      return true;
    }

    return false;
  }

  private isValidTradingTime(candle: Candle): boolean {
    const hour = new Date(candle.timestamp).getHours();
    return hour >= this.config.tradingStartHour && hour <= this.config.tradingEndHour;
  }

  private isNewDay(currentCandle: Candle, prevCandle: Candle): boolean {
    const currentDate = new Date(currentCandle.timestamp).toDateString();
    const prevDate = new Date(prevCandle.timestamp).toDateString();
    return currentDate !== prevDate;
  }

  private shouldExitPosition(candle: Candle, band: BollingerBands, index: number, candles: Candle[]): boolean {
    if (!this.currentTrade) return false;

    // Original exit logic (PRESERVED)
    if (this.currentTrade.position === 'long') {
      return candle.close <= band.upper;
    } else {
      return candle.close >= band.lower;
    }
  }

  private updateTrailingStop(candle: Candle) {
    if (!this.currentTrade) return;

    if (this.currentTrade.position === 'long') {
      const newTrailingStop = candle.high * (1 - this.config.trailingStopPercent);
      if (this.trailingStopPrice === 0 || newTrailingStop > this.trailingStopPrice) {
        this.trailingStopPrice = newTrailingStop;
      }
    } else {
      const newTrailingStop = candle.low * (1 + this.config.trailingStopPercent);
      if (this.trailingStopPrice === 0 || newTrailingStop < this.trailingStopPrice) {
        this.trailingStopPrice = newTrailingStop;
      }
    }
  }

  private shouldTrailingStop(candle: Candle): boolean {
    if (!this.currentTrade || this.trailingStopPrice === 0) return false;

    if (this.currentTrade.position === 'long') {
      return candle.low <= this.trailingStopPrice;
    } else {
      return candle.high >= this.trailingStopPrice;
    }
  }

  private shouldPartialTakeProfit(candle: Candle): boolean {
    if (!this.currentTrade || this.partialProfitTaken) return false;

    const profitPercent = this.currentTrade.position === 'long' 
      ? (candle.close - this.currentTrade.entryPrice) / this.currentTrade.entryPrice
      : (this.currentTrade.entryPrice - candle.close) / this.currentTrade.entryPrice;

    return profitPercent >= this.config.partialTakeProfitPercent;
  }

  private partialTakeProfit(candle: Candle, index: number) {
    if (!this.currentTrade) return;

    // Take partial profit
    const partialSize = this.config.partialTakeProfitSize;
    const partialPnl = this.currentTrade.position === 'long' 
      ? ((candle.close - this.currentTrade.entryPrice) / this.currentTrade.entryPrice) * 
        this.config.maxLeverage * this.capital * partialSize
      : ((this.currentTrade.entryPrice - candle.close) / this.currentTrade.entryPrice) * 
        this.config.maxLeverage * this.capital * partialSize;

    this.capital += partialPnl;
    this.partialProfitTaken = true;

    // Update trailing stop to breakeven
    this.trailingStopPrice = this.currentTrade.entryPrice;
  }

  private enterLongPosition(candle: Candle, index: number, positionSize: number) {
    const stopLoss = candle.close * 0.95; // Default 5% stop loss

    this.currentTrade = {
      id: `enhanced_trade_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'long',
      leverage: this.config.maxLeverage * positionSize,
      isOpen: true
    };

    this.partialProfitTaken = false;
    this.trailingStopPrice = 0;
  }

  private enterShortPosition(candle: Candle, index: number, positionSize: number) {
    const stopLoss = candle.close * 1.05; // Default 5% stop loss

    this.currentTrade = {
      id: `enhanced_trade_${index}`,
      entryTime: candle.timestamp,
      entryPrice: candle.close,
      stopLoss: stopLoss,
      position: 'short',
      leverage: this.config.maxLeverage * positionSize,
      isOpen: true
    };

    this.partialProfitTaken = false;
    this.trailingStopPrice = 0;
  }

  private exitPosition(candle: Candle, index: number, reason: 'stop-loss' | 'target' | 'strategy-exit' | 'trailing-stop') {
    if (!this.currentTrade) return;

    let exitPrice: number;
    if (reason === 'stop-loss') {
      exitPrice = this.currentTrade.stopLoss;
    } else if (reason === 'trailing-stop') {
      exitPrice = this.trailingStopPrice;
    } else {
      exitPrice = candle.close;
    }

    let pnl: number;
    if (this.currentTrade.position === 'long') {
      pnl = ((exitPrice - this.currentTrade.entryPrice) / this.currentTrade.entryPrice) * 
            this.currentTrade.leverage * this.capital;
    } else {
      pnl = ((this.currentTrade.entryPrice - exitPrice) / this.currentTrade.entryPrice) * 
            this.currentTrade.leverage * this.capital;
    }

    // Adjust for partial profit if taken
    if (this.partialProfitTaken) {
      pnl *= (1 - this.config.partialTakeProfitSize);
    }

    this.currentTrade.exitTime = candle.timestamp;
    this.currentTrade.exitPrice = exitPrice;
    this.currentTrade.pnl = pnl;
    this.currentTrade.isOpen = false;
    this.currentTrade.reason = reason;

    this.capital += pnl;
    this.trades.push({ ...this.currentTrade });

    // Update risk management
    if (pnl < 0) {
      this.dailyLoss += Math.abs(pnl);
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }

    this.lastTradeTime = candle.timestamp;
    this.currentTrade = null;
    this.partialProfitTaken = false;
    this.trailingStopPrice = 0;
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

// Helper function to create enhanced config from basic config
export function createEnhancedConfig(basicConfig: TradingConfig): EnhancedBollingerConfig {
  return {
    ...basicConfig,
    // Enhanced features (all disabled by default to preserve current behavior)
    enableAdaptivePeriod: false,
    adaptivePeriodMin: Math.max(5, basicConfig.period - 10),
    adaptivePeriodMax: basicConfig.period + 10,
    
    enableVolumeFilter: false,
    volumePeriod: 20,
    volumeThreshold: 1.5,
    
    enableVolatilityPositioning: false,
    basePositionSize: 1.0,
    volatilityLookback: 20,
    
    enableTrailingStop: false,
    trailingStopPercent: 0.02,
    enablePartialTakeProfit: false,
    partialTakeProfitPercent: 0.03,
    partialTakeProfitSize: 0.5,
    
    enableMarketRegimeFilter: false,
    trendPeriod: 50,
    trendThreshold: 0.02,
    
    enableTimeFilter: false,
    tradingStartHour: 9,
    tradingEndHour: 16,
    
    maxDailyLoss: 0,
    maxConsecutiveLosses: 0,
    cooldownPeriod: 0,
    
    enableSqueezeDetection: false,
    squeezeThreshold: 0.8,
    
    enableMeanReversion: false,
    meanReversionThreshold: 0.02
  };
}