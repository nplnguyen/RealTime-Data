import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, BarElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const socket = io("http://localhost:3000");

export default function App() {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], prices: [], ma7: [], ma25: [] });

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("stats", (s) => {
      setStats(s);
      setChartData((prev) => ({
        ...prev,
        ma7: [...prev.ma7, s.ma7 ? parseFloat(s.ma7) : null].slice(-80),
        ma25: [...prev.ma25, s.ma25 ? parseFloat(s.ma25) : null].slice(-80),
      }));
    });
    socket.on("trade", (trade) => {
      const time = new Date(trade.timestamp).toLocaleTimeString("fr-FR");
      setTrades((prev) => [trade, ...prev].slice(0, 30));
      setChartData((prev) => ({
        ...prev,
        labels: [...prev.labels, time].slice(-80),
        prices: [...prev.prices, trade.price].slice(-80),
      }));
    });
    socket.on("trades", (initial) => setTrades(initial.slice(0, 30)));
    socket.on("alert", (alert) => setAlerts((prev) => [alert, ...prev].slice(0, 10)));
    return () => socket.removeAllListeners();
  }, []);

  const lineData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Prix BTC",
        data: chartData.prices,
        borderColor: "#3b82f6",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, "rgba(59,130,246,0.12)");
          gradient.addColorStop(1, "rgba(59,130,246,0)");
          return gradient;
        },
      },
      {
        label: "MA7",
        data: chartData.ma7,
        borderColor: "#f97316",
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.4,
        fill: false,
      },
      {
        label: "MA25",
        data: chartData.ma25,
        borderColor: "#a78bfa",
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const lineOptions = {
    animation: false,
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: { color: "#94a3b8", boxWidth: 12, font: { size: 11 } }
      },
      tooltip: { mode: "index", intersect: false }
    },
    scales: {
      x: { display: false },
      y: {
        ticks: { color: "#6b7280", font: { size: 11 } },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
    },
  };

  const volumeData = {
    labels: ["1 min", "5 min", "15 min", "1 h"],
    datasets: [{
      data: [
        stats ? parseFloat(stats.volume1min) : 0,
        stats ? parseFloat(stats.volume5min) : 0,
        stats ? parseFloat(stats.volume15min) : 0,
        stats ? parseFloat(stats.volume1h) : 0,
      ],
      backgroundColor: ["#3b82f6", "#6366f1", "#8b5cf6", "#a78bfa"],
      borderRadius: 4,
    }],
  };

  const volumeOptions = {
    animation: false,
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { mode: "index" } },
    scales: {
      x: { ticks: { color: "#6b7280", font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: "#6b7280", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.04)" } },
    },
  };

  return (
    <div style={{ background: "#080c14", minHeight: "100vh", color: "#e6edf3", fontFamily: "monospace", fontSize: "13px" }}>
      <header style={{ background: "#0d1117", borderBottom: "1px solid #1e2533", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: connected ? "#22c55e" : "#ef4444", boxShadow: connected ? "0 0 8px #22c55e" : "none" }} />
          <span style={{ color: "#94a3b8", fontSize: "12px", letterSpacing: "0.05em" }}>CRYPTO MARKET MONITOR</span>
        </div>
        <div style={{ display: "flex", gap: "20px", fontSize: "12px" }}>
          <span style={{ color: "#3b82f6" }}>Binance</span>
          <span style={{ color: "#f97316" }}>Coinbase</span>
          <span style={{ color: connected ? "#22c55e" : "#ef4444" }}>{connected ? "LIVE" : "OFFLINE"}</span>
        </div>
      </header>

      <div style={{ background: "#0d1117", borderBottom: "1px solid #1e2533", padding: "10px 28px", display: "flex", gap: "40px", fontSize: "12px" }}>
        <span style={{ color: "#94a3b8" }}>BTC/USDT <span style={{ color: "#f0f6fc", fontWeight: "bold" }}>${stats ? Number(stats.lastPrice).toLocaleString("fr-FR") : "—"}</span></span>
        <span style={{ color: "#94a3b8" }}>VOL 1min <span style={{ color: "#f0f6fc" }}>{stats?.volume1min ?? "—"} BTC</span></span>
        <span style={{ color: "#94a3b8" }}>TRADES <span style={{ color: "#f0f6fc" }}>{stats?.tradeCount ?? "—"}</span></span>
        <span style={{ color: "#94a3b8" }}>HIGH <span style={{ color: "#22c55e" }}>${stats ? Number(stats.high).toLocaleString("fr-FR") : "—"}</span></span>
        <span style={{ color: "#94a3b8" }}>LOW <span style={{ color: "#ef4444" }}>${stats ? Number(stats.low).toLocaleString("fr-FR") : "—"}</span></span>
        <span style={{ color: "#94a3b8" }}>MA7 <span style={{ color: "#f97316" }}>{stats?.ma7 ? `$${Number(stats.ma7).toLocaleString("fr-FR")}` : "—"}</span></span>
        <span style={{ color: "#94a3b8" }}>MA25 <span style={{ color: "#a78bfa" }}>{stats?.ma25 ? `$${Number(stats.ma25).toLocaleString("fr-FR")}` : "—"}</span></span>
      </div>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {[
            { label: "Prix actuel", value: stats ? `$${Number(stats.lastPrice).toLocaleString("fr-FR")}` : "—", sub: "BTC/USDT", accent: "#f0f6fc" },
            { label: "Volume 1 min", value: stats ? `${stats.volume1min} BTC` : "—", sub: `${stats?.tradeCount ?? 0} trades`, accent: "#3b82f6" },
            { label: "Prix moyen", value: stats ? `$${Number(stats.avgPrice).toLocaleString("fr-FR")}` : "—", sub: "fenetre glissante 1min", accent: "#a78bfa" },
            { label: "Anomalies", value: alerts.length, sub: "10 dernieres minutes", accent: alerts.length > 0 ? "#ef4444" : "#22c55e" },
          ].map((card) => (
            <div key={card.label} style={{ background: "#0d1117", border: "1px solid #1e2533", borderRadius: "10px", padding: "20px 22px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>{card.label}</div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: card.accent }}>{card.value}</div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px" }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          <div style={{ background: "#0d1117", border: "1px solid #1e2533", borderRadius: "10px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Prix BTC/USDT + Moyennes mobiles</span>
              <div style={{ display: "flex", gap: "16px", fontSize: "11px" }}>
                <span style={{ color: "#f97316" }}>— MA7</span>
                <span style={{ color: "#a78bfa" }}>— MA25</span>
              </div>
            </div>
            <Line data={lineData} options={lineOptions} />
          </div>

          <div style={{ background: "#0d1117", border: "1px solid #1e2533", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Volume par fenetre (BTC)</div>
            <Bar data={volumeData} options={volumeOptions} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#0d1117", border: "1px solid #1e2533", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Trades recents</div>
            <div style={{ maxHeight: "260px", overflowY: "auto" }}>
              {trades.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1e2533" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600" }}>${Number(t.price).toLocaleString("fr-FR")}</div>
                    <div style={{ fontSize: "10px", color: t.source === "coinbase" ? "#f97316" : "#3b82f6", marginTop: "2px" }}>
                      {t.source === "coinbase" ? "Coinbase" : "Binance"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{t.quantity} BTC</div>
                    <div style={{ fontSize: "10px", color: "#475569" }}>{new Date(t.timestamp).toLocaleTimeString("fr-FR")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#0d1117", border: "1px solid #1e2533", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Alertes temps reel</div>
            {alerts.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#475569" }}>Aucune anomalie detectee</div>
            ) : (
              <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "12px" }}>
                    <div style={{ color: "#ef4444", fontWeight: "600", marginBottom: "3px" }}>Gros volume detecte</div>
                    <div style={{ color: "#94a3b8" }}>{a.message}</div>
                    <div style={{ color: "#475569", fontSize: "10px", marginTop: "4px" }}>{a.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#0d1117", border: "1px solid #1e2533", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>Pipeline — Sante systeme</div>
            {[
              { label: "WebSocket Binance", ok: true },
              { label: "WebSocket Coinbase", ok: true },
              { label: "Kafka broker", ok: connected },
              { label: "Consumer group", ok: connected },
              { label: "MongoDB", ok: connected },
              { label: "API REST", ok: connected },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1e2533", fontSize: "12px" }}>
                <span style={{ color: "#94a3b8" }}>{item.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.ok ? "#22c55e" : "#ef4444" }} />
                  <span style={{ color: item.ok ? "#22c55e" : "#ef4444", fontSize: "11px" }}>{item.ok ? "actif" : "offline"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
