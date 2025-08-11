import React from 'react'
import { Link } from 'react-router-dom'

const HomePage: React.FC = () => {
  const handleGetStarted = () => {
    // For now, just navigate - we'll add store logic later
    console.log('Getting started...')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          Clear Your
          <span className="text-primary-600"> Criminal Record</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
          Discover if you're eligible for expungement or sealing of your criminal record. 
          Our free tool provides preliminary screening based on current Washington DC laws.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/jurisdiction"
            onClick={handleGetStarted}
            className="btn-primary px-8 py-3 text-lg"
          >
            Check My Eligibility
          </Link>
          <a
            href="#how-it-works"
            className="btn-outline px-8 py-3 text-lg"
          >
            How It Works
          </a>
        </div>
      </div>

      {/* Key Benefits */}
      <div className="py-16 bg-white rounded-lg shadow-sm border border-gray-200 mb-12">
        <div className="px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Clear Your Record?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Employment Opportunities</h3>
              <p className="text-gray-600">
                Remove barriers to employment by clearing eligible convictions from background checks.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Housing Access</h3>
              <p className="text-gray-600">
                Improve your chances of securing housing by addressing criminal history concerns.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Educational Opportunities</h3>
              <p className="text-gray-600">
                Access educational programs and financial aid that may have been previously restricted.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              1
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Your Information</h3>
            <p className="text-gray-600 text-sm">
              Provide details about your criminal charges and case outcomes.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              2
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Automated Analysis</h3>
            <p className="text-gray-600 text-sm">
              Our system analyzes your case against current DC expungement laws.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              3
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Your Results</h3>
            <p className="text-gray-600 text-sm">
              Receive a detailed report on your eligibility and next steps.
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              4
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Take Action</h3>
            <p className="text-gray-600 text-sm">
              Follow our guidance to file for expungement or sealing.
            </p>
          </div>
        </div>
      </div>

      {/* Current Coverage */}
      <div className="bg-primary-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Currently Serving Washington, DC
        </h2>
        <p className="text-gray-600 mb-6">
          Our tool is specifically designed for DC criminal records and incorporates the latest 
          changes to DC expungement and sealing laws.
        </p>
        <div className="inline-flex items-center space-x-2 text-sm text-primary-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Additional states coming soon</span>
        </div>
      </div>
    </div>
  )
}

export default HomePage
