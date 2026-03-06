import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { getActiveGradient, getActiveGradientHover, getActiveGradientColors } from '@/lib/theme'

if (typeof document !== 'undefined') {
  const colors = getActiveGradientColors()
  document.documentElement.style.setProperty('--theme-gradient', getActiveGradient())
  document.documentElement.style.setProperty('--theme-gradient-hover', getActiveGradientHover())
  document.documentElement.style.setProperty('--theme-gradient-start', colors.start)
  document.documentElement.style.setProperty('--theme-gradient-end', colors.end)
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 