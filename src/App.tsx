import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import { config } from './config/env'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import HomePage from './pages/HomePage'
import JurisdictionStep from './pages/JurisdictionStep'
import CaseInfoStep from './pages/CaseInfoStep'
import ConvictionDetailsStep from './pages/ConvictionDetailsStep'
import AdditionalFactorsStep from './pages/AdditionalFactorsStep'
import ResultsPage from './pages/ResultsPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Layout>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute requiredStep={0}>
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/jurisdiction" element={
              <ProtectedRoute requiredStep={1}>
                <JurisdictionStep />
              </ProtectedRoute>
            } />
            <Route path="/case-info" element={
              <ProtectedRoute requiredStep={2}>
                <CaseInfoStep />
              </ProtectedRoute>
            } />
            <Route path="/conviction-details" element={
              <ProtectedRoute requiredStep={3}>
                <ConvictionDetailsStep />
              </ProtectedRoute>
            } />
            <Route path="/additional-factors" element={
              <ProtectedRoute requiredStep={4}>
                <AdditionalFactorsStep />
              </ProtectedRoute>
            } />
            <Route path="/results" element={
              <ProtectedRoute requiredStep={5}>
                <ResultsPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Layout>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: config.toastDuration,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        <Analytics />
      </div>
    </Router>
  )
}

export default App
