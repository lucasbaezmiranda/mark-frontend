import { useState } from 'react';

export default function MarkowitzForm({ onResults }) {
  const [tickers, setTickers] = useState("AAPL, GOOGL, MSFT");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-01-31");
  const [loading, setLoading] = useState(false);

  const tickersPool = [
    "BBAR","BMA","CEPU","CRESY","EDN","GGAL","IRS",
    "LOMA","MELI","PAM","SUPV","TEO","TGS","TS","YPF"
  ];

  const handleSubmit = async (e, auto=false) => {
    e && e.preventDefault();
    setLoading(true);

    const payload = {
      tickers: tickers.split(',').map(t => t.trim()),
      start_date: startDate,
      end_date: endDate
    };

    try {
      const res = await fetch("https://spfwws4nrk.execute-api.us-east-1.amazonaws.com/v1/markowitz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const raw = await res.json();
      const data = raw.body ? JSON.parse(raw.body) : raw;

      onResults(data, data.csv_url);

    } catch (err) {
      alert("Error al obtener datos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Botón para generar parámetros aleatorios
  const handleRandom = () => {
    // 1) Seleccionar 3 tickers aleatorios
    const selected = tickersPool.sort(() => 0.5 - Math.random()).slice(0, 3);

    // 2) Generar fecha de inicio aleatoria (últimos 2 años)
    const now = new Date();
    const past = new Date();
    past.setFullYear(now.getFullYear() - 2);

    const randomStart = new Date(
      past.getTime() + Math.random() * (now.getTime() - past.getTime())
    );

    // Asegurar que tengamos 6 meses adelante
    const randomEnd = new Date(randomStart);
    randomEnd.setMonth(randomStart.getMonth() + 6);

    // Convertir a formato YYYY-MM-DD
    const startStr = randomStart.toISOString().split("T")[0];
    const endStr = randomEnd.toISOString().split("T")[0];

    // Setear estado
    setTickers(selected.join(", "));
    setStartDate(startStr);
    setEndDate(endStr);

    // Ejecutar automáticamente
    setTimeout(() => handleSubmit(null, true), 300);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Tickers (separados por coma):</label><br />
        <input value={tickers} onChange={e => setTickers(e.target.value)} size={40} />
      </div>
      <div>
        <label>Fecha de inicio:</label><br />
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      </div>
      <div>
        <label>Fecha de fin:</label><br />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </div>
      <div style={{ marginTop: "10px" }}>
        <button type="submit" disabled={loading}>
          {loading ? "Generando..." : "Generar gráfico"}
        </button>
        <button 
          type="button" 
          onClick={handleRandom} 
          style={{ marginLeft: "10px", backgroundColor: "#1976d2", color: "white" }}
        >
          🎲 Cartera Aleatoria
        </button>
      </div>
    </form>
  );
}
