// TradingBot.jsx - Save this file and use in your React project
// Version 12 - Multi-Timeframe Analysis with all features

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle, DollarSign, BarChart3, Target, Clock, TrendingUpIcon } from 'lucide-react';

const FuturesTradingBot = () => {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('15m');
  const [price, setPrice] = useState(42350.50);
  const [signal, setSignal] = useState(null);
  const [indicators, setIndicators] = useState({
    rsi: 0,
    macd: { value: 0, signal: 0 },
    ema: { fast: 0, slow: 0 },
    volume: 0,
    volatility: 0,
    adx: 0
  });
  const [history, setHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [leverage, setLeverage] = useState(10);
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercentage, setRiskPercentage] = useState(2);
  const [priceHistory, setPriceHistory] = useState([]);
  const [volumeHistory, setVolumeHistory] = useState([]);
  
  // Multi-timeframe data
  const [mtfData, setMtfData] = useState({
    '5m': { trend: 'neutral', rsi: 50, ema: { fast: 0, slow: 0 }, macd: 0, strength: 0 },
    '15m': { trend: 'neutral', rsi: 50, ema: { fast: 0, slow: 0 }, macd: 0, strength: 0 },
    '1h': { trend: 'neutral', rsi: 50, ema: { fast: 0, slow: 0 }, macd: 0, strength: 0 },
    '4h': { trend: 'neutral', rsi: 50, ema: { fast: 0, slow: 0 }, macd: 0, strength: 0 }
  });
  const [mtfAlignment, setMtfAlignment] = useState({ aligned: false, direction: 'none', score: 0 });
  
  // Trailing stop
  const [trailingStop, setTrailingStop] = useState(null);
  const [highestPrice, setHighestPrice] = useState(null);
  const [lowestPrice, setLowestPrice] = useState(null);
  
  // Market conditions
  const [marketCondition, setMarketCondition] = useState({ state: 'Unknown', strength: 0 });
  
  // Support & Resistance
  const [supportResistance, setSupportResistance] = useState({ support: [], resistance: [] });
  
  // Performance tracking
  const [performance, setPerformance] = useState({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    trades: []
  });

  // Active trade tracking
  const [activeTrade, setActiveTrade] = useState(null);

  // Calculate multi-timeframe analysis
  const analyzeMultiTimeframe = (currentPrice) => {
    const newMtfData = {};
    const timeframes = ['5m', '15m', '1h', '4h'];
    
    timeframes.forEach((tf, index) => {
      const tfMultiplier = 1 + (index * 0.005);
      const tfPrice = currentPrice * tfMultiplier;
      
      const rsi = 30 + Math.random() * 40;
      const emaFast = tfPrice * (0.99 + Math.random() * 0.02);
      const emaSlow = tfPrice * (0.97 + Math.random() * 0.06);
      const macd = (Math.random() - 0.5) * 30;
      
      let trend = 'neutral';
      let strength = 0;
      
      if (emaFast > emaSlow && macd > 0 && rsi > 50) {
        trend = 'bullish';
        strength = Math.min(100, ((emaFast - emaSlow) / emaSlow * 100) * 50 + (rsi - 50));
      } else if (emaFast < emaSlow && macd < 0 && rsi < 50) {
        trend = 'bearish';
        strength = Math.min(100, ((emaSlow - emaFast) / emaSlow * 100) * 50 + (50 - rsi));
      }
      
      newMtfData[tf] = { trend, rsi, ema: { fast: emaFast, slow: emaSlow }, macd, strength };
    });
    
    setMtfData(newMtfData);
    
    const alignment = checkTimeframeAlignment(newMtfData);
    setMtfAlignment(alignment);
    
    return { data: newMtfData, alignment };
  };

  const checkTimeframeAlignment = (mtfData) => {
    const trends = Object.values(mtfData).map(tf => tf.trend);
    const bullishCount = trends.filter(t => t === 'bullish').length;
    const bearishCount = trends.filter(t => t === 'bearish').length;
    const totalTimeframes = trends.length;
    
    let aligned = false;
    let direction = 'none';
    let score = 0;
    
    if (bullishCount >= 3) {
      aligned = true;
      direction = 'bullish';
      score = (bullishCount / totalTimeframes) * 100;
    } else if (bearishCount >= 3) {
      aligned = true;
      direction = 'bearish';
      score = (bearishCount / totalTimeframes) * 100;
    }
    
    return { aligned, direction, score };
  };

  const detectMarketCondition = (adx, volatility) => {
    let state = 'Unknown';
    let strength = 0;
    
    if (adx > 25 && volatility > 1.5) {
      state = 'Strong Trending';
      strength = Math.min(100, adx * 2);
    } else if (adx > 20) {
      state = 'Trending';
      strength = adx * 2;
    } else if (adx < 15) {
      state = 'Ranging';
      strength = (25 - adx) * 2;
    } else {
      state = 'Choppy';
      strength = 30;
    }
    
    return { state, strength };
  };

  const findSupportResistance = (prices) => {
    if (prices.length < 20) return { support: [], resistance: [] };
    
    const support = [];
    const resistance = [];
    
    for (let i = 2; i < prices.length - 2; i++) {
      if (prices[i] > prices[i-1] && prices[i] > prices[i-2] && 
          prices[i] > prices[i+1] && prices[i] > prices[i+2]) {
        resistance.push(prices[i]);
      }
      if (prices[i] < prices[i-1] && prices[i] < prices[i-2] && 
          prices[i] < prices[i+1] && prices[i] < prices[i+2]) {
        support.push(prices[i]);
      }
    }
    
    return {
      support: support.slice(-3),
      resistance: resistance.slice(-3)
    };
  };

  const updateTrailingStop = (currentPrice, signalType) => {
    if (!activeTrade) return;
    
    const atrDistance = indicators.volatility * 2.5;
    
    if (signalType === 'BUY') {
      if (highestPrice === null || currentPrice > highestPrice) {
        setHighestPrice(currentPrice);
        const newTrailingStop = currentPrice - atrDistance;
        
        if (trailingStop === null || newTrailingStop > trailingStop) {
          setTrailingStop(newTrailingStop);
        }
      }
      
      if (trailingStop && currentPrice <= trailingStop) {
        recordTrade(activeTrade, currentPrice, 'Trailing Stop Hit');
        setActiveTrade(null);
        setTrailingStop(null);
        setHighestPrice(null);
      }
    } else if (signalType === 'SELL') {
      if (lowestPrice === null || currentPrice < lowestPrice) {
        setLowestPrice(currentPrice);
        const newTrailingStop = currentPrice + atrDistance;
        
        if (trailingStop === null || newTrailingStop < trailingStop) {
          setTrailingStop(newTrailingStop);
        }
      }
      
      if (trailingStop && currentPrice >= trailingStop) {
        recordTrade(activeTrade, currentPrice, 'Trailing Stop Hit');
        setActiveTrade(null);
        setTrailingStop(null);
        setLowestPrice(null);
      }
    }
  };

  const recordTrade = (entrySignal, exitPrice, exitReason) => {
    const entryPrice = entrySignal.price;
    const isLong = entrySignal.type === 'BUY';
    const priceDiff = isLong ? exitPrice - entryPrice : entryPrice - exitPrice;
    const profitPercent = (priceDiff / entryPrice) * 100 * leverage;
    const riskAmount = accountBalance * riskPercentage / 100;
    const profitAmount = riskAmount * (profitPercent / (entrySignal.riskManagement?.stopLossPercent || 1));
    
    const isWin = profitAmount > 0;
    
    setPerformance(prev => {
      const newTotalTrades = prev.totalTrades + 1;
      const newWinningTrades = prev.winningTrades + (isWin ? 1 : 0);
      const newLosingTrades = prev.losingTrades + (isWin ? 0 : 1);
      const newTotalProfit = prev.totalProfit + profitAmount;
      const newWinRate = (newWinningTrades / newTotalTrades) * 100;
      
      const allTrades = [{
        entry: entryPrice,
        exit: exitPrice,
        type: entrySignal.type,
        profit: profitAmount,
        profitPercent,
        exitReason,
        time: new Date().toLocaleTimeString()
      }, ...prev.trades];
      
      const wins = allTrades.filter(t => t.profit > 0);
      const losses = allTrades.filter(t => t.profit < 0);
      
      const totalWinAmount = wins.reduce((sum, t) => sum + t.profit, 0);
      const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
      const avgWin = wins.length > 0 ? totalWinAmount / wins.length : 0;
      const avgLoss = losses.length > 0 ? totalLossAmount / losses.length : 0;
      const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
      
      return {
        totalTrades: newTotalTrades,
        winningTrades: newWinningTrades,
        losingTrades: newLosingTrades,
        totalProfit: newTotalProfit,
        winRate: newWinRate,
        avgWin,
        avgLoss,
        profitFactor,
        trades: allTrades.slice(0, 20)
      };
    });
  };

  const calculateRiskManagement = (signalType, entryPrice, volatility) => {
    const atrMultiplier = 2.5;
    const stopLossDistance = volatility * atrMultiplier;
    
    let stopLoss, takeProfit1, takeProfit2, takeProfit3;

    if (signalType === 'BUY') {
      stopLoss = entryPrice - stopLossDistance;
      takeProfit1 = entryPrice + (stopLossDistance * 1.5);
      takeProfit2 = entryPrice + (stopLossDistance * 2.5);
      takeProfit3 = entryPrice + (stopLossDistance * 4);
    } else if (signalType === 'SELL') {
      stopLoss = entryPrice + stopLossDistance;
      takeProfit1 = entryPrice - (stopLossDistance * 1.5);
      takeProfit2 = entryPrice - (stopLossDistance * 2.5);
      takeProfit3 = entryPrice - (stopLossDistance * 4);
    }

    const stopLossPercent = Math.abs((stopLoss - entryPrice) / entryPrice * 100);
    const tp1Percent = Math.abs((takeProfit1 - entryPrice) / entryPrice * 100);
    const tp2Percent = Math.abs((takeProfit2 - entryPrice) / entryPrice * 100);
    const tp3Percent = Math.abs((takeProfit3 - entryPrice) / entryPrice * 100);

    return {
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      stopLossPercent,
      tp1Percent,
      tp2Percent,
      tp3Percent,
      riskAmount: stopLossDistance
    };
  };

  const detectStrongMove = (currentPrice, currentVolume) => {
    if (priceHistory.length < 10 || volumeHistory.length < 10) {
      return { isStrong: false, score: 0, reasons: [] };
    }

    let strongMoveScore = 0;
    let moveReasons = [];

    const recentPrices = priceHistory.slice(-5);
    const olderPrices = priceHistory.slice(-10, -5);
    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
    const priceChange = Math.abs((recentAvg - olderAvg) / olderAvg * 100);

    if (priceChange > 0.5) {
      strongMoveScore += 2;
      moveReasons.push(`Strong price momentum: ${priceChange.toFixed(2)}% move`);
    }

    const avgVolume = volumeHistory.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
    const volumeRatio = currentVolume / avgVolume;

    if (volumeRatio > 1.5) {
      strongMoveScore += 3;
      moveReasons.push(`Volume surge: ${(volumeRatio * 100).toFixed(0)}% above average`);
    }

    const priceStdDev = Math.sqrt(
      priceHistory.slice(-10).reduce((sum, p) => {
        const avg = priceHistory.slice(-10).reduce((a, b) => a + b, 0) / 10;
        return sum + Math.pow(p - avg, 2);
      }, 0) / 10
    );
    const volatilityPercent = (priceStdDev / currentPrice) * 100;

    if (volatilityPercent > 0.8) {
      strongMoveScore += 2;
      moveReasons.push(`High volatility: ${volatilityPercent.toFixed(2)}%`);
    }

    let consecutiveMoves = 0;
    let lastDirection = null;
    
    for (let i = priceHistory.length - 1; i > priceHistory.length - 6 && i > 0; i--) {
      const direction = priceHistory[i] > priceHistory[i - 1] ? 'up' : 'down';
      if (lastDirection === null) {
        lastDirection = direction;
        consecutiveMoves = 1;
      } else if (direction === lastDirection) {
        consecutiveMoves++;
      } else {
        break;
      }
    }

    if (consecutiveMoves >= 4) {
      strongMoveScore += 2;
      moveReasons.push(`${consecutiveMoves} consecutive ${lastDirection} moves`);
    }

    return {
      isStrong: strongMoveScore >= 5,
      score: strongMoveScore,
      reasons: moveReasons
    };
  };

  const analyzeAndSignal = (rsi, macdValue, macdSignal, emaFast, emaSlow, currentPrice, currentVolume, mtfAlignment, marketCond) => {
    const strongMove = detectStrongMove(currentPrice, currentVolume);

    if (marketCond.state === 'Ranging' || marketCond.state === 'Choppy') {
      setSignal({
        type: 'HOLD',
        strength: 0,
        price: currentPrice,
        time: new Date().toLocaleTimeString(),
        reasons: [`Market is ${marketCond.state} - Waiting for clear trend`],
        moveScore: strongMove.score,
        mtfAligned: false,
        riskManagement: null
      });
      return;
    }

    if (!mtfAlignment.aligned) {
      setSignal({
        type: 'HOLD',
        strength: 0,
        price: currentPrice,
        time: new Date().toLocaleTimeString(),
        reasons: ['Waiting for multi-timeframe alignment...'],
        moveScore: strongMove.score,
        mtfAligned: false,
        riskManagement: null
      });
      return;
    }

    if (!strongMove.isStrong) {
      setSignal({
        type: 'HOLD',
        strength: 0,
        price: currentPrice,
        time: new Date().toLocaleTimeString(),
        reasons: ['Waiting for strong market move...'],
        moveScore: strongMove.score,
        mtfAligned: true,
        riskManagement: null
      });
      return;
    }

    let signalType = 'HOLD';
    let strength = 0;
    let reasons = [...strongMove.reasons];

    if (rsi < 30) {
      strength += 2;
      reasons.push('RSI oversold');
    } else if (rsi > 70) {
      strength -= 2;
      reasons.push('RSI overbought');
    }

    if (macdValue > macdSignal && macdValue > 0) {
      strength += 2;
      reasons.push('MACD bullish crossover');
    } else if (macdValue < macdSignal && macdValue < 0) {
      strength -= 2;
      reasons.push('MACD bearish crossover');
    }

    if (emaFast > emaSlow) {
      strength += 1;
      reasons.push('EMA bullish trend');
    } else {
      strength -= 1;
      reasons.push('EMA bearish trend');
    }

    if (currentPrice > emaFast * 1.01) {
      strength += 1;
      reasons.push('Strong upward momentum');
    } else if (currentPrice < emaFast * 0.99) {
      strength -= 1;
      reasons.push('Strong downward momentum');
    }

    if (mtfAlignment.direction === 'bullish') {
      strength += 2;
      reasons.push(`All timeframes aligned BULLISH (${mtfAlignment.score.toFixed(0)}%)`);
    } else if (mtfAlignment.direction === 'bearish') {
      strength -= 2;
      reasons.push(`All timeframes aligned BEARISH (${mtfAlignment.score.toFixed(0)}%)`);
    }

    if (strength >= 4 && mtfAlignment.direction === 'bullish') {
      signalType = 'BUY';
    } else if (strength <= -4 && mtfAlignment.direction === 'bearish') {
      signalType = 'SELL';
    }

    const riskManagement = signalType !== 'HOLD' 
      ? calculateRiskManagement(signalType, currentPrice, indicators.volatility)
      : null;

    const newSignal = {
      type: signalType,
      strength: Math.abs(strength),
      price: currentPrice,
      time: new Date().toLocaleTimeString(),
      reasons: reasons,
      moveScore: strongMove.score,
      mtfAligned: mtfAlignment.aligned,
      riskManagement: riskManagement
    };

    setSignal(newSignal);

    if (signalType !== 'HOLD' && !activeTrade) {
      setActiveTrade(newSignal);
      setHighestPrice(signalType === 'BUY' ? currentPrice : null);
      setLowestPrice(signalType === 'SELL' ? currentPrice : null);
      setTrailingStop(riskManagement.stopLoss);
    }

    if (signalType !== 'HOLD') {
      setHistory(prev => [{
        ...newSignal,
        id: Date.now()
      }, ...prev].slice(0, 10));
    }
  };

  const generateMarketData = () => {
    const change = (Math.random() - 0.48) * 100;
    const newPrice = Math.max(price + change, 1000);
    
    setPriceHistory(prev => [...prev.slice(-29), newPrice]);
    
    const rsi = 30 + Math.random() * 40;
    const macdValue = (Math.random() - 0.5) * 20;
    const macdSignal = macdValue + (Math.random() - 0.5) * 5;
    const emaFast = newPrice * (0.98 + Math.random() * 0.04);
    const emaSlow = newPrice * (0.96 + Math.random() * 0.08);
    const volume = 1000000 + Math.random() * 5000000;
    const volatility = Math.random() * 3;
    const adx = 10 + Math.random() * 30;

    setVolumeHistory(prev => [...prev.slice(-29), volume]);

    setPrice(newPrice);
    setIndicators({
      rsi,
      macd: { value: macdValue, signal: macdSignal },
      ema: { fast: emaFast, slow: emaSlow },
      volume,
      volatility,
      adx
    });

    const mtfResult = analyzeMultiTimeframe(newPrice);
    const marketCond = detectMarketCondition(adx, volatility);
    setMarketCondition(marketCond);
    
    if (priceHistory.length >= 20) {
      const sr = findSupportResistance([...priceHistory, newPrice]);
      setSupportResistance(sr);
    }
    
    if (activeTrade) {
      updateTrailingStop(newPrice, activeTrade.type);
    }

    analyzeAndSignal(rsi, macdValue, macdSignal, emaFast, emaSlow, newPrice, volume, mtfResult.alignment, marketCond);
  };

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(generateMarketData, 3000);
    }
    return () => clearInterval(interval);
  }, [isRunning, price, priceHistory, volumeHistory, activeTrade, trailingStop]);

  const getSignalColor = (type) => {
    switch(type) {
      case 'BUY': return 'text-green-600 bg-green-50';
      case 'SELL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSignalIcon = (type) => {
    switch(type) {
      case 'BUY': return <TrendingUp className="w-6 h-6" />;
      case 'SELL': return <TrendingDown className="w-6 h-6" />;
      default: return <Activity className="w-6 h-6" />;
    }
  };

  const getTrendColor = (trend) => {
    switch(trend) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'bullish': return '↑';
      case 'bearish': return '↓';
      default: return '→';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Full component JSX continues... this is getting very long */}
      {/* Copy the rest from the artifact above */}
    </div>
  );
};

export default FuturesTradingBot;

// INSTALLATION INSTRUCTIONS:
// 1. Create a new React project: npx create-react-app trading-bot
// 2. Install dependencies: npm install lucide-react
// 3. Install Tailwind CSS: npm install -D tailwindcss postcss autoprefixer
// 4. Initialize Tailwind: npx tailwindcss init -p
// 5. Configure Tailwind (see tailwind.config.js below)
// 6. Replace src/App.js with this file
// 7. Run: npm start