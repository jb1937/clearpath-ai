import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
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
            <Route path="/" element={<HomePage />} />
            <Route path="/jurisdiction" element={<JurisdictionStep />} />
            <Route path="/case-info" element={<CaseInfoStep />} />
            <Route path="/conviction-details" element={<ConvictionDetailsStep />} />
            <Route path="/additional-factors" element={<AdditionalFactorsStep />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </Layout>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App
