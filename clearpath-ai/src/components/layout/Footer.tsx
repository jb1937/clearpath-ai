import React from 'react'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
                <svg 
                  className="w-4 h-4 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">ClearPath AI</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4 max-w-md">
              Helping individuals understand their eligibility for criminal record expungement and sealing. 
              Our tool provides preliminary screening to guide you toward the right legal relief options.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-xs text-red-800">
                <strong>Important:</strong> This tool does not provide legal advice. Results are for informational 
                purposes only. Always consult with a qualified attorney for legal guidance specific to your situation.
              </p>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://www.dccourts.gov" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  DC Superior Court
                </a>
              </li>
              <li>
                <a 
                  href="https://www.dcbar.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  DC Bar Association
                </a>
              </li>
              <li>
                <a 
                  href="https://www.legalaiddc.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Legal Aid DC
                </a>
              </li>
              <li>
                <a 
                  href="https://www.washlaw.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Washington Lawyers' Committee
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#privacy" 
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="#terms" 
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Terms of Use
                </a>
              </li>
              <li>
                <a 
                  href="#disclaimer" 
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Legal Disclaimer
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-gray-500">
              © {currentYear} ClearPath AI. All rights reserved. Not affiliated with any government agency.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-xs text-gray-500">Currently serving:</span>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  Washington, DC
                </span>
                <span className="text-xs text-gray-400">More states coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
