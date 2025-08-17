// Environment configuration with secure defaults
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  encryptionKey: import.meta.env.VITE_ENCRYPTION_KEY || 'clearpath-default-key-change-in-production',
  analyticsId: import.meta.env.VITE_ANALYTICS_ID || '',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Security settings
  dataRetentionMinutes: 30,
  maxOffenseLength: 200,
  maxAge: 120,
  minAge: 1,
  
  // Performance settings
  analysisSimulationDelay: 1500,
  toastDuration: 4000
} as const

// Validate required environment variables in production
if (config.isProduction) {
  const requiredEnvVars = ['VITE_ENCRYPTION_KEY']
  const missing = requiredEnvVars.filter(key => !import.meta.env[key])
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing)
  }
}
