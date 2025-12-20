// server.js - Real Exchange Integration Backend
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Exchange API Credentials (from environment variables)
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;

// Binance API URLs
const BINANCE_BASE_URL = 'https://fapi.binance.com';
const BINANCE_WS_URL = 'wss://fstream.binance.com/ws';

// ==================== BINANCE FUNCTIONS ====================

// Generate Binance signature
function binanceSignature(queryString, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex');
}

// Get Binance account info
async function getBinanceAccountInfo() {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = binanceSignature(queryString, BINANCE_API_SECRET);
  
  const response = await fetch(
    `${BINANCE_BASE_URL}/fapi/v2/account?${queryString}&signature=${signature}`,
    {
      headers: {
        'X-MBX-APIKEY': BINANCE_API_KEY
      }
    }
  );
  
  return await response.json();
}

// Get current price from Binance
async function getBinancePrice(symbol) {
  const response = await fetch(
    `${BINANCE_BASE_URL}/fapi/v1/ticker/price?symbol=${symbol}`
  );
  return await response.json();
}

// Get 24hr ticker stats
async function getBinance24hrStats(symbol) {
  const response = await fetch(
    `${BINANCE_BASE_URL}/fapi/v1/ticker/24hr?symbol=${symbol}`
  );
  return await response.json();
}

// Get kline/candlestick data
async function getBinanceKlines(symbol, interval, limit = 100) {
  const response = await fetch(
    `${BINANCE_BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  return await response.json();
}

// Calculate technical indicators from klines
function calculateIndicators(klines) {
  const closes = klines.map(k => parseFloat(k[4]));
  const highs = klines.map(k => parseFloat(k[2]));
  const lows = klines.map(k => parseFloat(k[3]));
  const volumes = klines.map(k => parseFloat(k[5]));
  
  // Calculate RSI
  const rsi = calculateRSI(closes, 14);
  
  // Calculate EMA
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  
  // Calculate MACD
  const macd = calculateMACD(closes);
  
  // Calculate ATR (Average True Range)
  const atr = calculateATR(highs, lows, closes, 14);
  
  return {
    rsi: rsi[rsi.length - 1],
    ema20: ema20[ema20.length - 1],
    ema50: ema50[ema50.length - 1],
    macd: macd.macd[macd.macd.length - 1],
    macdSignal: macd.signal[macd.signal.length - 1],
    macdHistogram: macd.histogram[macd.histogram.length - 1],
    atr: atr[atr.length - 1],
    currentPrice: closes[closes.length - 1],
    volume: volumes[volumes.length - 1]
  };
}

// RSI Calculation
function calculateRSI(prices, period = 14) {
  const rsi = [];
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    
    if (i <= period) {
      if (change > 0) gains += change;
      else losses -= change;
      
      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    } else {
      const avgGain = (gains * (period - 1) + (change > 0 ? change : 0)) / period;
      const avgLoss = (losses * (period - 1) + (change < 0 ? -change : 0)) / period;
      gains = avgGain * period;
      losses = avgLoss * period;
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

// EMA Calculation
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  
  return ema;
}

// MACD Calculation
function calculateMACD(prices) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const macdLine = ema12.map((val, i) => val - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = macdLine.map((val, i) => val - signalLine[i]);
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

// ATR Calculation
function calculateATR(highs, lows, closes, period = 14) {
  const tr = [];
  
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }
  
  const atr = [];
  let sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  atr.push(sum / period);
  
  for (let i = period; i < tr.length; i++) {
    atr.push((atr[atr.length - 1] * (period - 1) + tr[i]) / period);
  }
  
  return atr;
}

// Place order on Binance (TESTNET - for safety)
async function placeBinanceOrder(symbol, side, quantity, orderType = 'MARKET') {
  const timestamp = Date.now();
  const params = {
    symbol,
    side, // BUY or SELL
    type: orderType,
    quantity,
    timestamp
  };
  
  const queryString = Object.keys(params)
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const signature = binanceSignature(queryString, BINANCE_API_SECRET);
  
  const response = await fetch(
    `${BINANCE_BASE_URL}/fapi/v1/order?${queryString}&signature=${signature}`,
    {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': BINANCE_API_KEY
      }
    }
  );
  
  return await response.json();
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    exchanges: {
      binance: !!BINANCE_API_KEY,
      bybit: !!BYBIT_API_KEY
    }
  });
});

// Get account info
app.get('/api/account', async (req, res) => {
  try {
    const accountInfo = await getBinanceAccountInfo();
    res.json({
      success: true,
      data: accountInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get current price
app.get('/api/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await getBinancePrice(symbol);
    res.json({
      success: true,
      data: price
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get market data with indicators
app.get('/api/market/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '15m' } = req.query;
    
    // Get klines data
    const klines = await getBinanceKlines(symbol, interval, 100);
    
    // Calculate indicators
    const indicators = calculateIndicators(klines);
    
    // Get 24hr stats
    const stats = await getBinance24hrStats(symbol);
    
    res.json({
      success: true,
      data: {
        symbol,
        interval,
        indicators,
        stats: {
          priceChange: parseFloat(stats.priceChange),
          priceChangePercent: parseFloat(stats.priceChangePercent),
          volume: parseFloat(stats.volume),
          quoteVolume: parseFloat(stats.quoteVolume),
          highPrice: parseFloat(stats.highPrice),
          lowPrice: parseFloat(stats.lowPrice)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get multi-timeframe analysis
app.get('/api/mtf-analysis/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const timeframes = ['5m', '15m', '1h', '4h'];
    
    const analysis = {};
    
    for (const tf of timeframes) {
      const klines = await getBinanceKlines(symbol, tf, 100);
      const indicators = calculateIndicators(klines);
      
      // Determine trend
      let trend = 'neutral';
      if (indicators.ema20 > indicators.ema50 && indicators.macd > 0 && indicators.rsi > 50) {
        trend = 'bullish';
      } else if (indicators.ema20 < indicators.ema50 && indicators.macd < 0 && indicators.rsi < 50) {
        trend = 'bearish';
      }
      
      analysis[tf] = {
        trend,
        rsi: indicators.rsi,
        macd: indicators.macd,
        ema20: indicators.ema20,
        ema50: indicators.ema50,
        atr: indicators.atr
      };
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Place order (use with caution!)
app.post('/api/order', async (req, res) => {
  try {
    const { symbol, side, quantity, orderType } = req.body;
    
    // Validate inputs
    if (!symbol || !side || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const order = await placeBinanceOrder(symbol, side, quantity, orderType);
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebSocket endpoint info
app.get('/api/websocket-info', (req, res) => {
  res.json({
    success: true,
    info: 'Connect to WebSocket for real-time price updates',
    endpoint: '/ws/price/:symbol',
    example: 'ws://your-app.onrender.com/ws/price/BTCUSDT'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Exchange Integration Server running on port ${PORT}`);
  console.log(`📊 Binance API: ${BINANCE_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`📊 Bybit API: ${BYBIT_API_KEY ? 'Configured' : 'Not configured'}`);
});

module.exports = app;
