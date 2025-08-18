// Environment configuration with secure defaults
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.clearpathai.com'),
  analyticsId: import.meta.env.VITE_ANALYTICS_ID || '',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Security settings
  dataRetentionMinutes: 30,
  maxOffenseLength: 200,
  maxAge: 120,
  minAge: 1,
  maxInputLength: 1000,
  rateLimitRequests: 10,
  rateLimitWindowMs: 60000, // 1 minute
  
  // Performance settings
  analysisSimulationDelay: 1500,
  toastDuration: 4000,
  
  // Security headers
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://vitals.vercel-insights.com"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  }
} as const

// Security validation
if (config.isProduction) {
  // Ensure HTTPS in production
  if (!config.apiUrl.startsWith('https://')) {
    console.error('SECURITY WARNING: API URL must use HTTPS in production')
  }
  
  // Warn about development mode in production
  if (config.isDevelopment) {
    console.error('SECURITY WARNING: Development mode detected in production build')
  }
}

// Rate limiting store
export const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting function
export const checkRateLimit = (key: string): boolean => {
  const now = Date.now()
  const limit = rateLimitStore.get(key)
  
  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.rateLimitWindowMs })
    return true
  }
  
  if (limit.count >= config.rateLimitRequests) {
    return false
  }
  
  limit.count++
  return true
}
