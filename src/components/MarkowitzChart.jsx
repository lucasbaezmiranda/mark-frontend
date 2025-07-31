import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function MarkowitzChart({ data }) {
  // Datos principales: Monte Carlo
  const portfolios = data.portfolios.map(p => ({
    x: p.risk,
    y: p.return
  }));

  // Activos individuales
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return
  }));

  // Preparar datasets
  const datasets = [
    {
      label: 'Carteras aleatorias',
      data: portfolios,
      backgroundColor: 'blue',
      pointRadius: 4,
      showLine: false
    },
    {
      label: 'Activos individuales',
      data: singleAssets,
      backgroundColor: 'red',
      pointStyle: 'triangle',
      pointRadius: 6,
      showLine: false
    },
    ...data.pairs.map((pair, i) => ({
      label: `${pair.tickers[0]}-${pair.tickers[1]}`,
      data: pair.risks.map((r, idx) => ({ x: r, y: pair.returns[idx] })),
      borderColor: 'rgba(0,0,0,0.4)',
      borderWidth: 1,
      backgroundColor: 'transparent',
      showLine: true,
      pointRadius: 0
    }))
  ];

  const chartData = {
    datasets
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            const x = context.raw.x.toFixed(4);
            const y = context.raw.y.toFixed(4);
            return ` Riesgo: ${x} | Retorno: ${y}`;
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: "Riesgo (σ anual)" } },
      y: { title: { display: true, text: "Retorno esperado anual" } }
    }
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Scatter data={chartData} options={options} height={500} />
    </div>
  );
}
