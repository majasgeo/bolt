import { Candle } from '../types/trading';

export function generateSampleData(days: number = 180): Candle[] {
  const candles: Candle[] = [];
  const startPrice = 100;
  let currentPrice = startPrice;
  const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

  // Generate realistic market data with proper trends and cycles
  for (let i = 0; i < days * 24; i++) { // Hourly candles
    const timestamp = startTime + (i * 60 * 60 * 1000);
    
    // Create realistic market movements
    const longTermTrend = Math.sin(i / 1000) * 0.0003; // Very subtle long-term trend
    const mediumTermCycle = Math.sin(i / 200) * 0.001; // Medium-term cycles
    const shortTermNoise = (Math.random() - 0.5) * 0.012; // Short-term volatility
    
    // Add market hours effect (higher volatility during trading hours)
    const hour = new Date(timestamp).getHours();
    const marketHoursMultiplier = (hour >= 9 && hour <= 16) ? 1.3 : 0.8;
    
    // Add weekend effect (lower volatility on weekends)
    const dayOfWeek = new Date(timestamp).getDay();
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0;
    
    // Combine all price movements
    const totalChange = (longTermTrend + mediumTermCycle + shortTermNoise) * marketHoursMultiplier * weekendMultiplier;
    
    const open = currentPrice;
    const close = open * (1 + totalChange);
    
    // Generate realistic high/low based on volatility
    const volatility = Math.abs(totalChange) + 0.002;
    const highOffset = Math.random() * volatility * 0.7;
    const lowOffset = Math.random() * volatility * 0.7;
    
    const high = Math.max(open, close) * (1 + highOffset);
    const low = Math.min(open, close) * (1 - lowOffset);
    
    // Generate realistic volume (higher during volatile periods and market hours)
    const baseVolume = 800;
    const volatilityVolume = Math.abs(totalChange) * 30000;
    const marketHoursVolume = marketHoursMultiplier * 200;
    const randomVolume = Math.random() * 400;
    const volume = baseVolume + volatilityVolume + marketHoursVolume + randomVolume;

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume
    });

    currentPrice = close;
  }

  return candles;
}