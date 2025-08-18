/**
 * CSP Violation Monitoring Service
 * Monitors and reports Content Security Policy violations
 */

export interface CSPViolation {
  timestamp: Date
  documentURI: string
  referrer: string
  violatedDirective: string
  effectiveDirective: string
  originalPolicy: string
  blockedURI: string
  lineNumber?: number
  columnNumber?: number
  sourceFile?: string
  statusCode: number
  disposition: 'enforce' | 'report'
}

export interface CSPViolationReport {
  violations: CSPViolation[]
  totalViolations: number
  uniqueViolations: number
  mostCommonViolations: { directive: string; count: number }[]
  timeRange: { start: Date; end: Date }
}

export class CSPMonitoringService {
  private static instance: CSPMonitoringService
  private violations: CSPViolation[] = []
  private maxViolations = 1000 // Keep last 1000 violations
  private reportingEndpoint?: string

  private constructor() {
    this.setupCSPViolationListener()
    this.setupReportingEndpoint()
  }

  static getInstance(): CSPMonitoringService {
    if (!CSPMonitoringService.instance) {
      CSPMonitoringService.instance = new CSPMonitoringService()
    }
    return CSPMonitoringService.instance
  }

  /**
   * Set up CSP violation event listener
   */
  private setupCSPViolationListener(): void {
    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleCSPViolation(event)
    })

    // Also listen for report-only violations
    window.addEventListener('securitypolicyviolation', (event) => {
      this.handleCSPViolation(event)
    })
  }

  /**
   * Set up reporting endpoint configuration
   */
  private setupReportingEndpoint(): void {
    // Check if reporting endpoint is configured in CSP
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    if (cspMeta) {
      const cspContent = cspMeta.getAttribute('content') || ''
      const reportUriMatch = cspContent.match(/report-uri\s+([^;]+)/)
      if (reportUriMatch) {
        this.reportingEndpoint = reportUriMatch[1].trim()
      }
    }
  }

  /**
   * Handle CSP violation events
   */
  private handleCSPViolation(event: SecurityPolicyViolationEvent): void {
    const violation: CSPViolation = {
      timestamp: new Date(),
      documentURI: event.documentURI,
      referrer: event.referrer,
      violatedDirective: event.violatedDirective,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      blockedURI: event.blockedURI,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
      sourceFile: event.sourceFile,
      statusCode: event.statusCode,
      disposition: event.disposition as 'enforce' | 'report'
    }

    // Store violation locally
    this.violations.push(violation)

    // Keep only the most recent violations
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(-this.maxViolations)
    }

    // Log violation in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('CSP Violation detected:', violation)
    }

    // Report violation to server if endpoint is configured
    this.reportViolation(violation)

    // Trigger custom event for application-level handling
    window.dispatchEvent(new CustomEvent('csp-violation', { detail: violation }))
  }

  /**
   * Report violation to server endpoint
   */
  private async reportViolation(violation: CSPViolation): Promise<void> {
    if (!this.reportingEndpoint) {
      return
    }

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/csp-report'
        },
        body: JSON.stringify({
          'csp-report': {
            'document-uri': violation.documentURI,
            'referrer': violation.referrer,
            'violated-directive': violation.violatedDirective,
            'effective-directive': violation.effectiveDirective,
            'original-policy': violation.originalPolicy,
            'blocked-uri': violation.blockedURI,
            'line-number': violation.lineNumber,
            'column-number': violation.columnNumber,
            'source-file': violation.sourceFile,
            'status-code': violation.statusCode,
            'disposition': violation.disposition
          }
        })
      })
    } catch (error) {
      console.error('Failed to report CSP violation:', error)
    }
  }

  /**
   * Get all recorded violations
   */
  getViolations(): CSPViolation[] {
    return [...this.violations]
  }

  /**
   * Get violations within a time range
   */
  getViolationsInRange(startDate: Date, endDate: Date): CSPViolation[] {
    return this.violations.filter(v => 
      v.timestamp >= startDate && v.timestamp <= endDate
    )
  }

  /**
   * Generate comprehensive violation report
   */
  generateReport(timeRange?: { start: Date; end: Date }): CSPViolationReport {
    const violations = timeRange 
      ? this.getViolationsInRange(timeRange.start, timeRange.end)
      : this.violations

    const totalViolations = violations.length
    const uniqueViolations = new Set(violations.map(v => 
      `${v.violatedDirective}:${v.blockedURI}`
    )).size

    // Count violations by directive
    const violationCounts = new Map<string, number>()
    violations.forEach(v => {
      const key = v.violatedDirective
      violationCounts.set(key, (violationCounts.get(key) || 0) + 1)
    })

    const mostCommonViolations = Array.from(violationCounts.entries())
      .map(([directive, count]) => ({ directive, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const actualTimeRange = violations.length > 0 ? {
      start: new Date(Math.min(...violations.map(v => v.timestamp.getTime()))),
      end: new Date(Math.max(...violations.map(v => v.timestamp.getTime())))
    } : {
      start: new Date(),
      end: new Date()
    }

    return {
      violations,
      totalViolations,
      uniqueViolations,
      mostCommonViolations,
      timeRange: timeRange || actualTimeRange
    }
  }

  /**
   * Clear all stored violations
   */
  clearViolations(): void {
    this.violations = []
  }

  /**
   * Get violation statistics
   */
  getStatistics(): {
    totalViolations: number
    violationsToday: number
    violationsThisHour: number
    topViolatedDirectives: string[]
    topBlockedURIs: string[]
  } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())

    const violationsToday = this.violations.filter(v => v.timestamp >= today).length
    const violationsThisHour = this.violations.filter(v => v.timestamp >= thisHour).length

    // Get top violated directives
    const directiveCounts = new Map<string, number>()
    this.violations.forEach(v => {
      directiveCounts.set(v.violatedDirective, (directiveCounts.get(v.violatedDirective) || 0) + 1)
    })
    const topViolatedDirectives = Array.from(directiveCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([directive]) => directive)

    // Get top blocked URIs
    const uriCounts = new Map<string, number>()
    this.violations.forEach(v => {
      uriCounts.set(v.blockedURI, (uriCounts.get(v.blockedURI) || 0) + 1)
    })
    const topBlockedURIs = Array.from(uriCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uri]) => uri)

    return {
      totalViolations: this.violations.length,
      violationsToday,
      violationsThisHour,
      topViolatedDirectives,
      topBlockedURIs
    }
  }

  /**
   * Set up automatic reporting interval
   */
  setupPeriodicReporting(intervalMinutes: number = 60): void {
    setInterval(() => {
      const report = this.generateReport()
      if (report.totalViolations > 0) {
        this.sendPeriodicReport(report)
      }
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Send periodic report to monitoring service
   */
  private async sendPeriodicReport(report: CSPViolationReport): Promise<void> {
    try {
      // In a real application, you would send this to your monitoring service
      // For now, we'll just log it
      console.info('CSP Violation Report:', {
        timestamp: new Date().toISOString(),
        totalViolations: report.totalViolations,
        uniqueViolations: report.uniqueViolations,
        mostCommonViolations: report.mostCommonViolations.slice(0, 3)
      })

      // Example: Send to external monitoring service
      // await fetch('/api/security/csp-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // })
    } catch (error) {
      console.error('Failed to send periodic CSP report:', error)
    }
  }

  /**
   * Check if current CSP configuration is effective
   */
  analyzeCSPEffectiveness(): {
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100

    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    if (!cspMeta) {
      issues.push('No CSP meta tag found')
      recommendations.push('Add Content-Security-Policy meta tag')
      score -= 50
      return { score: Math.max(0, score), issues, recommendations }
    }

    const cspContent = cspMeta.getAttribute('content') || ''

    // Check for unsafe directives
    if (cspContent.includes('unsafe-inline')) {
      issues.push('unsafe-inline directive found')
      recommendations.push('Remove unsafe-inline and use nonces or hashes')
      score -= 20
    }

    if (cspContent.includes('unsafe-eval')) {
      issues.push('unsafe-eval directive found')
      recommendations.push('Remove unsafe-eval directive')
      score -= 30
    }

    if (cspContent.includes("'*'") || cspContent.includes(' *')) {
      issues.push('Wildcard (*) directive found')
      recommendations.push('Replace wildcards with specific domains')
      score -= 15
    }

    // Check for missing essential directives
    const essentialDirectives = ['default-src', 'script-src', 'style-src', 'img-src']
    essentialDirectives.forEach(directive => {
      if (!cspContent.includes(directive)) {
        issues.push(`Missing ${directive} directive`)
        recommendations.push(`Add ${directive} directive`)
        score -= 10
      }
    })

    // Check violation patterns
    const recentViolations = this.violations.filter(v => 
      v.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    )

    if (recentViolations.length > 10) {
      issues.push(`High number of violations (${recentViolations.length}) in last 24 hours`)
      recommendations.push('Review and adjust CSP directives based on violation patterns')
      score -= Math.min(20, recentViolations.length)
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations
    }
  }

  /**
   * Export violations as CSV
   */
  exportViolationsCSV(): string {
    const headers = [
      'Timestamp',
      'Document URI',
      'Violated Directive',
      'Blocked URI',
      'Source File',
      'Line Number',
      'Disposition'
    ]

    const rows = this.violations.map(v => [
      v.timestamp.toISOString(),
      v.documentURI,
      v.violatedDirective,
      v.blockedURI,
      v.sourceFile || '',
      v.lineNumber?.toString() || '',
      v.disposition
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }
}

// Export singleton instance
export const cspMonitoringService = CSPMonitoringService.getInstance()

// Set up automatic periodic reporting (every hour)
cspMonitoringService.setupPeriodicReporting(60)
