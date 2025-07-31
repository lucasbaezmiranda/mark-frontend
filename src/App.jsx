import { useState } from 'react';
import MarkowitzForm from './components/MarkowitzForm';
import MarkowitzChart from './components/MarkowitzChart';

function App() {
  const [chartData, setChartData] = useState(null);
  const [csvUrl, setCsvUrl] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h1>Frontera de Markowitz</h1>
      <MarkowitzForm onResults={(data, csv) => { 
        setChartData(data);
        setCsvUrl(csv);
      }} />
      {chartData && (
        <div style={{ marginTop: 30 }}>
          <MarkowitzChart data={chartData} />
          {csvUrl && (
            <p><a href={csvUrl} target="_blank" rel="noopener noreferrer">Descargar CSV</a></p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
