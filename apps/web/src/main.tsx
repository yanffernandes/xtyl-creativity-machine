import React from 'react'
import ReactDOM from 'react-dom/client'
import './app/globals.css'
import { AppRoot } from './vite/AppRoot'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
)
