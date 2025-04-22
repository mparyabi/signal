"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { sendTelegramMessage } from "./telegram";

const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  let ema = parseFloat(data[0].close);
  for (let i = 1; i < data.length; i++) {
    ema = parseFloat(data[i].close) * k + ema * (1 - k);
  }
  return ema;
};

const calculateATR = (data, period = 14) => {
  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    const high = parseFloat(data[i].high);
    const low = parseFloat(data[i].low);
    const prevClose = parseFloat(data[i - 1].close);
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trSum += tr;
  }
  return trSum / period;
};

const calculateRSI = (data, period = 14) => {
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = parseFloat(data[i].close) - parseFloat(data[i - 1].close);
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

const calculateADX = (data, period = 14) => {
  let plusDM = 0,
    minusDM = 0,
    trSum = 0;
  for (let i = 1; i <= period; i++) {
    const current = data[i];
    const prev = data[i - 1];
    const upMove = parseFloat(current.high) - parseFloat(prev.high);
    const downMove = parseFloat(prev.low) - parseFloat(current.low);

    const plus = upMove > downMove && upMove > 0 ? upMove : 0;
    const minus = downMove > upMove && downMove > 0 ? downMove : 0;

    plusDM += plus;
    minusDM += minus;

    const tr = Math.max(
      parseFloat(current.high) - parseFloat(current.low),
      Math.abs(parseFloat(current.high) - parseFloat(prev.close)),
      Math.abs(parseFloat(current.low) - parseFloat(prev.close))
    );
    trSum += tr;
  }
  const plusDI = (plusDM / trSum) * 100;
  const minusDI = (minusDM / trSum) * 100;
  const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
  return dx;
};

const SignalBox = () => {
  const [signals, setSignals] = useState(null);
  const [entryPrice, setEntryPrice] = useState(null);
  const [tp, setTP] = useState(null);
  const [sl, setSL] = useState(null);
  const [realtimePrice, setRealtimePrice] = useState(null);
  const [symbol, setSymbol] = useState("GBP/USD");
  const [interval, setInterval] = useState("5min");

  useEffect(() => {
    const fetchData = async () => {
      const API_KEY = "29a51ede44be46ddad71772cf3b7d5bd";

      try {
        const { data } = await axios.get(
          `https://api.twelvedata.com/time_series`,
          {
            params: { symbol, interval, outputsize: 500, apikey: API_KEY },
          }
        );

        const candles = data.values.reverse();

        const ema20 = calculateEMA(candles.slice(-30), 20);
        const ema50 = calculateEMA(candles.slice(-70), 50);
        const ema200 = calculateEMA(candles.slice(-220), 200);
        const prevEma20 = calculateEMA(candles.slice(-31, -1), 20);
        const prevEma50 = calculateEMA(candles.slice(-71, -1), 50);
        const emaCrossUp = prevEma20 < prevEma50 && ema20 >= ema50;
        const emaCrossDown = prevEma20 > prevEma50 && ema20 <= ema50;

        const rsi = calculateRSI(candles.slice(-15));
        const adx = calculateADX(candles);
        const atr = calculateATR(candles);

        const lastClose = parseFloat(candles.at(-1).close);

        const macdData = candles.slice(-35).map((_, i, arr) => {
          if (i < 26) return 0;
          const short = calculateEMA(arr.slice(i - 12, i + 1), 12);
          const long = calculateEMA(arr.slice(i - 26, i + 1), 26);
          return short - long;
        });

        const ema12 = calculateEMA(candles.slice(-26), 12);
        const ema26 = calculateEMA(candles.slice(-50), 26);
        const macdLine = ema12 - ema26;
        const signalLine = calculateEMA(macdData, 9);
        const prevMacdLine = macdData.at(-2);
        const prevSignalLine = calculateEMA(macdData.slice(-10, -1), 9);

        const macdCross =
          macdLine > signalLine && prevMacdLine <= prevSignalLine;

        const entryPrice = lastClose;
        const sl = entryPrice - atr * 1.5;
        const tp = entryPrice + (entryPrice - sl) * 3;

        const newSignals = {
          trendUp: ema20 > ema50 && ema50 > ema200 && emaCrossUp,
          trendDown: ema20 < ema50 && ema50 < ema200 && emaCrossDown,
          trendStrength: adx > 25,
          rsiOversold: rsi < 35 && rsi > 20,
          rsiOverbought: rsi > 65 && rsi < 80,
          macdCross,
          macdCrossDown: !macdCross,
        };

        setSignals(newSignals);

        const buySL = entryPrice - atr * 1.5;
        const buyTP = entryPrice + (entryPrice - buySL) * 3;

        const sellSL = entryPrice + atr * 1.5;
        const sellTP = entryPrice - (sellSL - entryPrice) * 3;

        const message =
          `📊 Signal Analysis:\n` +
          `🔹 Trend: ${
            newSignals.trendUp
              ? "✅ UP"
              : newSignals.trendDown
              ? "✅ DOWN"
              : "❌ NO TREND"
          }\n` +
          `🔹 RSI: ${rsi.toFixed(2)} (${
            newSignals.rsiOversold
              ? "Oversold ✅"
              : newSignals.rsiOverbought
              ? "Overbought ✅"
              : "Normal ❌"
          })\n` +
          `🔹 MACD Cross: ${macdCross ? "✅ Up" : "❌"}\n` +
          `🔹 Entry: ${entryPrice.toFixed(5)} | TP: ${tp.toFixed(
            5
          )} | SL: ${sl.toFixed(5)}`;

        if (
          newSignals.trendUp &&
          newSignals.trendStrength &&
          newSignals.rsiOversold &&
          newSignals.macdCross
        ) {
          sendTelegramMessage(
            `📈 *Buy Signal!*\n📍 Entry: ${entryPrice.toFixed(
              5
            )}\n🎯 TP: ${buyTP.toFixed(5)} | 🛑 SL: ${buySL.toFixed(
              5
            )}\n${message}`
          );
          setTP(buyTP);
          setSL(buySL);
        } else if (
          newSignals.trendDown &&
          newSignals.trendStrength &&
          newSignals.rsiOverbought &&
          newSignals.macdCrossDown
        ) {
          sendTelegramMessage(
            `📉 *Sell Signal!*\n📍 Entry: ${entryPrice.toFixed(
              5
            )}\n🎯 TP: ${sellTP.toFixed(5)} | 🛑 SL: ${sellSL.toFixed(
              5
            )}\n${message}`
          );
          setTP(sellTP);
          setSL(sellSL);
        }

        setEntryPrice(entryPrice);
        setRealtimePrice(lastClose);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
  }, [symbol, interval]);

  const buySignal =
    signals?.trendUp &&
    signals?.trendStrength &&
    signals?.rsiOversold &&
    signals?.macdCross;

  const sellSignal =
    signals?.trendDown &&
    signals?.trendStrength &&
    signals?.rsiOverbought &&
    signals?.macdCrossDown;
  return (
    <div className="bg-zinc-900 p-4 rounded-xl shadow-md text-white w-full">
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block mb-1">جفت‌ارز:</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="text-black rounded p-2"
          >
            <option value="GBP/USD">GBP/USD</option>
            <option value="EUR/USD">EUR/USD</option>
            <option value="USD/JPY">USD/JPY</option>
            <option value="BTC/USD">BTC/USD</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">تایم‌فریم:</label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="text-black rounded p-2"
          >
            <option value="5min">5 دقیقه</option>
            <option value="15min">15 دقیقه</option>
            <option value="30min">30 دقیقه</option>
            <option value="1h">1 ساعت</option>
            <option value="4h">4 ساعت</option>
            <option value="1day">1 روز</option>
          </select>
        </div>
      </div>

      {/* سیگنال بای */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-3">Buy Signal Conditions</h2>
        {signals && (
          <>
            <p className={signals.trendUp ? "text-green-500" : "text-red-500"}>
              {signals.trendUp
                ? "✅ Trend Up (EMA20 > EMA50 > EMA200)"
                : "❌ Trend Down"}
            </p>
            <p
              className={
                signals.trendStrength ? "text-green-500" : "text-red-500"
              }
            >
              {signals.trendStrength
                ? "✅ Strong Trend (ADX > 25)"
                : "❌ Weak Trend"}
            </p>
            <p
              className={
                signals.rsiOversold ? "text-green-500" : "text-red-500"
              }
            >
              {signals.rsiOversold ? "✅ RSI < 30 (Oversold)" : "❌ RSI > 30"}
            </p>
            <p
              className={signals.macdCross ? "text-green-500" : "text-red-500"}
            >
              {signals.macdCross ? "✅ MACD Cross Up" : "❌ MACD Cross Up"}
            </p>
          </>
        )}
        <h2 className="font-bold text-lg mb-3 mt-6">
          Buy Trade Recommendation
        </h2>
        <div>
          {buySignal ? (
            <p className="text-green-500">✅ وارد شوید! (سیگنال بای قوی)</p>
          ) : (
            <p className="text-red-500">❌ شرایط بای کامل نیست، وارد نشوید!</p>
          )}
        </div>
        <h2 className="font-bold text-lg mb-3 mt-6">Buy Trade Info</h2>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">Entry Price</th>
              <th className="px-4 py-2">Take Profit (TP)</th>
              <th className="px-4 py-2">Stop Loss (SL)</th>
              <th className="px-4 py-2">Risk/Reward</th>
            </tr>
          </thead>
          <tbody>
            {buySignal ? (
              <tr>
                <td className="px-4 py-2">{entryPrice?.toFixed(5)}</td>
                <td className="px-4 py-2">{tp?.toFixed(5)}</td>
                <td className="px-4 py-2">{sl?.toFixed(5)}</td>
                <td className="px-4 py-2">1:3</td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-2" colSpan="4">
                  در حال حاضر سیگنال بای مناسبی برای ورود وجود ندارد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <hr className="my-6 border-gray-700" />
      <hr className="my-6 border-gray-700" />

      {/* سیگنال سل */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-3">Sell Signal Conditions</h2>
        {signals && (
          <>
            <p
              className={signals.trendDown ? "text-green-500" : "text-red-500"}
            >
              {signals.trendDown
                ? "✅ Trend Down (EMA20 < EMA50 < EMA200)"
                : "❌ Trend Up"}
            </p>
            <p
              className={
                signals.trendStrength ? "text-green-500" : "text-red-500"
              }
            >
              {signals.trendStrength
                ? "✅ Strong Trend (ADX > 25)"
                : "❌ Weak Trend"}
            </p>
            <p
              className={
                signals.rsiOverbought ? "text-green-500" : "text-red-500"
              }
            >
              {signals.rsiOverbought
                ? "✅ RSI > 70 (Overbought)"
                : "❌ RSI < 70"}
            </p>
            <p
              className={
                signals.macdCrossDown ? "text-green-500" : "text-red-500"
              }
            >
              {signals.macdCrossDown
                ? "✅ MACD Cross Down"
                : "❌ MACD Cross Down"}
            </p>
          </>
        )}
        <h2 className="font-bold text-lg mb-3 mt-6">
          Sell Trade Recommendation
        </h2>
        <div>
          {sellSignal ? (
            <p className="text-red-500">✅ وارد شوید! (سیگنال سل قوی)</p>
          ) : (
            <p className="text-red-500">❌ شرایط سل کامل نیست، وارد نشوید!</p>
          )}
        </div>
        <h2 className="font-bold text-lg mb-3 mt-6">Sell Trade Info</h2>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">Entry Price</th>
              <th className="px-4 py-2">Take Profit (TP)</th>
              <th className="px-4 py-2">Stop Loss (SL)</th>
              <th className="px-4 py-2">Risk/Reward</th>
            </tr>
          </thead>
          <tbody>
            {sellSignal ? (
              <tr>
                <td className="px-4 py-2">{entryPrice?.toFixed(5)}</td>
                <td className="px-4 py-2">{tp?.toFixed(5)}</td>
                <td className="px-4 py-2">{sl?.toFixed(5)}</td>
                <td className="px-4 py-2">1:3</td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-2" colSpan="4">
                  در حال حاضر سیگنال سل مناسبی برای ورود وجود ندارد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {realtimePrice && (
        <div className="mt-6">
          <h2 className="font-bold text-lg">Realtime Price</h2>
          <p className="text-white">قیمت لحظه‌ای: {realtimePrice.toFixed(5)}</p>
        </div>
      )}
    </div>
  );
};

export default SignalBox;
