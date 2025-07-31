import { useState } from 'react';

export default function MarkowitzForm({ onResults }) {
  const [tickers, setTickers] = useState("AAPL, GOOGL, MSFT");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-01-31");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validar rango máximo de 1 año
    const diffInDays = (end - start) / (1000 * 60 * 60 * 24);
    if (diffInDays > 365) {
      alert("El rango de fechas no puede superar 1 año.");
      return;
    }

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
      <button type="submit" disabled={loading} style={{ marginTop: "10px" }}>
        {loading ? "Generando..." : "Generar gráfico"}
      </button>
    </form>
  );
}
