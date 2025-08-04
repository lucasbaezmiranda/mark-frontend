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
  // Carteras Monte Carlo (ya vienen anualizadas)
  const portfolios = data.portfolios.map(p => ({
    x: p.risk,
    y: p.return
  }));

  // Activos individuales (ya vienen anualizados)
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return
  }));

  // Frontera eficiente (convertir a anual)
  const frontier = data.efficient_frontier
    ? data.efficient_frontier.risks.map((r, idx) => ({ 
        x: r * 12, 
        y: data.efficient_frontier.returns[idx] * 12 
      }))
    : [];

  // Punto máximo Sharpe (convertir a anual)
  const maxSharpe = data.max_sharpe
    ? { 
        x: data.max_sharpe.risk * 12, 
        y: data.max_sharpe.return * 12 
      }
    : null;

  // Línea CML
  let cmlLine = [];
  if (data.risk_free !== undefined && maxSharpe) {
    cmlLine = [
      { x: 0, y: data.risk_free * 12 },
      { x: maxSharpe.x, y: maxSharpe.y }
    ];
  }

  // Construcción datasets
  const datasets = [
    {
      label: 'Carteras aleatorias',
      data: portfolios,
      backgroundColor: 'blue',
      pointRadius: 4,
      showLine: false,
      datalabels: { display: false }
    },
    {
      label: 'Activos individuales',
      data: singleAssets,
      backgroundColor: 'red',
      pointStyle: 'triangle',
      pointRadius: 6,
      showLine: false,
      datalabels: {
        display: true,
        align: 'top',
        anchor: 'end',
        font: { weight: 'bold' },
        formatter: (value, ctx) => data.single_assets[ctx.dataIndex].ticker
      }
    },
    frontier.length > 0 && {
      label: 'Frontera eficiente',
      data: frontier,
      borderColor: 'green',
      borderWidth: 2,
      backgroundColor: 'transparent',
      showLine: true,
      pointRadius: 0,
      datalabels: { display: false }
    },
    maxSharpe && {
      label: 'Máx Sharpe',
      data: [maxSharpe],
      backgroundColor: 'orange',
      pointStyle: 'star',
      pointRadius: 8,
      showLine: false,
      datalabels: {
        display: true,
        align: 'left',
        anchor: 'end',
        font: { weight: 'bold' },
        formatter: () => "Max Sharpe"
      }
    },
    cmlLine.length > 0 && {
      label: 'Capital Market Line',
      data: cmlLine,
      borderColor: 'purple',
      borderDash: [5, 5],
      borderWidth: 1.5,
      backgroundColor: 'transparent',
      showLine: true,
      pointRadius: 0,
      datalabels: { display: false }
    }
  ].filter(Boolean);

  const chartData = { datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      datalabels: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
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
