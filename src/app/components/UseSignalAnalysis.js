import { EMA, RSI, MACD, ATR, ADX } from "technicalindicators";

// EMA
export const calculateEMA = (data, period = 20) => {
  return EMA.calculate({ period, values: data });
};

// RSI
export const calculateRSI = (data, period = 14) => {
  return RSI.calculate({ period, values: data });
};

// ATR
export const calculateATR = (highs, lows, closes, period = 14) => {
  return ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period,
  });
};

// ADX
export const calculateADX = (highs, lows, closes, period = 14) => {
  return ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period,
  });
};

// MACD
export const calculateMACD = (data) => {
  const macdData = MACD.calculate({
    values: data,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const last = macdData[macdData.length - 1];
  const prev = macdData[macdData.length - 2];

  const macdCross = last && prev && last.MACD > last.signal && prev.MACD < prev.signal;

  return {
    macdLine: last?.MACD,
    signalLine: last?.signal,
    macdCross,
  };
};
