import { useState, useEffect } from 'react';

export default function MarkowitzForm({ onResults }) {
  const [tickers, setTickers] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculateFrontier, setCalculateFrontier] = useState(false);
  const [riskFree, setRiskFree] = useState(0.03);

  const tickersPool = [
    "BBAR","BMA","CEPU","CRESY","EDN","GGAL","IRS",
    "LOMA","MELI","PAM","SUPV","TEO","TGS","TS","YPF"
  ];

  useEffect(() => {
    generarAleatoria();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return dateStr;
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setLoading(true);

    const cleanedTickers = tickers
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(t => t !== "");

    const payload = {
      tickers: cleanedTickers,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      calculate_frontier: calculateFrontier,
      risk_free: calculateFrontier ? riskFree : null
    };

    console.log("📤 Enviando payload:", payload);

    try {
      const res = await fetch("https://5e1eqa5y6b.execute-api.us-east-1.amazonaws.com/v1/query", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": "nycyeRi4SY9RM48bE8gGY8Ui0Sofq1Gb5JnXJWxh"
        },
        body: JSON.stringify(payload)
      });

      console.log("📥 Status respuesta:", res.status);

      const raw = await res.json();
      console.log("📥 Respuesta cruda:", raw);

      const data = raw.body ? JSON.parse(raw.body) : raw;
      onResults(data, data.csv_url);

    } catch (err) {
      alert("Error al obtener datos");
      console.error("❌ Error fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  const generarAleatoria = () => {
    const selected = tickersPool.sort(() => 0.5 - Math.random()).slice(0, 3);

    const now = new Date();
    const maxStart = new Date();
    maxStart.setMonth(now.getMonth() - 6);

    const minStart = new Date();
    minStart.setFullYear(now.getFullYear() - 2);

    const randomStart = new Date(
      minStart.getTime() + Math.random() * (maxStart.getTime() - minStart.getTime())
    );

    const randomEnd = new Date(randomStart);
    randomEnd.setMonth(randomStart.getMonth() + 6);

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

      {/* Checkbox para calcular frontera */}
      <div style={{ marginTop: "10px" }}>
        <label>
          <input
            type="checkbox"
            checked={calculateFrontier}
            onChange={e => setCalculateFrontier(e.target.checked)}
          /> Calcular frontera eficiente
        </label>
      </div>

      {/* Campo para tasa libre de riesgo */}
      {calculateFrontier && (
        <div style={{ marginTop: "5px" }}>
          <label>Tasa libre de riesgo (anual):</label><br />
          <input
            type="number"
            step="0.001"
            value={riskFree}
            onChange={e => setRiskFree(parseFloat(e.target.value))}
          />
        </div>
      )}

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
