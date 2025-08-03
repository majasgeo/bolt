import React, { useRef, useEffect } from 'react';
import { Candle, BollingerBands, Trade } from '../types/trading';

interface ChartProps {
  candles: Candle[];
  bands: BollingerBands[];
  trades: Trade[];
  width: number;
  height: number;
}

export function Chart({ candles, bands, trades, width, height }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Safety check for data
    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      console.warn('Chart: Invalid candles data');
      return;
    }

    if (!bands || !Array.isArray(bands) || bands.length === 0) {
      console.warn('Chart: Invalid bands data');
      return;
    }
    
    if (candles.length !== bands.length) {
      console.warn('Chart: Candles and bands length mismatch');
      return;
    }

    // Calculate price range with safety checks
    const prices: number[] = [];
    for (const candle of candles) {
      if (!candle) continue;
      if (typeof candle.high === 'number' && !isNaN(candle.high) && candle.high > 0) {
        prices.push(candle.high);
      }
      if (typeof candle.low === 'number' && !isNaN(candle.low) && candle.low > 0) {
        prices.push(candle.low);
      }
    }
    
    const bandPrices: number[] = [];
    for (const band of bands) {
      if (!band) continue;
      if (typeof band.upper === 'number' && !isNaN(band.upper) && band.upper > 0) {
        bandPrices.push(band.upper);
      }
      if (typeof band.lower === 'number' && !isNaN(band.lower) && band.lower > 0) {
        bandPrices.push(band.lower);
      }
      if (typeof band.middle === 'number' && !isNaN(band.middle) && band.middle > 0) {
        bandPrices.push(band.middle);
      }
    }
    
    const allPrices = [...prices, ...bandPrices];
    
    if (allPrices.length === 0) {
      console.warn('Chart: No valid price data');
      return;
    }
    
    // Use safe min/max calculation to avoid stack overflow
    let minPrice = allPrices[0];
    let maxPrice = allPrices[0];
    
    for (let i = 1; i < allPrices.length; i++) {
      if (allPrices[i] < minPrice) minPrice = allPrices[i];
      if (allPrices[i] > maxPrice) maxPrice = allPrices[i];
    }
    
    const priceRange = maxPrice - minPrice;
    if (priceRange === 0) {
      console.warn('Chart: Price range is zero');
      return;
    }
    
    const padding = priceRange * 0.1;

    // Helper functions with safety checks
    const xScale = (index: number) => (index / Math.max(1, candles.length)) * width;
    const yScale = (price: number) => {
      if (typeof price !== 'number' || isNaN(price)) return height / 2;
      return height - ((price - minPrice + padding) / (priceRange + 2 * padding)) * height;
    };

    try {
      // Draw Bollinger Bands with safety checks
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      
      // Upper band
      ctx.beginPath();
      let hasValidUpperBand = false;
      for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        if (band && typeof band.upper === 'number' && !isNaN(band.upper) && band.upper > 0) {
          const x = xScale(i);
          const y = yScale(band.upper);
          if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
            if (!hasValidUpperBand) {
              ctx.moveTo(x, y);
              hasValidUpperBand = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
      }
      if (hasValidUpperBand) ctx.stroke();

      // Middle band (SMA)
      ctx.strokeStyle = '#6B7280';
      ctx.beginPath();
      let hasValidMiddleBand = false;
      for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        if (band && typeof band.middle === 'number' && !isNaN(band.middle) && band.middle > 0) {
          const x = xScale(i);
          const y = yScale(band.middle);
          if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
            if (!hasValidMiddleBand) {
              ctx.moveTo(x, y);
              hasValidMiddleBand = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
      }
      if (hasValidMiddleBand) ctx.stroke();

      // Lower band
      ctx.strokeStyle = '#E5E7EB';
      ctx.beginPath();
      let hasValidLowerBand = false;
      for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        if (band && typeof band.lower === 'number' && !isNaN(band.lower) && band.lower > 0) {
          const x = xScale(i);
          const y = yScale(band.lower);
          if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
            if (!hasValidLowerBand) {
              ctx.moveTo(x, y);
              hasValidLowerBand = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
      }
      if (hasValidLowerBand) ctx.stroke();

      // Draw price line with safety checks
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let hasValidPriceLine = false;
      for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        if (candle && typeof candle.close === 'number' && !isNaN(candle.close) && candle.close > 0) {
          const x = xScale(i);
          const y = yScale(candle.close);
          if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
            if (!hasValidPriceLine) {
              ctx.moveTo(x, y);
              hasValidPriceLine = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
      }
      if (hasValidPriceLine) ctx.stroke();

      // Draw trade markers with safety checks
      if (trades && Array.isArray(trades)) {
        for (const trade of trades) {
          if (!trade || typeof trade.entryTime !== 'number' || typeof trade.entryPrice !== 'number') {
            continue;
          }
          
          if (isNaN(trade.entryTime) || isNaN(trade.entryPrice) || trade.entryPrice <= 0) {
            continue;
          }

          const entryIndex = candles.findIndex(c => c && typeof c.timestamp === 'number' && c.timestamp >= trade.entryTime);
          if (entryIndex >= 0 && entryIndex < candles.length) {
            const x = xScale(entryIndex);
            const y = yScale(trade.entryPrice);
            
            if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
              // Entry marker
              ctx.fillStyle = trade.position === 'long' ? '#10B981' : '#EF4444';
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, 2 * Math.PI);
              ctx.fill();

              // Add position indicator
              ctx.fillStyle = trade.position === 'long' ? '#10B981' : '#EF4444';
              ctx.font = '10px Arial';
              ctx.fillText(trade.position === 'long' ? 'L' : 'S', x - 3, y - 8);

              // Exit marker
              if (trade.exitTime && trade.exitPrice && 
                  typeof trade.exitTime === 'number' && typeof trade.exitPrice === 'number' &&
                  !isNaN(trade.exitTime) && !isNaN(trade.exitPrice) && trade.exitPrice > 0) {
                
                const exitIndex = candles.findIndex(c => c && typeof c.timestamp === 'number' && c.timestamp >= trade.exitTime!);
                if (exitIndex >= 0 && exitIndex < candles.length) {
                  const exitX = xScale(exitIndex);
                  const exitY = yScale(trade.exitPrice);
                  
                  if (typeof exitX === 'number' && typeof exitY === 'number' && !isNaN(exitX) && !isNaN(exitY)) {
                    ctx.fillStyle = (trade.pnl && trade.pnl > 0) ? '#10B981' : '#EF4444';
                    ctx.beginPath();
                    ctx.arc(exitX, exitY, 4, 0, 2 * Math.PI);
                    ctx.fill();

                    // Trade line
                    ctx.strokeStyle = (trade.pnl && trade.pnl > 0) ? '#10B981' : '#EF4444';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(exitX, exitY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                  }
                }
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Chart rendering error:', error);
      // Clear canvas on error to prevent partial rendering
      ctx.clearRect(0, 0, width, height);
      
      // Draw error message
      ctx.fillStyle = '#EF4444';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Chart Error - Data Processing Issue', width / 2, height / 2);
    }

  }, [candles, bands, trades, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-200 rounded-lg"
    />
  );
}
            ctx.moveTo(x, y);
            hasValidUpperBand = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      if (hasValidUpperBand) ctx.stroke();

      // Middle band (SMA)
      ctx.strokeStyle = '#6B7280';
      ctx.beginPath();
      let hasValidMiddleBand = false;
      bands.forEach((band, i) => {
        if (band && typeof band.middle === 'number' && !isNaN(band.middle) && band.middle > 0) {
          const x = xScale(i);
          const y = yScale(band.middle);
          if (!hasValidMiddleBand) {
            ctx.moveTo(x, y);
            hasValidMiddleBand = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      if (hasValidMiddleBand) ctx.stroke();

      // Lower band
      ctx.strokeStyle = '#E5E7EB';
      ctx.beginPath();
      let hasValidLowerBand = false;
      bands.forEach((band, i) => {
        if (band && typeof band.lower === 'number' && !isNaN(band.lower) && band.lower > 0) {
          const x = xScale(i);
          const y = yScale(band.lower);
          if (!hasValidLowerBand) {
            ctx.moveTo(x, y);
            hasValidLowerBand = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      if (hasValidLowerBand) ctx.stroke();

      // Draw price line with safety checks
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let hasValidPriceLine = false;
      candles.forEach((candle, i) => {
        if (candle && typeof candle.close === 'number' && !isNaN(candle.close)) {
          const x = xScale(i);
          const y = yScale(candle.close);
          if (!hasValidPriceLine) {
            ctx.moveTo(x, y);
            hasValidPriceLine = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      if (hasValidPriceLine) ctx.stroke();

      // Draw trade markers with safety checks
      if (trades && Array.isArray(trades)) {
        trades.forEach(trade => {
          if (!trade || typeof trade.entryTime !== 'number' || typeof trade.entryPrice !== 'number') {
            return;
          }

          const entryIndex = candles.findIndex(c => c && c.timestamp >= trade.entryTime);
          if (entryIndex >= 0 && entryIndex < candles.length) {
            const x = xScale(entryIndex);
            const y = yScale(trade.entryPrice);
            
            // Entry marker
            ctx.fillStyle = trade.position === 'long' ? '#10B981' : '#EF4444';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Add position indicator
            ctx.fillStyle = trade.position === 'long' ? '#10B981' : '#EF4444';
            ctx.font = '10px Arial';
            ctx.fillText(trade.position === 'long' ? 'L' : 'S', x - 3, y - 8);

            // Exit marker
            if (trade.exitTime && trade.exitPrice && typeof trade.exitTime === 'number' && typeof trade.exitPrice === 'number') {
              const exitIndex = candles.findIndex(c => c && c.timestamp >= trade.exitTime!);
              if (exitIndex >= 0 && exitIndex < candles.length) {
                const exitX = xScale(exitIndex);
                const exitY = yScale(trade.exitPrice);
                
                ctx.fillStyle = (trade.pnl && trade.pnl > 0) ? '#10B981' : '#EF4444';
                ctx.beginPath();
                ctx.arc(exitX, exitY, 4, 0, 2 * Math.PI);
                ctx.fill();

                // Trade line
                ctx.strokeStyle = (trade.pnl && trade.pnl > 0) ? '#10B981' : '#EF4444';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(exitX, exitY);
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }
          }
        });
      }

    } catch (error) {
      console.error('Chart rendering error:', error);
      // Clear canvas on error to prevent partial rendering
      ctx.clearRect(0, 0, width, height);
      
      // Draw error message
      ctx.fillStyle = '#EF4444';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Chart Error - Data Processing Issue', width / 2, height / 2);
    }

  }, [candles, bands, trades, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-200 rounded-lg"
    />
  );
}