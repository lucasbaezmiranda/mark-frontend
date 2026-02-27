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
  if (!data || !data.portfolios) return <div style={{ color: 'white' }}>Cargando datos del simulador...</div>;

  // 1. Carteras Monte Carlo (Nube de puntos azul)
  const portfolios = data.portfolios.map(p => ({
    x: p.risk,
    y: p.return
  }));

  // 2. Activos individuales (Cuadrados rojos con nombre)
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return,
    label: a.ticker || "Activo"
  }));

  // 3. Frontera eficiente (Línea verde continua)
  // IMPORTANTE: El backend ya los manda ordenados por retorno
  const frontier = data.frontier
    ? data.frontier.map(p => ({ 
        x: p.risk, 
        y: p.return
      }))
    : [];

  // 4. Punto de Mínima Varianza (El punto con menor riesgo de la frontera)
  const minVarPoint = frontier.length > 0 
    ? [...frontier].sort((a, b) => a.x - b.x)[0] 
    : null;

  const chartData = {
    datasets: [
      {
        label: 'Carteras aleatorias',
        data: portfolios,
        backgroundColor: 'rgba(54, 162, 235, 0.3)', // Azul transparente
        pointRadius: 3,
        datalabels: { display: false }
      },
      {
        label: 'Frontera eficiente',
        data: frontier,
        borderColor: 'rgba(75, 192, 192, 1)', // Verde agua sólido
        borderWidth: 4,
        showLine: true, // ⚠️ ESTO ACTIVA LA CURVA
        fill: false,
        pointRadius: 0, // Ocultamos los puntos para ver solo la línea
        pointHitRadius: 10,
        tension: 0.3, // Suavizado de la curva
        datalabels: { display: false }
      },
      {
        label: 'Activos individuales',
        data: singleAssets,
        backgroundColor: 'rgba(255, 99, 132, 1)',
        pointRadius: 7,
        pointStyle: 'rectRot',
        datalabels: {
          display: true,
          align: 'top',
          anchor: 'end',
          offset: 5,
          color: '#fff',
          font: { weight: 'bold', size: 11 },
          formatter: (value) => value.label
        }
      },
      {
        label: 'Mínima Varianza',
        data: minVarPoint ? [minVarPoint] : [],
        backgroundColor: 'rgba(255, 206, 86, 1)', // Amarillo/Oro
        pointRadius: 9,
        pointStyle: 'star',
        datalabels: { display: false }
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true, // 🛠️ CAMBIO: Activamos esto para evitar el estiramiento
    aspectRatio: 1.8, // 🛠️ CAMBIO: Proporción rectangular sana (2 es doble ancho que alto)
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#fff', font: { size: 12 } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: Riesgo ${(context.parsed.x * 100).toFixed(2)}%, Retorno ${(context.parsed.y * 100).toFixed(2)}%`;
          }
        }
      },
      datalabels: { display: false }
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Riesgo (Volatilidad Anualizada)', color: '#ccc' },
        ticks: { color: '#aaa', callback: (v) => `${(v * 100).toFixed(0)}%` },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        title: { display: true, text: 'Retorno Esperado (Anual)', color: '#ccc' },
        ticks: { color: '#aaa', callback: (v) => `${(v * 100).toFixed(0)}%` },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '1000px', // 🛠️ CAMBIO: Evita que en monitores gigantes se estire al infinito
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#1a1a1a', 
      borderRadius: '8px' 
    }}>
      <Scatter data={chartData} options={options} />
    </div>
  );
}