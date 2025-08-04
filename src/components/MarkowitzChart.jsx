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

  // Activos individuales con etiqueta
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return,
    ticker: a.ticker
  }));

  // Frontera eficiente (acepta "efficient_frontier" o "frontier")
  const rawFrontier = data.frontier || data.efficient_frontier || null;
  const frontier = rawFrontier
    ? rawFrontier.risks.map((r, idx) => ({ x: r, y: rawFrontier.returns[idx] }))
    : [];

  // Punto máximo Sharpe (si existe)
  const maxSharpe = data.max_sharpe_point
    ? { x: data.max_sharpe_point.risk, y: data.max_sharpe_point.return }
    : null;

  // Línea CML (si existe risk_free y maxSharpe)
  let cmlLine = [];
  if (data.risk_free !== undefined && maxSharpe) {
    cmlLine = [
      { x: 0, y: data.risk_free },
      { x: maxSharpe.x, y: maxSharpe.y }
    ];
  }

  // Construir datasets
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
        align: 'right',
        anchor: 'end',
        font: { weight: 'bold' },
        formatter: function (value) {
          return value.ticker;
        }
      }
    },
    ...data.pairs.map((pair, i) => ({
      label: `${pair.tickers[0]}-${pair.tickers[1]}`,
      data: pair.risks.map((r, idx) => ({ x: r, y: pair.returns[idx] })),
      borderColor: `hsl(${(i * 60) % 360}, 70%, 40%)`,
      borderWidth: 1,
      backgroundColor: 'transparent',
      showLine: true,
      pointRadius: 0,
      datalabels: { display: false }
    })),
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
  ].filter(Boolean); // elimina datasets nulos

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
