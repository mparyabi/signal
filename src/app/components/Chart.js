"use client";
import React, { useEffect } from "react";

export default function Chart() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      new window.TradingView.widget({
        container_id: "tv_chart",
        symbol: "FX:GBPUSD",
        interval: "60", // H1
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_top_toolbar: true,
        hide_legend: false,
        height: 500,
        width: "100%",
      });
    };
    document.body.appendChild(script);
  }, []);

  return <div id="tv_chart" />;
}
