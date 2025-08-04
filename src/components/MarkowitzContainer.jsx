import { useState } from 'react';
import MarkowitzForm from './MarkowitzForm';
import MarkowitzChart from './MarkowitzChart';

export default function MarkowitzContainer() {
  const [chartData, setChartData] = useState(null);
  const [csvUrl, setCsvUrl] = useState(null);
  const [riskFreeRate, setRiskFreeRate] = useState(0);
  const [showCML, setShowCML] = useState(true);

  return (
    <div style={{
      display: "flex",
      gap: "30px",
      alignItems: "flex-start",
      width: "100%",
      padding: "20px"
    }}>
      {/* Formulario */}
      <div style={{ flex: "1", maxWidth: "300px" }}>
        <MarkowitzForm 
          onResults={(data, csv, rf, cml) => {   
            setChartData(data);
            setCsvUrl(csv);
            setRiskFreeRate(rf);
            setShowCML(cml);
          }} 
        />

        {/* Link CSV */}
        {csvUrl && (
          <p style={{ marginTop: "15px" }}>
            <a 
              href={csvUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              📥 Descargar CSV
            </a>
          </p>
        )}

        {/* ✅ Mostrar pesos de la cartera óptima */}
        {chartData?.max_sharpe?.weights && (
          <div style={{ marginTop: "20px" }}>
            <h3>Pesos de la cartera óptima (Máx Sharpe):</h3>
            <ul>
              {chartData.max_sharpe.weights.map((w, idx) => (
                <li key={idx}>
                  Activo {idx + 1}: {(w * 100).toFixed(2)}%
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <div style={{ flex: "4", minWidth: "800px", minHeight: "500px", padding: "10px" }}>
        {chartData && (
          <MarkowitzChart 
            data={chartData} 
            riskFreeRate={riskFreeRate} 
            showCML={showCML}
          />
        )}
      </div>
    </div>
  );
}
