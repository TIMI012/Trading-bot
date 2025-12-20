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
      // Simulate different price ranges for each timeframe
      const tfMultiplier = 1 + (index * 0.005);
      const tfPrice = currentPrice * tfMultiplier;
      
      // Calculate indicators for each timeframe
      const rsi = 30 + Math.random() * 40;
      const emaFast = tfPrice * (0.99 + Math.random() * 0.02);
      const emaSlow = tfPrice * (0.97 + Math.random() * 0.06);
      const macd = (Math.random() - 0.5) * 30;
      
      // Determine trend
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
    
    // Check for alignment
    const alignment = checkTimeframeAlignment(newMtfData);
    setMtfAlignment(alignment);
    
    return { data: newMtfData, alignment };
  };

  // Check if timeframes are aligned
  const checkTimeframeAlignment = (mtfData) => {
    const trends = Object.values(mtfData).map(tf => tf.trend);
    const bullishCount = trends.filter(t => t === 'bullish').length;
    const bearishCount = trends.filter(t => t === 'bearish').length;
    const totalTimeframes = trends.length;
    
    let aligned = false;
    let direction = 'none';
    let score = 0;
    
    // Require at least 3 out of 4 timeframes to align
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

  // Detect market conditions using ADX
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

  // Find support and resistance levels
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

  // Update trailing stop
  const updateTrailingStop = (currentPrice, signalType) => {
    if (!activeTrade) return;
    
    const atrDistance = indicators.volatility * 2.5;
    
    if (signalType === 'BUY') {
      if (highestPrice === null || currentPrice > highestPrice) {
        setHighestPrice(currentPrice);
        const newTrailingStop = currentPrice - atrDistance;
        
        // Only update if new trailing stop is higher
        if (trailingStop === null || newTrailingStop > trailingStop) {
          setTrailingStop(newTrailingStop);
        }
      }
      
      // Check if trailing stop hit
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

  // Record trade for performance tracking
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

    // Check market conditions - avoid ranging markets
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

    // Require multi-timeframe alignment
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

    // RSI Analysis
    if (rsi < 30) {
      strength += 2;
      reasons.push('RSI oversold');
    } else if (rsi > 70) {
      strength -= 2;
      reasons.push('RSI overbought');
    }

    // MACD Analysis
    if (macdValue > macdSignal && macdValue > 0) {
      strength += 2;
      reasons.push('MACD bullish crossover');
    } else if (macdValue < macdSignal && macdValue < 0) {
      strength -= 2;
      reasons.push('MACD bearish crossover');
    }

    // EMA Analysis
    if (emaFast > emaSlow) {
      strength += 1;
      reasons.push('EMA bullish trend');
    } else {
      strength -= 1;
      reasons.push('EMA bearish trend');
    }

    // Price momentum
    if (currentPrice > emaFast * 1.01) {
      strength += 1;
      reasons.push('Strong upward momentum');
    } else if (currentPrice < emaFast * 0.99) {
      strength -= 1;
      reasons.push('Strong downward momentum');
    }

    // Multi-timeframe confirmation
    if (mtfAlignment.direction === 'bullish') {
      strength += 2;
      reasons.push(`All timeframes aligned BULLISH (${mtfAlignment.score.toFixed(0)}%)`);
    } else if (mtfAlignment.direction === 'bearish') {
      strength -= 2;
      reasons.push(`All timeframes aligned BEARISH (${mtfAlignment.score.toFixed(0)}%)`);
    }

    // Determine signal
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

    // Start active trade
    if (signalType !== 'HOLD' && !activeTrade) {
      setActiveTrade(newSignal);
      setHighestPrice(signalType === 'BUY' ? currentPrice : null);
      setLowestPrice(signalType === 'SELL' ? currentPrice : null);
      setTrailingStop(riskManagement.stopLoss);
    }

    // Add to history
    if (signalType !== 'HOLD') {
      setHistory(prev => [{
        ...newSignal,
        id: Date.now()
      }, ...prev].slice(0, 10));
    }
  };

  // Simulated market data generator
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

    // Update multi-timeframe analysis
    const mtfResult = analyzeMultiTimeframe(newPrice);
    
    // Update market conditions
    const marketCond = detectMarketCondition(adx, volatility);
    setMarketCondition(marketCond);
    
    // Update support/resistance
    if (priceHistory.length >= 20) {
      const sr = findSupportResistance([...priceHistory, newPrice]);
      setSupportResistance(sr);
    }
    
    // Update trailing stop if active trade
    if (activeTrade) {
      updateTrailingStop(newPrice, activeTrade.type);
    }

    // Generate signal
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Futures Trading Bot</h1>
                <p className="text-gray-400 text-sm">Advanced Multi-Timeframe Analysis</p>
              </div>
            </div>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                isRunning 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRunning ? 'Stop Bot' : 'Start Bot'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-sm">Symbol</label>
              <select 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 mt-1"
              >
                <option>BTC/USDT</option>
                <option>ETH/USDT</option>
                <option>SOL/USDT</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Timeframe</label>
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 mt-1"
              >
                <option>1m</option>
                <option>5m</option>
                <option>15m</option>
                <option>1h</option>
                <option>4h</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Current Price</label>
              <div className="text-2xl font-bold text-white mt-1">
                ${price.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-gray-400 text-sm">Account Balance ($)</label>
              <input 
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Number(e.target.value))}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm">Risk Per Trade (%)</label>
              <input 
                type="number"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(Number(e.target.value))}
                min="0.5"
                max="5"
                step="0.5"
                className="w-full bg-slate-700 text-white rounded px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm">Leverage</label>
              <select 
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 mt-1"
              >
                <option value={1}>1x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
                <option value={20}>20x</option>
                <option value={50}>50x</option>
                <option value={100}>100x</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Timeframe Analysis */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Multi-Timeframe Analysis
            </h2>
            <div className={`px-4 py-2 rounded-lg font-semibold ${
              mtfAlignment.aligned 
                ? mtfAlignment.direction === 'bullish' 
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
                : 'bg-gray-600 text-white'
            }`}>
              {mtfAlignment.aligned 
                ? `${mtfAlignment.direction.toUpperCase()} ALIGNED (${mtfAlignment.score.toFixed(0)}%)`
                : 'NOT ALIGNED'
              }
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(mtfData).map(([tf, data]) => (
              <div key={tf} className="bg-slate-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">{tf.toUpperCase()}</div>
                <div className={`text-2xl font-bold ${getTrendColor(data.trend)} mb-2`}>
                  {getTrendIcon(data.trend)} {data.trend.toUpperCase()}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">RSI:</span>
                    <span className="text-white">{data.rsi.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">MACD:</span>
                    <span className={`${data.macd > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.macd.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Strength:</span>
                    <span className="text-white">{data.strength.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Conditions & Performance Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Market Conditions */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Market Conditions
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">State</span>
                  <span className={`font-bold text-lg ${
                    marketCondition.state.includes('Trending') ? 'text-green-400' : 
                    marketCondition.state === 'Ranging' ? 'text-yellow-400' : 'text-orange-400'
                  }`}>
                    {marketCondition.state}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      marketCondition.state.includes('Trending') ? 'bg-green-500' : 
                      marketCondition.state === 'Ranging' ? 'bg-yellow-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${marketCondition.strength}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="text-gray-400 text-sm mb-2">ADX: {indicators.adx.toFixed(1)}</div>
                <div className="text-xs text-gray-500">
                  {indicators.adx > 25 ? '✓ Strong trend' : indicators.adx > 20 ? '→ Trending' : '✗ Weak trend'}
                </div>
              </div>
              
              {supportResistance.resistance.length > 0 && (
                <div>
                  <div className="text-gray-400 text-sm mb-1">Resistance Levels</div>
                  <div className="flex gap-2 flex-wrap">
                    {supportResistance.resistance.map((level, i) => (
                      <div key={i} className="bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs">
                        ${level.toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {supportResistance.support.length > 0 && (
                <div>
                  <div className="text-gray-400 text-sm mb-1">Support Levels</div>
                  <div className="flex gap-2 flex-wrap">
                    {supportResistance.support.map((level, i) => (
                      <div key={i} className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs">
                        ${level.toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance Tracker */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Performance Tracker
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700 rounded p-3">
                <div className="text-gray-400 text-xs mb-1">Total Trades</div>
                <div className="text-2xl font-bold text-white">{performance.totalTrades}</div>
              </div>
              <div className="bg-slate-700 rounded p-3">
                <div className="text-gray-400 text-xs mb-1">Win Rate</div>
                <div className={`text-2xl font-bold ${performance.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {performance.winRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-700 rounded p-3">
                <div className="text-gray-400 text-xs mb-1">Total P/L</div>
                <div className={`text-2xl font-bold ${performance.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${performance.totalProfit.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-700 rounded p-3">
                <div className="text-gray-400 text-xs mb-1">Profit Factor</div>
                <div className={`text-2xl font-bold ${performance.profitFactor >= 1.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {performance.profitFactor.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Wins: {performance.winningTrades}</div>
                <div className="text-green-400">Avg: ${performance.avgWin.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400">Losses: {performance.losingTrades}</div>
                <div className="text-red-400">Avg: ${performance.avgLoss.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Trade & Trailing Stop */}
        {activeTrade && trailingStop && (
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-2 border-blue-500 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
              Active Trade - Trailing Stop Active
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-gray-400 text-sm">Position</div>
                <div className={`text-xl font-bold ${activeTrade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                  {activeTrade.type} @ ${activeTrade.price.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Current Price</div>
                <div className="text-xl font-bold text-white">${price.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Trailing Stop</div>
                <div className="text-xl font-bold text-orange-400">${trailingStop.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Unrealized P/L</div>
                <div className={`text-xl font-bold ${
                  ((activeTrade.type === 'BUY' ? price - activeTrade.price : activeTrade.price - price) >= 0) 
                    ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${((activeTrade.type === 'BUY' ? price - activeTrade.price : activeTrade.price - price) * 
                    (accountBalance * riskPercentage / 100 / (activeTrade.riskManagement?.stopLossPercent || 1)) * leverage / price).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signal Display */}
        {signal && (
          <div className={`rounded-lg p-6 mb-6 border-2 ${
            signal.type === 'BUY' ? 'bg-green-900/20 border-green-500' :
            signal.type === 'SELL' ? 'bg-red-900/20 border-red-500' :
            'bg-gray-900/20 border-gray-500'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${getSignalColor(signal.type)}`}>
                  {getSignalIcon(signal.type)}
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">{signal.type}</div>
                  <div className="text-gray-400">Strength: {signal.strength}/7</div>
                  {signal.moveScore !== undefined && (
                    <div className="text-sm text-blue-400 mt-1">
                      Market Move: {signal.moveScore}/9 {signal.moveScore >= 5 ? '✓' : '✗'}
                    </div>
                  )}
                  {signal.mtfAligned !== undefined && (
                    <div className={`text-sm mt-1 ${signal.mtfAligned ? 'text-green-400' : 'text-yellow-400'}`}>
                      MTF Aligned: {signal.mtfAligned ? '✓ Yes' : '✗ No'}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-sm">Entry Price</div>
                <div className="text-2xl font-bold text-white">${signal.price.toFixed(2)}</div>
                <div className="text-gray-400 text-sm">{signal.time}</div>
              </div>
            </div>
            <div className="bg-slate-800 rounded p-4 mb-4">
              <div className="text-sm text-gray-400 mb-2">Analysis:</div>
              <ul className="space-y-1">
                {signal.reasons.map((reason, idx) => (
                  <li key={idx} className="text-white flex items-center gap-2">
                    <span className="text-blue-400">•</span> {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Management */}
            {signal.riskManagement && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded p-4">
                  <div className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    Stop Loss & Take Profit
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-red-900/30 rounded">
                      <span className="text-red-400 font-semibold">Stop Loss</span>
                      <div className="text-right">
                        <div className="text-white font-bold">${signal.riskManagement.stopLoss.toFixed(2)}</div>
                        <div className="text-red-400 text-sm">-{signal.riskManagement.stopLossPercent.toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-900/30 rounded">
                      <span className="text-green-400 font-semibold">Take Profit 1</span>
                      <div className="text-right">
                        <div className="text-white font-bold">${signal.riskManagement.takeProfit1.toFixed(2)}</div>
                        <div className="text-green-400 text-sm">+{signal.riskManagement.tp1Percent.toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-900/30 rounded">
                      <span className="text-green-400 font-semibold">Take Profit 2</span>
                      <div className="text-right">
                        <div className="text-white font-bold">${signal.riskManagement.takeProfit2.toFixed(2)}</div>
                        <div className="text-green-400 text-sm">+{signal.riskManagement.tp2Percent.toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-900/30 rounded">
                      <span className="text-green-400 font-semibold">Take Profit 3</span>
                      <div className="text-right">
                        <div className="text-white font-bold">${signal.riskManagement.takeProfit3.toFixed(2)}</div>
                        <div className="text-green-400 text-sm">+{signal.riskManagement.tp3Percent.toFixed(2)}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded p-4">
                  <div className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                    Position Sizing
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Account Balance</span>
                      <span className="text-white font-bold">${accountBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Risk Per Trade</span>
                      <span className="text-white font-bold">{riskPercentage}% (${(accountBalance * riskPercentage / 100).toFixed(2)})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Leverage</span>
                      <span className="text-white font-bold">{leverage}x</span>
                    </div>
                    <div className="border-t border-slate-700 pt-3 mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Position Size</span>
                        <span className="text-blue-400 font-bold text-lg">
                          ${((accountBalance * riskPercentage / 100) / (signal.riskManagement.stopLossPercent / 100) * leverage).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Contracts</span>
                        <span className="text-gray-300 text-sm">
                          {(((accountBalance * riskPercentage / 100) / (signal.riskManagement.stopLossPercent / 100) * leverage) / signal.price).toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-blue-900/30 rounded p-2 mt-3">
                      <div className="text-xs text-blue-300">
                        <strong>Strategy:</strong> Close 30% at TP1, 40% at TP2, 30% at TP3
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-gray-400 text-sm mb-1">RSI (14)</div>
            <div className="text-2xl font-bold text-white">{indicators.rsi.toFixed(2)}</div>
            <div className={`text-sm ${
              indicators.rsi < 30 ? 'text-green-400' :
              indicators.rsi > 70 ? 'text-red-400' :
              'text-gray-400'
            }`}>
              {indicators.rsi < 30 ? 'Oversold' : indicators.rsi > 70 ? 'Overbought' : 'Neutral'}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-gray-400 text-sm mb-1">MACD</div>
            <div className="text-2xl font-bold text-white">{indicators.macd.value.toFixed(2)}</div>
            <div className="text-sm text-gray-400">
              Signal: {indicators.macd.signal.toFixed(2)}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-gray-400 text-sm mb-1">EMA Cross</div>
            <div className="text-lg font-bold text-white">
              {indicators.ema.fast > indicators.ema.slow ? 'Bullish' : 'Bearish'}
            </div>
            <div className="text-sm text-gray-400">
              Fast: ${indicators.ema.fast.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Trade History */}
        {performance.trades.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Recent Trades</h2>
            <div className="space-y-2">
              {performance.trades.map((trade, idx) => (
                <div key={idx} className="bg-slate-700 rounded p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded font-semibold ${
                        trade.type === 'BUY' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {trade.type}
                      </div>
                      <div className="text-white">
                        ${trade.entry.toFixed(2)} → ${trade.exit.toFixed(2)}
                      </div>
                      <div className="text-gray-400 text-sm">{trade.time}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </div>
                      <div className="text-gray-400 text-xs">{trade.exitReason}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signal History */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Signal History
          </h2>
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No signals yet. Start the bot to begin analysis.
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="bg-slate-700 rounded p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded font-semibold ${getSignalColor(item.type)}`}>
                      {item.type}
                    </div>
                    <div className="text-white">${item.price.toFixed(2)}</div>
                    <div className="text-gray-400 text-sm">{item.time}</div>
                    {item.mtfAligned && (
                      <div className="text-green-400 text-xs">✓ MTF Aligned</div>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Strength: {item.strength}/7
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-200">
              <strong>Disclaimer:</strong> This is a demo trading bot using simulated data. Always conduct your own research and risk assessment. Trading futures involves substantial risk of loss. This tool should not be your sole basis for trading decisions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuturesTradingBot;
