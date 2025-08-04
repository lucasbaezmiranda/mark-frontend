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
  // Carteras Monte Carlo
  const portfolios = data.portfolios.map(p => ({
    x: p.risk,
    y: p.return
  }));

  // Activos individuales
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return
  }));

  // Frontera eficiente (sin multiplicar)
  const frontier = data.efficient_frontier
    ? data.efficient_frontier.risks.map((r, idx) => ({ 
        x: r, 
        y: data.efficient_frontier.returns[idx]
      }))
    : [];

  // Punto máximo Sharpe (sin multiplicar)
  const maxSharpe = data.max_sharpe
    ? { x: data.max_sharpe.risk, y: data.max_sharpe.return }
    : null;

  const chartData = {
    datasets: [
      {
        label: 'Carteras Monte Carlo',
        data: portfolios,
        backgroundColor: 'rgba(0, 123, 255, 0.4)',
        pointRadius: 4
      },
      {
        label: 'Activos individuales',
        data: singleAssets,
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        pointRadius: 5
      },
      {
        label: 'Frontera Eficiente',
        data: frontier,
        borderColor: 'green',
        borderWidth: 2,
        showLine: true,
        fill: false,
        pointRadius: 0
      },
      {
        label: 'Máx Sharpe',
        data: maxSharpe ? [maxSharpe] : [],
        backgroundColor: 'gold',
        pointRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      tooltip: { enabled: true },
      legend: { position: 'top' },
      datalabels: { display: false }
    },
    scales: {
      x: { title: { display: true, text: 'Riesgo (σ)' } },
      y: { title: { display: true, text: 'Retorno esperado' } }
    }
  };

  return <Scatter data={chartData} options={options} />;
}
