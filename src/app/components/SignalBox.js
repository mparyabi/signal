'use client'
import { useEffect, useState } from 'react';
import axios from 'axios';

const calculateTPandSL = (entryPrice) => {
  const tp = entryPrice * 1.025;
  const sl = entryPrice * 0.985;
  return { tp, sl };
};

const SignalBox = () => {
  const [signals, setSignals] = useState(null);
  const [entryPrice, setEntryPrice] = useState(1.25);
  const [tp, setTP] = useState(null);
  const [sl, setSL] = useState(null);
  const [realtimePrice, setRealtimePrice] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const API_KEY = '29a51ede44be46ddad71772cf3b7d5bd';
      const symbol = 'GBP/USD';
      //const symbol = 'EUR/USD';
      //const symbol = 'JPY/USD';
      //const symbol = 'AUD/USD';
      const interval = '5min';
      const outputsize = 200;

      try {
        const { data } = await axios.get(`https://api.twelvedata.com/time_series`, {
          params: {
            symbol,
            interval,
            outputsize,
            apikey: API_KEY,
          },
        });

        const candles = data.values.reverse();

        const ma = (arr, period) =>
          arr.slice(-period).reduce((sum, c) => sum + parseFloat(c.close), 0) / period;

        const ma50 = ma(candles, 50);
        const ma200 = ma(candles, 200);

        const lastClose = parseFloat(candles.at(-1).close);
        const prevClose = parseFloat(candles.at(-2).close);
        const rsi = lastClose < prevClose ? 25 : 45;

        const macdCross = lastClose > prevClose;
        const macdCrossDown = lastClose < prevClose;

        const entryPrice = parseFloat(candles.at(-1).close);
        const { tp, sl } = calculateTPandSL(entryPrice);

        const newSignals = {
          trendUp: ma50 > ma200,
          trendDown: ma50 < ma200,
          rsiOversold: rsi < 30,
          rsiOverbought: rsi > 70,
          macdCross,
          macdCrossDown,
        };

        setSignals(newSignals);
        setTP(tp);
        setSL(sl);
        setRealtimePrice(lastClose);

      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, [entryPrice]);

  const buySignal = signals?.trendUp && signals?.rsiOversold && signals?.macdCross;
  const sellSignal = signals?.trendDown && signals?.rsiOverbought && signals?.macdCrossDown;

  return (
    <div className="bg-zinc-900 p-4 rounded-xl shadow-md text-white w-full">

      {/* سیگنال بای */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-3">Buy Signal Conditions</h2>
        {signals && (
          <>
            <p className={signals.trendUp ? 'text-green-500' : 'text-red-500'}>
              {signals.trendUp ? '✅ Trend Up (MA50 > MA200)' : '❌ Trend Down'}
            </p>
            <p className={signals.rsiOversold ? 'text-green-500' : 'text-red-500'}>
              {signals.rsiOversold ? '✅ RSI < 30 (Oversold)' : '❌ RSI > 30'}
            </p>
            <p className={signals.macdCross ? 'text-green-500' : 'text-red-500'}>
              {signals.macdCross ? '✅ MACD Cross Up' : '❌ MACD Cross Up'}
            </p>
          </>
        )}
        <h2 className="font-bold text-lg mb-3 mt-6">Buy Trade Recommendation</h2>
        <div>
          {buySignal ? (
            <p className="text-green-500">✅ وارد شوید! (سیگنال بای)</p>
          ) : (
            <p className="text-red-500">❌ سیگنال بای نیست، وارد نشوید!</p>
          )}
        </div>
        <h2 className="font-bold text-lg mb-3 mt-6">Buy Trade Info</h2>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">Entry Price</th>
              <th className="px-4 py-2">Take Profit (TP)</th>
              <th className="px-4 py-2">Stop Loss (SL)</th>
            </tr>
          </thead>
          <tbody>
            {buySignal ? (
              <tr>
                <td className="px-4 py-2">{entryPrice.toFixed(5)}</td>
                <td className="px-4 py-2">{tp?.toFixed(5)}</td>
                <td className="px-4 py-2">{sl?.toFixed(5)}</td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-2" colSpan="3">در حال حاضر سیگنال بای مناسبی برای ورود وجود ندارد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
<hr/><hr/>
      {/* سیگنال سل */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-3">Sell Signal Conditions</h2>
        {signals && (
          <>
            <p className={signals.trendDown ? 'text-green-500' : 'text-red-500'}>
              {signals.trendDown ? '✅ Trend Down (MA50 < MA200)' : '❌ Trend Up'}
            </p>
            <p className={signals.rsiOverbought ? 'text-green-500' : 'text-red-500'}>
              {signals.rsiOverbought ? '✅ RSI > 70 (Overbought)' : '❌ RSI < 70'}
            </p>
            <p className={signals.macdCrossDown ? 'text-green-500' : 'text-red-500'}>
              {signals.macdCrossDown ? '✅ MACD Cross Down' : '❌ MACD Cross Down'}
            </p>
          </>
        )}
        <h2 className="font-bold text-lg mb-3 mt-6">Sell Trade Recommendation</h2>
        <div>
          {sellSignal ? (
            <p className="text-red-500">✅ وارد شوید! (سیگنال سل)</p>
          ) : (
            <p className="text-red-500">❌ سیگنال سل نیست، وارد نشوید!</p>
          )}
        </div>
        <h2 className="font-bold text-lg mb-3 mt-6">Sell Trade Info</h2>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">Entry Price</th>
              <th className="px-4 py-2">Take Profit (TP)</th>
              <th className="px-4 py-2">Stop Loss (SL)</th>
            </tr>
          </thead>
          <tbody>
            {sellSignal ? (
              <tr>
                <td className="px-4 py-2">{entryPrice.toFixed(5)}</td>
                <td className="px-4 py-2">{tp?.toFixed(5)}</td>
                <td className="px-4 py-2">{sl?.toFixed(5)}</td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-2" colSpan="3">در حال حاضر سیگنال سل مناسبی برای ورود وجود ندارد.</td>
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