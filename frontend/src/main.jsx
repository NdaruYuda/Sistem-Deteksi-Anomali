// frontend/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext'  // ✅ Import
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>  {/* ✅ Tambahkan di sini juga */}
      <App />
    </ThemeProvider>
  </StrictMode>,
)