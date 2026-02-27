import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ScatterController
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(LinearScale, PointElement, LineElement, ScatterController, Tooltip, Legend, ChartDataLabels);

export default function MarkowitzChart({ data }) {
  if (!data || !data.portfolios) return <div style={{ color: 'white' }}>Cargando datos...</div>;

  // 1. Carteras Monte Carlo
  const portfolios = data.portfolios.map(p => ({ x: p.risk, y: p.return }));

  // 2. Activos individuales
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return,
    label: a.ticker || "Activo"
  }));

  // 3. Frontera eficiente (Respetando el orden del Backend)
  const frontier = data.frontier
    ? data.frontier.map(p => ({ 
        x: p.risk, 
        y: p.return
      }))
    : [];

  // 4. Punto de Mínima Varianza (Buscamos el mínimo X del array para marcarlo)
  const minVarPoint = frontier.length > 0 
    ? [...frontier].sort((a, b) => a.x - b.x)[0] 
    : null;

  const chartData = {
    datasets: [
      {
        label: 'Frontera eficiente',
        data: frontier,
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 3,
        showLine: true,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        zIndex: 10,
        // ESTO ES CLAVE: Evita que Chart.js intente "entender" el orden de los datos
        // y simplemente una los puntos en el orden del array.
        parsing: false 
      },
      {
        type: 'scatter',
        label: 'Carteras aleatorias',
        data: portfolios,
        backgroundColor: 'rgba(54, 162, 235, 0.15)',
        pointRadius: 2,
        datalabels: { display: false },
        zIndex: 1
      },
      {
        type: 'scatter',
        label: 'Activos individuales',
        data: singleAssets,
        backgroundColor: 'rgba(255, 99, 132, 1)',
        pointRadius: 7,
        pointStyle: 'rectRot',
        datalabels: {
          display: true,
          align: 'top',
          color: '#fff',
          formatter: (v) => v.label
        },
        zIndex: 20
      },
      {
        type: 'scatter',
        label: 'Mínima Varianza',
        data: minVarPoint ? [minVarPoint] : [],
        backgroundColor: 'rgba(255, 206, 86, 1)',
        pointRadius: 9,
        pointStyle: 'star',
        datalabels: { display: false },
        zIndex: 30
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.8,
    plugins: {
      legend: { labels: { color: '#fff' } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: Riesgo ${(ctx.parsed.x * 100).toFixed(2)}%, Retorno ${(ctx.parsed.y * 100).toFixed(2)}%`
        }
      },
      datalabels: { display: false }
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Riesgo (Volatilidad)', color: '#ccc' },
        ticks: { color: '#aaa', callback: (v) => `${(v * 100).toFixed(0)}%` },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        title: { display: true, text: 'Retorno', color: '#ccc' },
        ticks: { color: '#aaa', callback: (v) => `${(v * 100).toFixed(0)}%` },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '1000px', 
      margin: '0 auto', 
      padding: '20px', 
      backgroundColor: '#1a1a1a', 
      borderRadius: '8px' 
    }}>
      <Line data={chartData} options={options} />
    </div>
  );
}