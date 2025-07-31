import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function MarkowitzChart({ data }) {
  // Datos principales
  const portfolios = data.portfolios.map(p => ({ x: p.risk, y: p.return }));
  const singleAssets = data.single_assets.map(a => ({ x: a.risk, y: a.return }));

  const datasets = [
    {
      label: 'Carteras aleatorias',
      data: portfolios,
      backgroundColor: 'blue',
      showLine: false,
    },
    {
      label: 'Activos individuales',
      data: singleAssets,
      backgroundColor: 'red',
      pointStyle: 'triangle',
      pointRadius: 6
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
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { title: { display: true, text: "Riesgo (σ anual)" } },
      y: { title: { display: true, text: "Retorno esperado anual" } }
    }
  };

  return <Scatter data={chartData} options={options} />;
}
