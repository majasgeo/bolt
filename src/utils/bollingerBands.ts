import { Candle, BollingerBands } from '../types/trading';

export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(0);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

export function calculateStandardDeviation(prices: number[], sma: number[], period: number): number[] {
  const stdDev: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      stdDev.push(0);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const variance = slice.reduce((sum, price) => {
        return sum + Math.pow(price - sma[i], 2);
      }, 0) / period;
      stdDev.push(Math.sqrt(variance));
    }
  }
  
  return stdDev;
}

export function calculateBollingerBands(
  candles: Candle[], 
  period: number, 
  stdDev: number, 
  offset: number
): BollingerBands[] {
  const closes = candles.map(c => c.close);
  const sma = calculateSMA(closes, period);
  const standardDev = calculateStandardDeviation(closes, sma, period);
  
  return candles.map((_, index) => ({
    middle: sma[index],
    upper: sma[index] + (standardDev[index] * stdDev) + offset,
    lower: sma[index] - (standardDev[index] * stdDev) - offset
  }));
}