import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler // Agregado por si acaso
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, ChartDataLabels, Filler);

export default function MarkowitzChart({ data }) {
  // Validación robusta de datos
  if (!data || !data.portfolios || !data.frontier) {
    return <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>Cargando datos del simulador...</div>;
  }

  // 1. Carteras Monte Carlo
  const portfolios = data.portfolios.map(p => ({
    x: p.risk,
    y: p.return
  }));

  // 2. Activos individuales
  const singleAssets = data.single_assets.map(a => ({
    x: a.risk,
    y: a.return,
    label: a.ticker || "Activo"
  }));

  // 3. Frontera eficiente - ORDENADA POR RIESGO (EJE X)
  // Esto es CRÍTICO: Si los puntos saltan de adelante hacia atrás, la línea no se dibuja
  const frontier = [...data.frontier]
    .sort((a, b) => a.risk - b.risk) 
    .map(p => ({ 
      x: p.risk, 
      y: p.return
    }));

  // 4. Punto de Mínima Varianza
  const minVarPoint = frontier.length > 0 ? frontier[0] : null;

  const chartData = {
    datasets: [
      {
        type: 'line', // <--- FORZAMOS TIPO LÍNEA AQUÍ
        label: 'Frontera eficiente',
        data: frontier,
        borderColor: 'rgba(75, 192, 192, 1)', 
        borderWidth: 3,
        showLine: true,
        fill: false,
        pointRadius: 0, // Cambia a 2 si quieres ver los puntos de la línea para debuguear
        pointHoverRadius: 5,
        tension: 0.2, // Un valor pequeño ayuda a que no haga curvas raras
        datalabels: { display: false },
        zIndex: 10 // Asegura que esté por encima de la nube azul
      },
      {
        label: 'Carteras aleatorias',
        data: portfolios,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        pointRadius: 2,
        datalabels: { display: false },
        zIndex: 1
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
          color: '#fff',
          font: { size: 10 },
          formatter: (value) => value.label
        },
        zIndex: 20
      },
      {
        label: 'Mínima Varianza',
        data: minVarPoint ? [minVarPoint] : [],
        backgroundColor: '#FFD700',
        pointRadius: 10,
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
    animation: { duration: 0 }, // Desactivar animaciones ayuda a ver si el problema es de renderizado
    plugins: {
      legend: {
        labels: { color: '#fff' }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: R ${(ctx.parsed.x * 100).toFixed(1)}% | E(r) ${(ctx.parsed.y * 100).toFixed(1)}%`
        }
      },
      datalabels: { display: false }
    },
    scales: {
      x: {
        type: 'linear',
        ticks: { color: '#aaa', callback: (v) => `${(v * 100).toFixed(0)}%` },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        ticks: { color: '#aaa', callback: (v) => `${(v * 100).toFixed(0)}%` },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: 'auto', background: '#111', padding: '15px', borderRadius: '12px' }}>
      <Scatter data={chartData} options={options} />
    </div>
  );
}