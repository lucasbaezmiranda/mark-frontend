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
  // Datos Monte Carlo
  const portfolios = data.portfolios.map(p => ({
    x: p.risk,
    y: p.return
  }));

  // Activos individuales con etiqueta (ticker)
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return,
    ticker: a.ticker
  }));

  // Construir datasets
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
      showLine: false,
      datalabels: {
        align: 'right',
        anchor: 'end',
        font: { weight: 'bold' },
        formatter: function(value) {
          return value.ticker;
        }
      }
    },
    ...data.pairs.map((pair, i) => ({
      label: `${pair.tickers[0]}-${pair.tickers[1]}`,
      data: pair.risks.map((r, idx) => ({ x: r, y: pair.returns[idx] })),
      borderColor: `hsl(${(i * 60) % 360}, 70%, 40%)`,
      borderWidth: 1.5,
      backgroundColor: 'transparent',
      showLine: true,
      pointRadius: 0
    }))
  ];

  const chartData = { datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      datalabels: {
        display: true,
        color: 'black'
      },
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
    <div style={{ width: "100%", minWidth: "800px", height: "500px" }}>
      <Scatter data={chartData} options={options} />
    </div>
  );
}
