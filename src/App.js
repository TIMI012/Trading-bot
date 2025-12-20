import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  AlertCircle,
} from "lucide-react";

export default function App() {
  const [price, setPrice] = useState(42000);
  const [signal, setSignal] = useState("HOLD");
  const [strength, setStrength] = useState(0);
  const [rsi, setRsi] = useState(50);
  const [adx, setAdx] = useState(20);
  const [volatility, setVolatility] = useState(1.2);
  const [history, setHistory] = useState([]);

  /* ===============================
     MULTI-TIMEFRAME SIMULATION
  =============================== */
  const analyzeMTF = () => {
    const frames = ["5m", "15m", "1h", "4h"];
    let bullish = 0;
    let bearish = 0;

    frames.forEach(() => {
      const v = Math.random();
      if (v > 0.6) bullish++;
      else if (v < 0.4) bearish++;
    });

    if (bullish >= 3) return "BULLISH";
    if (bearish >= 3) return "BEARISH";
    return "NEUTRAL";
  };

  /* ===============================
     STRONG MOVE FILTER
  =============================== */
  const strongMove = () => {
    let score = 0;
    if (volatility > 1.2) score += 2;
    if (adx > 25) score += 2;
    if (Math.abs(rsi - 50) > 15) score += 2;
    return score >= 5;
  };

  /* ===============================
     SIGNAL ENGINE
  =============================== */
  const generateSignal = () => {
    const mtf = analyzeMTF();
    let newSignal = "HOLD";
    let s = 0;

    if (!strongMove()) return ["HOLD", 0];

    if (mtf === "BULLISH" && rsi < 65) {
      newSignal = "BUY";
      s = 5;
    }

    if (mtf === "BEARISH" && rsi > 35) {
      newSignal = "SELL";
      s = 5;
    }

    return [newSignal, s];
  };

  /* ===============================
     MARKET SIMULATION LOOP
  =============================== */
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 120;
      const newPrice = Math.max(price + change, 1000);

      const newRsi = 30 + Math.random() * 40;
      const newAdx = 15 + Math.random() * 25;
      const newVol = Math.random() * 2 + 0.5;

      setPrice(newPrice);
      setRsi(newRsi);
      setAdx(newAdx);
      setVolatility(newVol);

      const [sig, str] = generateSignal();
      setSignal(sig);
      setStrength(str);

      if (sig !== "HOLD") {
        setHistory((h) =>
          [{ sig, price: newPrice, time: new Date().toLocaleTimeString() }, ...h].slice(0, 10)
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [price, rsi, adx, volatility]);

  /* ===============================
     UI HELPERS
  =============================== */
  const color =
    signal === "BUY"
      ? "text-green-400"
      : signal === "SELL"
      ? "text-red-400"
      : "text-gray-400";

  const Icon =
    signal === "BUY"
      ? TrendingUp
      : signal === "SELL"
      ? TrendingDown
      : Activity;

  /* ===============================
     UI
  =============================== */
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Futures Trading Bot v12</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-sm text-gray-400">Price</p>
          <p className="text-xl">${price.toFixed(2)}</p>
        </div>

        <div className="bg-slate-800 p-4 rounded">
          <p className="text-sm text-gray-400">RSI</p>
          <p className="text-xl">{rsi.toFixed(1)}</p>
        </div>

        <div className="bg-slate-800 p-4 rounded">
          <p className="text-sm text-gray-400">ADX</p>
          <p className="text-xl">{adx.toFixed(1)}</p>
        </div>
      </div>

      <div className={`bg-slate-800 p-6 rounded mb-6 ${color}`}>
        <div className="flex items-center gap-3">
          <Icon size={32} />
          <div>
            <p className="text-sm">Current Signal</p>
            <p className="text-2xl font-bold">{signal}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <BarChart3 size={18} /> Signal History
        </h2>
        {history.length === 0 && (
          <p className="text-sm text-gray-400">No signals yet</p>
        )}
        {history.map((h, i) => (
          <div key={i} className="text-sm flex justify-between border-b border-slate-700 py-1">
            <span>{h.sig}</span>
            <span>${h.price.toFixed(2)}</span>
            <span>{h.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
