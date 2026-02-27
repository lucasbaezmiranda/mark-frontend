import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, ChartDataLabels);

export default function MarkowitzChart({ data }) {
  if (!data) return null;

  // 1. Carteras Monte Carlo (Puntos aleatorios azules)
  const portfolios = data.portfolios.map(p => ({
    x: p.risk,
    y: p.return
  }));

  // 2. Activos individuales (Puntos rojos con Ticker)
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return,
    label: a.ticker || "Activo"
  }));

  // 3. Frontera eficiente (Línea verde trazada por C++)
  // FIX: Usamos data.frontier que es lo que manda el backend
  const frontier = data.frontier
    ? data.frontier.map(p => ({ 
        x: p.risk, 
        y: p.return
      }))
    : [];

  // 4. Cálculo local del Máximo Sharpe (opcional hasta que la Lambda lo envíe)
  const maxSharpePoint = [...portfolios].sort((a, b) => (b.y / a.x) - (a.y / b.x))[0];

  const chartData = {
    datasets: [
      {
        label: 'Carteras aleatorias',
        data: portfolios,
        backgroundColor: 'rgba(0, 123, 255, 0.4)',
        pointRadius: 4,
        datalabels: { display: false }
      },
      {
        label: 'Activos individuales',
        data: singleAssets,
        backgroundColor: 'rgba(255, 99, 132, 1)',
        pointRadius: 6,
        pointStyle: 'rectRot',
        datalabels: {
          display: true,
          align: 'top',
          anchor: 'end',
          offset: 8,
          font: { weight: 'bold', size: 12 },
          formatter: (value) => value.label
        }
      },
      {
        label: 'Frontera eficiente',
        data: frontier,
        borderColor: 'rgba(40, 167, 69, 1)',
        borderWidth: 3,
        showLine: true,
        fill: false,
        pointRadius: 0, // No mostramos puntos en la línea para que se vea limpia
        tension: 0.1,   // Suavizado de la curva
        datalabels: { display: false }
      },
      {
        label: 'Máx Sharpe (Estimado)',
        data: maxSharpePoint ? [maxSharpePoint] : [],
        backgroundColor: 'gold',
        pointRadius: 8,
        pointStyle: 'star',
        datalabels: { display: false }
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            return `${label}: Risk ${context.parsed.x.toFixed(4)}, Return ${context.parsed.y.toFixed(4)}`;
          }
        }
      },
      legend: { position: 'top' },
      datalabels: { display: false }
    },
    scales: {
      x: { 
        title: { display: true, text: 'Riesgo (Volatilidad Anualizada)' },
        grid: { color: 'rgba(200, 200, 200, 0.2)' }
      },
      y: { 
        title: { display: true, text: 'Retorno Esperado' },
        grid: { color: 'rgba(200, 200, 200, 0.2)' }
      }
    }
  };

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Scatter data={chartData} options={options} />
    </div>
  );
}