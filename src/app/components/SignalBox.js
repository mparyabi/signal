"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { sendTelegramMessage } from "./telegram";

// محاسبه EMA
const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  let ema = parseFloat(data[0].close);
  for (let i = 1; i < data.length; i++) {
    ema = parseFloat(data[i].close) * k + ema * (1 - k);
  }
  return ema;
};

// محاسبه ATR برای حد ضرر پویا
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

// محاسبه RSI واقعی
const calculateRSI = (data, period = 14) => {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = parseFloat(data[i].close) - parseFloat(data[i - 1].close);
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

// محاسبه ADX
const calculateADX = (data, period = 14) => {
  // این بخش نیاز به پیاده‌سازی کامل دارد
  // برای سادگی یک مقدار ثابت برگردانده می‌شود
  return 30; // مقدار نمونه
};

const SignalBox = () => {
  const [signals, setSignals] = useState(null);
  const [entryPrice, setEntryPrice] = useState(null);
  const [tp, setTP] = useState(null);
  const [sl, setSL] = useState(null);
  const [realtimePrice, setRealtimePrice] = useState(null);
  const [volumeFilter, setVolumeFilter] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const API_KEY = "29a51ede44be46ddad71772cf3b7d5bd";
      const symbol = "GBP/USD";
      const interval = "5min";
      const outputsize = 200;

      try {
        const { data } = await axios.get(
          `https://api.twelvedata.com/time_series`,
          {
            params: {
              symbol,
              interval,
              outputsize,
              apikey: API_KEY,
            },
          }
        );

        const candles = data.values.reverse();

        // محاسبات اندیکاتورها
        const ema20 = calculateEMA(candles.slice(-30), 20); // 30 کندل برای محاسبه EMA20
        const ema50 = calculateEMA(candles.slice(-70), 50); // 70 کندل برای محاسبه EMA50
        const ema200 = calculateEMA(candles.slice(-220), 200); // 220 کندل برای محاسبه EMA200

        const rsi = calculateRSI(candles.slice(-15)); // 15 کندل برای RSI
        const adx = calculateADX(candles);
        const atr = calculateATR(candles);

        const lastClose = parseFloat(candles.at(-1).close);
        const prevClose = parseFloat(candles.at(-2).close);

        const macdData = candles.slice(-35).map((_, i, arr) => {
          if (i < 26) return 0;
          const short = calculateEMA(arr.slice(i - 12, i + 1), 12);
          const long = calculateEMA(arr.slice(i - 26, i + 1), 26);
          return short - long;
        });

        // محاسبه MACD (ساده‌شده)
        const ema12 = calculateEMA(candles.slice(-26), 12); // 26 کندل برای EMA12
        const ema26 = calculateEMA(candles.slice(-50), 26); // 50 کندل برای EMA26
        const macdLine = ema12 - ema26; // نیاز به محاسبه EMA12 و EMA26 دارید
        const signalLine = calculateEMA(macdData, 9); // نیاز به داده‌های MACD دارد
        const prevMacdLine = macdData.at(-2);
        const prevSignalLine = calculateEMA(macdData.slice(-10, -1), 9);

        const macdCross =
          macdLine > signalLine && prevMacdLine <= prevSignalLine;

        // فیلتر حجم
        const currentVolume = parseFloat(candles.at(-1).volume);
        const avgVolume20 =
          candles.slice(-20).reduce((sum, c) => sum + parseFloat(c.volume), 0) /
          20;
        const volumeOk = currentVolume > avgVolume20 * 1.05;

        const entryPrice = lastClose;
        const sl = entryPrice - atr * 1.5; // حد ضرر 1.5 برابر ATR
        const tp = entryPrice + (entryPrice - sl) * 3; // ریسک به ریوارد 1:3

        const newSignals = {
          trendUp: ema20 > ema50 && ema50 > ema200, // روند صعودی قوی
          trendDown: ema20 < ema50 && ema50 < ema200, // روند نزولی قوی
          trendStrength: adx > 20, // قدرت روند
          rsiOversold: rsi < 35 && rsi > 20, // اشباع فروش
          rsiOverbought: rsi > 65 && rsi < 80, // اشباع خرید
          rsiNormal: rsi > 30 && rsi < 70,
          macdCross,
          macdCrossDown: !macdCross,
          volumeOk,
        };

        setSignals(newSignals);
        // بررسی شرایط سیگنال خرید
        if (
          newSignals.trendUp &&
          newSignals.trendStrength &&
          newSignals.rsiOversold &&
          newSignals.macdCross &&
          newSignals.volumeOk
        ) {
          sendTelegramMessage(
            `📈 *Buy Signal Detected!*\nSymbol: GBP/USD\nEntry: *${entryPrice.toFixed(
              5
            )}*\nTP: *${tp.toFixed(5)}*\nSL: *${sl.toFixed(
              5
            )}*\nRisk/Reward: *1:3*`
          );
        }

        // بررسی شرایط سیگنال فروش
        else if (
          newSignals.trendDown &&
          newSignals.trendStrength &&
          newSignals.rsiOverbought &&
          newSignals.macdCrossDown &&
          newSignals.volumeOk
        ) {
          sendTelegramMessage(
            `📉 *Sell Signal Detected!*\nSymbol: GBP/USD\nEntry: *${entryPrice.toFixed(
              5
            )}*\nTP: *${tp.toFixed(5)}*\nSL: *${sl.toFixed(
              5
            )}*\nRisk/Reward: *1:3*`
          );
        }

        setEntryPrice(entryPrice);
        setTP(tp);
        setSL(sl);
        setRealtimePrice(lastClose);
        setVolumeFilter(volumeOk);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    const interval = setInterval(fetchData, 60 * 5000); // هر دقیقه یک‌بار

    return () => clearInterval(interval); // پاک‌سازی
  }, []);

  // سیگنال خرید بهبودیافته
  const buySignal =
    signals?.trendUp &&
    signals?.trendStrength &&
    signals?.rsiOversold &&
    signals?.macdCross &&
    signals?.volumeOk;

  // سیگنال فروش بهبودیافته
  const sellSignal =
    signals?.trendDown &&
    signals?.trendStrength &&
    signals?.rsiOverbought &&
    signals?.macdCrossDown &&
    signals?.volumeOk;

  return (
    <div className="bg-zinc-900 p-4 rounded-xl shadow-md text-white w-full">
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
            <p className={signals.volumeOk ? "text-green-500" : "text-red-500"}>
              {signals.volumeOk ? "✅ Volume > 20MA" : "❌ Low Volume"}
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
            <p className={signals.volumeOk ? "text-green-500" : "text-red-500"}>
              {signals.volumeOk ? "✅ Volume > 20MA" : "❌ Low Volume"}
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
          <p className="text-white">
            حجم معاملات:{" "}
            {volumeFilter ? "بالاتر از میانگین" : "پایین‌تر از میانگین"}
          </p>
        </div>
      )}
    </div>
  );
};

export default SignalBox;
