import { useState, useEffect } from 'react';

export default function MarkowitzForm({ onResults }) {
  const [tickers, setTickers] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const tickersPool = [
    "BBAR","BMA","CEPU","CRESY","EDN","GGAL","IRS",
    "LOMA","MELI","PAM","SUPV","TEO","TGS","TS","YPF"
  ];

  // ✅ Generar cartera aleatoria inicial al montar
  useEffect(() => {
    generarAleatoria();
  }, []);

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

  // ✅ Función para generar tickers y fechas aleatorias
  const generarAleatoria = () => {
    // 1) Seleccionar 3 tickers aleatorios
    const selected = tickersPool.sort(() => 0.5 - Math.random()).slice(0, 3);

    // 2) Generar fecha de inicio aleatoria (últimos 2 años)
    const now = new Date();
    const past = new Date();
    past.setFullYear(now.getFullYear() - 2);

    const randomStart = new Date(
      past.getTime() + Math.random() * (now.getTime() - past.getTime())
    );

    // Asegurar 6 meses adelante
    const randomEnd = new Date(randomStart);
    randomEnd.setMonth(randomStart.getMonth() + 6);

    // Setear valores
    setTickers(selected.join(", "));
    setStartDate(randomStart.toISOString().split("T")[0]);
    setEndDate(randomEnd.toISOString().split("T")[0]);
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
      <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            backgroundColor: "#1976d2", 
            color: "white", 
            padding: "8px 16px", 
            border: "none", 
            borderRadius: "5px", 
            cursor: "pointer", 
            fontWeight: "bold",
            flex: 1
          }}
        >
          {loading ? "Generando..." : "Generar gráfico"}
        </button>
        <button 
          type="button" 
          onClick={generarAleatoria} 
          style={{ 
            backgroundColor: "#1976d2", 
            color: "white", 
            padding: "8px 16px", 
            border: "none", 
            borderRadius: "5px", 
            cursor: "pointer", 
            fontWeight: "bold",
            flex: 1
          }}
        >
          🎲 Cartera Aleatoria
        </button>
      </div>
    </form>
  );
}
