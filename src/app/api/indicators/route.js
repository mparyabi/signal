import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const API_KEY = '29a51ede44be46ddad71772cf3b7d5bd'; // در سایت Twelve Data ثبت‌نام کن و کلیدت رو بذار
  const symbol = 'GBP/USD';
  const interval = '1h';
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

    const candles = data.values.reverse(); // جدیدترین آخرشه

    // محاسبه MA50 و MA200
    const ma = (arr, period) =>
      arr.slice(-period).reduce((sum, c) => sum + Number(c.close), 0) / period;

    const ma50 = ma(candles, 50);
    const ma200 = ma(candles, 200);

    // محاسبه RSI
    const calcRSI = (arr) => {
      const gains = [];
      const losses = [];

      for (let i = 1; i < arr.length; i++) {
        const diff = Number(arr[i].close) - Number(arr[i - 1].close);
        if (diff >= 0) gains.push(diff);
        else losses.push(Math.abs(diff));
      }

      const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
      const rs = avgGain / (avgLoss || 1);
      return 100 - 100 / (1 + rs);
    };

    const rsi = calcRSI(candles.slice(-14)); // معمولاً از 14 کندل برای محاسبه استفاده می‌شود

    // MACD کراس
    const calcMACD = (arr) => {
      const ema = (arr, period) => {
        const k = 2 / (period + 1);
        let emaArr = [Number(arr[0].close)];
        for (let i = 1; i < arr.length; i++) {
          emaArr.push(Number(arr[i].close) * k + emaArr[i - 1] * (1 - k));
        }
        return emaArr;
      };

      const ema12 = ema(arr, 12);
      const ema26 = ema(arr, 26);
      const macdLine = ema12.map((v, i) => v - ema26[i]);
      const signalLine = ema(macdLine, 9);

      return {
        macdLine,
        signalLine,
        macdCrossover: macdLine[macdLine.length - 2] < signalLine[signalLine.length - 2] &&
                        macdLine[macdLine.length - 1] > signalLine[signalLine.length - 1],
      };
    };

    const { macdLine, signalLine, macdCrossover } = calcMACD(candles);

    // تنظیمات SL و TP
    const entryPrice = Number(candles.at(-1).close);
    const sl = entryPrice * (1 - 0.015); // 1.5% پایین‌تر
    const tp = entryPrice * (1 + 0.025); // 2.5% بالاتر

    // سیگنال‌های شرایط مختلف
    const conditions = {
      trendUp: ma50 > ma200,
      rsiOversold: rsi < 30,
      macdCross: macdCrossover,
    };

    // شبیه‌سازی معاملات (بک‌تست)
    let totalBalance = 1000; // موجودی اولیه
    let trades = [];
    const lotSize = 0.02; // حجم معامله به لات

    for (let i = 0; i < 30; i++) {
      const entryPrice = Number(candles[i].close);
      const sl = entryPrice * (1 - 0.015); // 1.5% پایین‌تر
      const tp = entryPrice * (1 + 0.025); // 2.5% بالاتر
      const isBuy = conditions.trendUp && conditions.rsiOversold && conditions.macdCross;

      const trade = {
        entryPrice,
        sl,
        tp,
        isBuy,
        conditions,
        result: null,
      };

      // فرض می‌کنیم که قیمت‌ها طبق روند طبیعی حرکت می‌کنند و SL یا TP در هر معامله فعال می‌شود
      if (isBuy) {
        if (candles[i].close >= tp) {
          // اگر TP رسید
          trade.result = (tp - entryPrice) * lotSize * totalBalance; 
        } else if (candles[i].close <= sl) {
          // اگر SL رسید
          trade.result = (sl - entryPrice) * lotSize * totalBalance; 
        } else {
          trade.result = 0;
        }
      } else {
        // اگر سیگنال فروش بود
        if (candles[i].close <= sl) {
          trade.result = (entryPrice - sl) * lotSize * totalBalance;
        } else if (candles[i].close >= tp) {
          trade.result = (entryPrice - tp) * lotSize * totalBalance;
        } else {
          trade.result = 0;
        }
      }

      // ثبت معامله و به‌روزرسانی موجودی
      totalBalance += trade.result;
      trades.push(trade);
    }

    return NextResponse.json({
      totalBalance,
      trades,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch indicators' });
  }
}
