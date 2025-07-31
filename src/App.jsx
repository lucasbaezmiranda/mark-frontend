import { useState } from 'react';
import MarkowitzForm from './components/MarkowitzForm';
import MarkowitzChart from './components/MarkowitzChart';

function App() {
  const [chartData, setChartData] = useState(null);
  const [csvUrl, setCsvUrl] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h1>Frontera de Markowitz</h1>
      <div style={{
        display: "flex",
        gap: "30px",
        alignItems: "flex-start"
      }}>
        {/* Columna izquierda - Form */}
        <div style={{ flex: "1", maxWidth: "350px" }}>
          <MarkowitzForm onResults={(data, csv) => { 
            setChartData(data);
            setCsvUrl(csv);
          }} />
          {csvUrl && (
            <p style={{ marginTop: "15px" }}>
              <a href={csvUrl} target="_blank" rel="noopener noreferrer">
                📥 Descargar CSV
              </a>
            </p>
          )}
        </div>

        {/* Columna derecha - Gráfico */}
        <div style={{ flex: "3", minWidth: "600px", height: "500px" }}>
          {chartData && <MarkowitzChart data={chartData} />}
        </div>
      </div>
    </div>
  );
}

export default App;
