import React from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import ProgressIndicator from './ProgressIndicator'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const showProgress = location.pathname !== '/' // Don't show progress on home page

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      {showProgress && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <ProgressIndicator />
          </div>
        </div>
      )}
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}

export default Layout
