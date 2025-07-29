import { useState } from 'react';

function App() {
  const [tickers, setTickers] = useState("AAPL, GOOGL, MSFT");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setImageUrl(null);

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

      const data = await res.json();
      setImageUrl(data.url);
    } catch (err) {
      alert("Error al generar gráfico");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Frontera de Markowitz</h1>
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
        <button type="submit" disabled={loading}>
          {loading ? "Generando..." : "Generar gráfico"}
        </button>
      </form>

      {imageUrl && (
        <div style={{ marginTop: 30 }}>
          <h2>Resultado:</h2>
          <img src={imageUrl} alt="Gráfico de frontera eficiente" style={{ maxWidth: "100%" }} />
          <p><a href={imageUrl} target="_blank" rel="noopener noreferrer">Abrir en otra pestaña</a></p>
        </div>
      )}
    </div>
  );
}

export default App;
