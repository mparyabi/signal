import { useState, useEffect } from 'react';
import { SMA, EMA, RSI, MACD, Stochastic } from 'technicalindicators';
import axios from 'axios';

const ForexSignalApp = () => {
  const [timeframe, setTimeframe] = useState('5m');
  const [currencyPairs, setCurrencyPairs] = useState([
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
    'USD/CHF', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
  ]);
  const [selectedPairs, setSelectedPairs] = useState(['EUR/USD', 'GBP/USD', 'USD/JPY']);
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // استراتژی ترکیبی برای سیگنال دقیق
  const analyzeSignals = (ohlcData) => {
    const closes = ohlcData.map(d => d.close);
    const highs = ohlcData.map(d => d.high);
    const lows = ohlcData.map(d => d.low);

    // محاسبه اندیکاتورها
    const rsiPeriod = 14;
    const rsi = RSI.calculate({ values: closes, period: rsiPeriod });
    const currentRsi = rsi[rsi.length - 1];

    const macdInput = {
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    };
    const macd = MACD.calculate(macdInput);
    const currentMacd = macd[macd.length - 1];

    const stochasticPeriod = 14;
    const stochastic = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: stochasticPeriod,
      signalPeriod: 3
    });
    const currentStochastic = stochastic[stochastic.length - 1];

    // قوانین استراتژی ترکیبی
    const buySignal = 
      currentRsi < 30 && 
      currentMacd.histogram > 0 && 
      currentMacd.MACD > currentMacd.signal && 
      currentStochastic.k < 20 && 
      currentStochastic.d < 20 && 
      currentStochastic.k > currentStochastic.d;

    const sellSignal = 
      currentRsi > 70 && 
      currentMacd.histogram < 0 && 
      currentMacd.MACD < currentMacd.signal && 
      currentStochastic.k > 80 && 
      currentStochastic.d > 80 && 
      currentStochastic.k < currentStochastic.d;

    return {
      rsi: currentRsi,
      macd: currentMacd,
      stochastic: currentStochastic,
      signal: buySignal ? 'BUY' : sellSignal ? 'SELL' : 'NEUTRAL',
      strength: buySignal || sellSignal ? 
        Math.abs(currentRsi - 50) / 50 + 
        Math.abs(currentMacd.histogram) * 10 + 
        Math.abs(currentStochastic.k - currentStochastic.d) / 100 : 0
    };
  };

  const fetchOHLCData = async (pair) => {
    try {
      const API_KEY = "29a51ede44be46ddad71772cf3b7d5bd";
      // در اینجا باید از یک API واقعی مانند Alpha Vantage یا دیگر سرویسها استفاده کنید
      // این یک نمونه شبیهسازی شده است
      const response =  await axios.get(
        `https://api.twelvedata.com/time_series`,
        {
          params: { symbol, interval, outputsize: 500, apikey: API_KEY },
        }
      );
  
      // اگر API واقعی ندارید، میتوانید از دادههای نمونه استفاده کنید:
      const sampleData = generateSampleData();
      
      return response.data || sampleData;
    } catch (err) {
      console.error(`Error fetching data for ${pair}:`, err);
      return generateSampleData();
    }
  };



  const generateSampleData = () => {
    const data = [];
    let lastClose = 1.0 + Math.random() * 0.5; // مقدار اولیه تصادفی
    
    for (let i = 0; i < 100; i++) {
      const change = (Math.random() - 0.5) * 0.01;
      lastClose *= (1 + change);
      
      data.push({
        open: lastClose,
        high: lastClose + Math.random() * 0.005,
        low: lastClose - Math.random() * 0.005,
        close: lastClose,
        volume: Math.floor(Math.random() * 10000)
      });
    }
    
    return data;
  };

  const getSignals = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const signalsData = [];
      
      for (const pair of selectedPairs) {
        const ohlcData = await fetchOHLCData(pair);
        const analysis = analyzeSignals(ohlcData);
        
        signalsData.push({
          pair,
          signal: analysis.signal,
          strength: analysis.strength,
          rsi: analysis.rsi,
          macd: analysis.macd,
          stochastic: analysis.stochastic,
          lastClose: ohlcData[ohlcData.length - 1].close
        });
      }
      
      setSignals(signalsData);
    } catch (err) {
      setError('Failed to fetch and analyze data. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSignals();
    
    // بروزرسانی خودکار هر 5 دقیقه
    const interval = setInterval(getSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeframe, selectedPairs]);

  const togglePairSelection = (pair) => {
    if (selectedPairs.includes(pair)) {
      setSelectedPairs(selectedPairs.filter(p => p !== pair));
    } else {
      setSelectedPairs([...selectedPairs, pair]);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Forex Trading Signals</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Frame</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency Pairs</label>
            <div className="grid grid-cols-2 gap-2">
              {currencyPairs.map(pair => (
                <label key={pair} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedPairs.includes(pair)}
                    onChange={() => togglePairSelection(pair)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{pair}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Analyzing market data...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-100 p-4 font-semibold">
            <div className="col-span-2">Pair</div>
            <div className="col-span-2">Signal</div>
            <div className="col-span-2">Strength</div>
            <div className="col-span-2">RSI (14)</div>
            <div className="col-span-2">MACD</div>
            <div className="col-span-2">Stochastic</div>
          </div>
          
          {signals.map((signal, index) => (
            <div 
              key={index} 
              className={`grid grid-cols-12 p-4 border-b border-gray-200 items-center ${
                signal.signal === 'BUY' ? 'bg-green-50' : 
                signal.signal === 'SELL' ? 'bg-red-50' : ''
              }`}
            >
              <div className="col-span-2 font-medium">{signal.pair}</div>
              <div className="col-span-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  signal.signal === 'BUY' ? 'bg-green-100 text-green-800' :
                  signal.signal === 'SELL' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {signal.signal}
                </span>
              </div>
              <div className="col-span-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      signal.signal === 'BUY' ? 'bg-green-600' : 'bg-red-600'
                    }`} 
                    style={{ width: `${Math.min(100, signal.strength * 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="col-span-2">
                {signal.rsi ? signal.rsi.toFixed(2) : 'N/A'}
                <div className={`h-1 w-full mt-1 ${
                  signal.rsi < 30 ? 'bg-green-500' :
                  signal.rsi > 70 ? 'bg-red-500' : 'bg-gray-300'
                }`}></div>
              </div>
              <div className="col-span-2">
                {signal.macd ? signal.macd.histogram.toFixed(5) : 'N/A'}
                <div className={`h-1 w-full mt-1 ${
                  signal.macd?.histogram > 0 ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
              </div>
              <div className="col-span-2">
                {signal.stochastic ? `${signal.stochastic.k.toFixed(2)}/${signal.stochastic.d.toFixed(2)}` : 'N/A'}
                <div className="h-1 w-full mt-1 bg-gray-300">
                  <div 
                    className="h-1 bg-blue-500" 
                    style={{ width: `${signal.stochastic?.k || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Strategy Explanation</h2>
        <p className="mb-4">This system uses a combined strategy with multiple technical indicators for higher accuracy:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>RSI (14):</strong> Buy when below 30, Sell when above 70</li>
          <li><strong>MACD:</strong> Buy when histogram is positive and MACD line is above signal line</li>
          <li><strong>Stochastic Oscillator (14,3,3):</strong> Buy when both %K and %D are below 20 and %K crosses above %D</li>
        </ul>
        <p className="mt-4 text-sm text-gray-600">Note: For real trading, always use proper risk management and confirm signals with additional analysis.</p>
      </div>
    </div>
  );
};

export default ForexSignalApp;