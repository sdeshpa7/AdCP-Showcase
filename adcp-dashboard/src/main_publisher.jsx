import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PublisherApp from './PublisherApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PublisherApp />
  </StrictMode>,
)
