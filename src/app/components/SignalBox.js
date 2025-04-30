'use client'
import { useState, useEffect } from 'react';
import { RSI, MACD, Stochastic } from 'technicalindicators';
import axios from 'axios';

const API_KEY = 'JT8K19N0KPAWBO13'; // Alpha Vantage API

const ForexSignalApp = () => {
  const [timeframe, setTimeframe] = useState('5min');
  const [currencyPairs, setCurrencyPairs] = useState([
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
    'USD/CHF', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
  ]);
  const [selectedPairs, setSelectedPairs] = useState(['EUR/USD', 'GBP/USD', 'USD/JPY']);
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeSignals = (ohlcData) => {
    const closes = ohlcData.map(d => d.close);
    const highs = ohlcData.map(d => d.high);
    const lows = ohlcData.map(d => d.low);

    const rsi = RSI.calculate({ values: closes, period: 14 });
    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const stochastic = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3
    });

    const currentRsi = rsi[rsi.length - 1];
    const currentMacd = macd[macd.length - 1];
    const currentStochastic = stochastic[stochastic.length - 1];

    const buy = currentRsi < 30 && currentMacd.histogram > 0 && currentMacd.MACD > currentMacd.signal && currentStochastic.k < 20 && currentStochastic.k > currentStochastic.d;
    const sell = currentRsi > 70 && currentMacd.histogram < 0 && currentMacd.MACD < currentMacd.signal && currentStochastic.k > 80 && currentStochastic.k < currentStochastic.d;

    return {
      rsi: currentRsi,
      macd: currentMacd,
      stochastic: currentStochastic,
      signal: buy ? 'BUY' : sell ? 'SELL' : 'NEUTRAL',
      strength: buy || sell ?
        Math.abs(currentRsi - 50) / 50 +
        Math.abs(currentMacd.histogram) * 10 +
        Math.abs(currentStochastic.k - currentStochastic.d) / 100 : 0
    };
  };

  const fetchOHLCData = async (pair) => {
    try {
      const API_KEY = "d4573a17ab7145fe9b7c6c3146e921d8";
      const symbol = pair.replace('/', '');
      const interval = timeframe === '5m' ? '5min' : timeframe === '15m' ? '15min' : '1hour';
      
      console.log(`Fetching ${interval} data for ${symbol}`);
      
      // اضافه کردن پارامترهای ضروری و بررسی ساختار پاسخ
      const response = await axios.get('https://api.twelvedata.com/time_series', {
        params: {
          symbol,
          interval,
          apikey: API_KEY,
          outputsize: 100, // کاهش تعداد داده‌ها برای کاهش بار
          format: 'JSON',
          timezone: 'UTC'
        },
        timeout: 8000 // محدودیت زمانی 8 ثانیه
      });
  
      // بررسی ساختار پاسخ
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid API response structure');
      }
  
      // بررسی وجود داده‌های قیمتی
      if (!response.data.values || !Array.isArray(response.data.values) || response.data.values.length === 0) {
        throw new Error('No price data available in response');
      }
  
      // پردازش داده‌ها با بررسی کامل هر مقدار
      const ohlcData = response.data.values.map(item => {
        if (!item || typeof item !== 'object') {
          throw new Error('Invalid data item structure');
        }
        
        return {
          open: parseFloat(item.open) || 0,
          high: parseFloat(item.high) || 0,
          low: parseFloat(item.low) || 0,
          close: parseFloat(item.close) || 0,
          volume: parseFloat(item.volume) || 0,
          datetime: item.datetime || new Date().toISOString()
        };
      }).reverse();
  
      // بررسی داده‌های پردازش شده
      if (ohlcData.length === 0) {
        throw new Error('No valid data after processing');
      }
  
      return ohlcData;
    } catch (err) {
      console.error(`Error fetching real data for ${pair}:`, err.message);
      console.log('Using fallback sample data');
      return generateSampleData(pair);
    }
  };

  const getSignals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = [];
      for (const pair of selectedPairs) {
        const data = await fetchOHLCData(pair);
        const analysis = analyzeSignals(data);
        results.push({
          pair,
          ...analysis,
          lastClose: data[data.length - 1].close
        });
      }
      setSignals(results);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSignals();
    const interval = setInterval(getSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeframe, selectedPairs]);

  const togglePairSelection = (pair) => {
    setSelectedPairs(prev => prev.includes(pair) ? prev.filter(p => p !== pair) : [...prev, pair]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Forex Signal Dashboard</h1>

      <div className="mb-4">
        <label className="mr-4 font-semibold">Timeframe:</label>
        <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="border p-2">
          <option value="5min">5 Minutes</option>
          <option value="15min">15 Minutes</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
        {currencyPairs.map(pair => (
          <label key={pair} className="flex items-center space-x-2">
            <input type="checkbox" checked={selectedPairs.includes(pair)} onChange={() => togglePairSelection(pair)} />
            <span>{pair}</span>
          </label>
        ))}
      </div>

      {error && <div className="text-red-600 font-semibold mb-4">{error}</div>}
      {isLoading ? (
        <p className="text-blue-600">Loading signals...</p>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Pair</th>
              <th className="p-2 border">Signal</th>
              <th className="p-2 border">RSI</th>
              <th className="p-2 border">MACD</th>
              <th className="p-2 border">Stochastic</th>
              <th className="p-2 border">Strength</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s, idx) => (
              <tr key={idx} className={s.signal === 'BUY' ? 'bg-green-100' : s.signal === 'SELL' ? 'bg-red-100' : ''}>
                <td className="p-2 border">{s.pair}</td>
                <td className="p-2 border">{s.signal}</td>
                <td className="p-2 border">{s.rsi?.toFixed(2)}</td>
                <td className="p-2 border">{s.macd?.histogram.toFixed(5)}</td>
                <td className="p-2 border">{s.stochastic ? `${s.stochastic.k.toFixed(2)} / ${s.stochastic.d.toFixed(2)}` : 'N/A'}</td>
                <td className="p-2 border">{(s.strength * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ForexSignalApp;
