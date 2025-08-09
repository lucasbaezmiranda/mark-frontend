import { useState } from 'react';
import MarkowitzContainer from './components/MarkowitzContainer';

function App() {
  const [darkMode, setDarkMode] = useState(true);

  const toggleBackground = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div
      style={{
        padding: 20,
        backgroundColor: darkMode ? '#222' : '#fff',
        color: darkMode ? '#fff' : '#000',
        minHeight: '100vh'
      }}
    >
      <button
        onClick={toggleBackground}
        style={{
          marginBottom: 10,
          padding: '8px 12px',
          cursor: 'pointer'
        }}
      >
        {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
      </button>

      <h1>Frontera de Markowitz</h1>
      <MarkowitzContainer />
    </div>
  );
}

export default App;
