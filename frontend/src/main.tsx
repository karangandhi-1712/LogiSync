import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Set initial theme class on <html> before React mounts to prevent flash
const savedTheme = localStorage.getItem('logisync-theme') || 'dark';
document.documentElement.classList.add(savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
