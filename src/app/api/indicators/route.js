import axios from 'axios';

export default async function handler(req, res) {
  const { pair, timeframe } = req.query;
  const API_KEY = process.env.TWELVE_DATA_API_KEY;

  try {
    const symbol = convertPairFormat(pair);
    const interval = convertTimeframe(timeframe);

    const response = await axios.get('https://api.twelvedata.com/time_series', {
      params: {
        symbol,
        interval,
        outputsize: 500,
        apikey: API_KEY,
        format: 'JSON'
      },
      timeout: 10000
    });

    if (response.data.status === 'error') {
      return res.status(400).json({ error: response.data.message });
    }

    const ohlcData = response.data.values?.map(item => ({
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume),
      datetime: item.datetime
    })).reverse() || [];

    res.status(200).json({ ohlcData });
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
}

function convertPairFormat(pair) {
  const pairsMap = {
    'EUR/USD': 'EURUSD',
    'GBP/USD': 'GBPUSD',
    'USD/JPY': 'USDJPY',
    'AUD/USD': 'AUDUSD',
    'USD/CAD': 'USDCAD',
    'USD/CHF': 'USDCHF',
    'NZD/USD': 'NZDUSD',
    'EUR/GBP': 'EURGBP',
    'EUR/JPY': 'EURJPY',
    'GBP/JPY': 'GBPJPY'
  };
  return pairsMap[pair] || pair.replace('/', '');
}

function convertTimeframe(tf) {
  const tfMap = {
    '5m': '5min',
    '15m': '15min',
    '1h': '1h',
    '4h': '4h',
    '1d': '1day'
  };
  return tfMap[tf] || tf;
}