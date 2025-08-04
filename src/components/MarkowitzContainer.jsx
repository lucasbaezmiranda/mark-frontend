import { useState } from 'react';
import MarkowitzForm from './MarkowitzForm';
import MarkowitzChart from './MarkowitzChart';

export default function MarkowitzContainer() {
  const [chartData, setChartData] = useState(null);
  const [csvUrl, setCsvUrl] = useState(null);
  const [riskFreeRate, setRiskFreeRate] = useState(0); // ✅ Nuevo estado

  return (
    <div style={{
      display: "flex",
      gap: "30px",
      alignItems: "flex-start",
      width: "100%"
    }}>
      {/* Formulario */}
      <div style={{ flex: "1", maxWidth: "300px" }}>
        <MarkowitzForm 
          onResults={(data, csv, rf) => {   // ✅ Capturamos el riskFreeRate
            setChartData(data);
            setCsvUrl(csv);
            setRiskFreeRate(rf);           // ✅ Guardamos tasa libre
          }} 
        />
        {csvUrl && (
          <p style={{ marginTop: "15px" }}>
            <a href={csvUrl} target="_blank" rel="noopener noreferrer">
              📥 Descargar CSV
            </a>
          </p>
        )}
      </div>

      {/* Gráfico */}
      <div style={{ flex: "4", minWidth: "800px", minHeight: "500px" }}>
        {chartData && <MarkowitzChart data={chartData} riskFreeRate={riskFreeRate} />} 
      </div>
    </div>
  );
}
