import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LoadingPage from './components/LoadingPage.jsx'
import './index.css'

// Lazy load the main App component
const App = lazy(() => import('./App.jsx'))

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MemoryRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LoadingPage />} />
          <Route path="/dashboard" element={<App />} />
        </Routes>
      </Suspense>
    </MemoryRouter>
  </React.StrictMode>
)
