import { dataSecurityService } from './dataSecurity'
import { securityConfig } from '../config/security'
import { SecureError, SecureErrorFactory } from '../utils/secureError'
import type { GeneratedDocument, DocumentMetadata } from '../types/documents'

/**
 * PDF Generation Service
 * Handles conversion of HTML documents to PDF format with legal document standards
 * Includes security, formatting, and compliance features
 */

export interface PDFGenerationOptions {
  format?: 'letter' | 'legal' | 'a4'
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  headerFooter?: boolean
  pageNumbers?: boolean
  watermark?: string
  security?: {
    password?: string
    permissions?: string[]
  }
}

export interface PDFGenerationResult {
  success: boolean
  pdfBuffer?: Buffer
  filename?: string
  metadata?: PDFMetadata
  errors?: Array<{
    field: string
    message: string
    code: string
    severity: 'error' | 'warning'
  }>
}

export interface PDFMetadata {
  title: string
  author: string
  subject: string
  creator: string
  producer: string
  creationDate: Date
  modificationDate: Date
  pageCount: number
  fileSize: number
  security: {
    encrypted: boolean
    permissions: string[]
  }
}

export class PDFGenerationService {
  private static instance: PDFGenerationService
  private generationCache: Map<string, Buffer> = new Map()
  private readonly defaultOptions: PDFGenerationOptions = {
    format: 'letter',
    orientation: 'portrait',
    margins: {
      top: 72,    // 1 inch
      right: 72,  // 1 inch
      bottom: 72, // 1 inch
      left: 72    // 1 inch
    },
    headerFooter: true,
    pageNumbers: true,
    security: {
      permissions: ['print', 'copy']
    }
  }

  private constructor() {
    // Initialize PDF generation service
  }

  static getInstance(): PDFGenerationService {
    if (!PDFGenerationService.instance) {
      PDFGenerationService.instance = new PDFGenerationService()
    }
    return PDFGenerationService.instance
  }

  /**
   * Generate PDF from HTML document with legal formatting standards
   */
  async generatePDF(
    document: GeneratedDocument,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      // Validate inputs
      const validation = this.validatePDFRequest(document, options)
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        }
      }

      // Merge options with defaults
      const pdfOptions = { ...this.defaultOptions, ...options }

      // Check cache for performance
      const cacheKey = this.generateCacheKey(document, pdfOptions)
      const cachedPDF = this.generationCache.get(cacheKey)
      if (cachedPDF) {
        return {
          success: true,
          pdfBuffer: cachedPDF,
          filename: this.generateFilename(document),
          metadata: await this.extractPDFMetadata(cachedPDF, document)
        }
      }

      // Prepare HTML content for PDF generation
      const htmlContent = this.prepareHTMLForPDF(document, pdfOptions)

      // Generate PDF using Puppeteer (simulated - would use actual PDF library)
      const pdfBuffer = await this.generatePDFFromHTML(htmlContent, pdfOptions)

      // Apply security settings
      const securedPDF = await this.applyPDFSecurity(pdfBuffer, pdfOptions, document)

      // Cache the result
      this.cachePDF(cacheKey, securedPDF)

      // Generate metadata
      const metadata = await this.extractPDFMetadata(securedPDF, document)

      return {
        success: true,
        pdfBuffer: securedPDF,
        filename: this.generateFilename(document),
        metadata
      }

    } catch (error) {
      console.error('PDF generation failed:', error)
      
      return {
        success: false,
        errors: [{
          field: 'pdf_generation',
          message: 'PDF generation failed due to an internal error',
          code: 'PDF_GENERATION_ERROR',
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Generate PDF with attorney review formatting
   */
  async generateAttorneyReviewPDF(
    document: GeneratedDocument,
    reviewNotes?: string[]
  ): Promise<PDFGenerationResult> {
    const reviewOptions: PDFGenerationOptions = {
      ...this.defaultOptions,
      watermark: 'ATTORNEY REVIEW REQUIRED',
      security: {
        password: dataSecurityService.generateSecureId().substring(0, 8),
        permissions: ['print'] // Restrict copying for review documents
      }
    }

    // Add review notes to document
    const reviewDocument = {
      ...document,
      htmlContent: this.addReviewNotesToHTML(document.htmlContent, reviewNotes)
    }

    return this.generatePDF(reviewDocument, reviewOptions)
  }

  /**
   * Generate court-ready PDF with proper formatting
   */
  async generateCourtReadyPDF(
    document: GeneratedDocument,
    courtInfo?: {
      courtName: string
      caseNumber?: string
      filingDate?: Date
    }
  ): Promise<PDFGenerationResult> {
    const courtOptions: PDFGenerationOptions = {
      ...this.defaultOptions,
      format: 'legal', // Legal size paper for court documents
      margins: {
        top: 108,   // 1.5 inches for court header
        right: 72,  // 1 inch
        bottom: 72, // 1 inch
        left: 108   // 1.5 inches for binding
      }
    }

    // Add court formatting to document
    const courtDocument = {
      ...document,
      htmlContent: this.addCourtFormattingToHTML(document.htmlContent, courtInfo)
    }

    return this.generatePDF(courtDocument, courtOptions)
  }

  /**
   * Validate PDF generation request
   */
  private validatePDFRequest(
    document: GeneratedDocument,
    options: PDFGenerationOptions
  ): { isValid: boolean; errors: any[] } {
    const errors: any[] = []

    // Validate document
    if (!document || !document.htmlContent) {
      errors.push({
        field: 'document',
        message: 'Valid document with HTML content is required',
        code: 'INVALID_DOCUMENT',
        severity: 'error'
      })
    }

    // Validate HTML content size
    if (document.htmlContent && document.htmlContent.length > 1000000) { // 1MB limit
      errors.push({
        field: 'htmlContent',
        message: 'HTML content exceeds maximum size limit',
        code: 'CONTENT_TOO_LARGE',
        severity: 'error'
      })
    }

    // Validate options
    if (options.format && !['letter', 'legal', 'a4'].includes(options.format)) {
      errors.push({
        field: 'format',
        message: 'Invalid paper format specified',
        code: 'INVALID_FORMAT',
        severity: 'error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Prepare HTML content for PDF generation with legal formatting
   */
  private prepareHTMLForPDF(
    document: GeneratedDocument,
    options: PDFGenerationOptions
  ): string {
    let html = document.htmlContent

    // Add legal document CSS
    const legalCSS = this.generateLegalDocumentCSS(options)
    html = html.replace('<head>', `<head><style>${legalCSS}</style>`)

    // Add page breaks for multi-page documents
    html = this.addPageBreaks(html)

    // Add header and footer if requested
    if (options.headerFooter) {
      html = this.addHeaderFooter(html, document, options)
    }

    // Add watermark if specified
    if (options.watermark) {
      html = this.addWatermark(html, options.watermark)
    }

    return html
  }

  /**
   * Generate legal document CSS for proper formatting
   */
  private generateLegalDocumentCSS(options: PDFGenerationOptions): string {
    const margins = options.margins || this.defaultOptions.margins!

    return `
      @page {
        size: ${options.format || 'letter'};
        margin-top: ${margins.top}px;
        margin-right: ${margins.right}px;
        margin-bottom: ${margins.bottom}px;
        margin-left: ${margins.left}px;
      }
      
      body {
        font-family: 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #000;
        margin: 0;
        padding: 0;
      }
      
      .document-header {
        text-align: center;
        margin-bottom: 30px;
        font-weight: bold;
        font-size: 14pt;
      }
      
      .court-caption {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
      }
      
      .signature-block {
        margin-top: 40px;
        page-break-inside: avoid;
      }
      
      .signature-line {
        border-bottom: 1px solid #000;
        width: 300px;
        margin: 20px 0 5px 0;
        display: inline-block;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
      
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 72pt;
        color: rgba(0, 0, 0, 0.1);
        z-index: -1;
        pointer-events: none;
      }
      
      @media print {
        .no-print { display: none !important; }
      }
    `
  }

  /**
   * Add page breaks for proper document flow
   */
  private addPageBreaks(html: string): string {
    // Add page breaks before major sections
    html = html.replace(/<h1/g, '<div class="page-break"></div><h1')
    
    // Ensure signature blocks don't break across pages
    html = html.replace(/class="signature-line"/g, 'class="signature-line no-break"')
    
    return html
  }

  /**
   * Add header and footer to document
   */
  private addHeaderFooter(
    html: string,
    document: GeneratedDocument,
    options: PDFGenerationOptions
  ): string {
    const header = `
      <div class="document-header">
        ${document.title}
        <br>
        <small>Case ID: ${document.metadata.caseId}</small>
      </div>
    `

    const footer = options.pageNumbers ? `
      <div class="document-footer" style="position: fixed; bottom: 20px; right: 20px; font-size: 10pt;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    ` : ''

    // Insert header after body tag
    html = html.replace('<body>', `<body>${header}`)
    
    // Insert footer before closing body tag
    html = html.replace('</body>', `${footer}</body>`)

    return html
  }

  /**
   * Add watermark to document
   */
  private addWatermark(html: string, watermarkText: string): string {
    const watermark = `<div class="watermark">${watermarkText}</div>`
    return html.replace('<body>', `<body>${watermark}`)
  }

  /**
   * Add review notes to HTML for attorney review
   */
  private addReviewNotesToHTML(html: string, reviewNotes?: string[]): string {
    if (!reviewNotes || reviewNotes.length === 0) {
      return html
    }

    const notesSection = `
      <div class="review-notes page-break">
        <h2>Attorney Review Notes</h2>
        <ul>
          ${reviewNotes.map(note => `<li>${note}</li>`).join('')}
        </ul>
      </div>
    `

    return html.replace('</body>', `${notesSection}</body>`)
  }

  /**
   * Add court formatting to HTML
   */
  private addCourtFormattingToHTML(
    html: string,
    courtInfo?: {
      courtName: string
      caseNumber?: string
      filingDate?: Date
    }
  ): string {
    if (!courtInfo) {
      return html
    }

    const courtCaption = `
      <div class="court-caption">
        <strong>${courtInfo.courtName}</strong>
        ${courtInfo.caseNumber ? `<br>Case No. ${courtInfo.caseNumber}` : ''}
        ${courtInfo.filingDate ? `<br>Filed: ${courtInfo.filingDate.toLocaleDateString()}` : ''}
      </div>
    `

    return html.replace('<body>', `<body>${courtCaption}`)
  }

  /**
   * Generate PDF from HTML (simulated - would use actual PDF library like Puppeteer)
   */
  private async generatePDFFromHTML(
    html: string,
    options: PDFGenerationOptions
  ): Promise<Buffer> {
    // In a real implementation, this would use Puppeteer or similar
    // For now, we'll simulate PDF generation
    
    const simulatedPDFContent = `
      %PDF-1.4
      1 0 obj
      <<
      /Type /Catalog
      /Pages 2 0 R
      >>
      endobj
      
      2 0 obj
      <<
      /Type /Pages
      /Kids [3 0 R]
      /Count 1
      >>
      endobj
      
      3 0 obj
      <<
      /Type /Page
      /Parent 2 0 R
      /MediaBox [0 0 612 792]
      /Contents 4 0 R
      >>
      endobj
      
      4 0 obj
      <<
      /Length ${html.length}
      >>
      stream
      ${html}
      endstream
      endobj
      
      xref
      0 5
      0000000000 65535 f 
      0000000009 00000 n 
      0000000058 00000 n 
      0000000115 00000 n 
      0000000206 00000 n 
      trailer
      <<
      /Size 5
      /Root 1 0 R
      >>
      startxref
      ${300 + html.length}
      %%EOF
    `

    return Buffer.from(simulatedPDFContent, 'utf-8')
  }

  /**
   * Apply security settings to PDF
   */
  private async applyPDFSecurity(
    pdfBuffer: Buffer,
    options: PDFGenerationOptions,
    document: GeneratedDocument
  ): Promise<Buffer> {
    // In a real implementation, this would apply actual PDF security
    // For now, we'll simulate security application
    
    if (options.security?.password) {
      // Encrypt the PDF buffer (simulated)
      const bufferString = pdfBuffer.toString('utf-8') || ''
      const encryptedContent = dataSecurityService.encryptData(bufferString as any)
      return Buffer.from(encryptedContent, 'utf-8')
    }

    return pdfBuffer
  }

  /**
   * Extract PDF metadata
   */
  private async extractPDFMetadata(
    pdfBuffer: Buffer,
    document: GeneratedDocument
  ): Promise<PDFMetadata> {
    return {
      title: document.title,
      author: 'ClearPath AI Document Generator',
      subject: `Legal Document - ${document.documentType}`,
      creator: 'ClearPath AI',
      producer: 'ClearPath AI PDF Service v1.0',
      creationDate: new Date(),
      modificationDate: new Date(),
      pageCount: Math.ceil(pdfBuffer.length / 1000), // Simulated page count
      fileSize: pdfBuffer.length,
      security: {
        encrypted: false, // Would be determined from actual PDF
        permissions: ['print', 'copy']
      }
    }
  }

  /**
   * Generate cache key for PDF caching
   */
  private generateCacheKey(
    document: GeneratedDocument,
    options: PDFGenerationOptions
  ): string {
    const keyData = {
      documentId: document.id,
      htmlHash: this.hashString(document.htmlContent),
      options: JSON.stringify(options),
      timestamp: Math.floor(Date.now() / (1000 * 60 * 30)) // 30-minute buckets
    }

    return dataSecurityService.generateSecureId() + '_' + 
           Buffer.from(JSON.stringify(keyData)).toString('base64').substring(0, 16)
  }

  /**
   * Cache PDF for performance
   */
  private cachePDF(key: string, pdfBuffer: Buffer): void {
    // Limit cache size
    if (this.generationCache.size >= 50) {
      const oldestKey = this.generationCache.keys().next().value
      this.generationCache.delete(oldestKey)
    }

    this.generationCache.set(key, pdfBuffer)
  }

  /**
   * Generate filename for PDF
   */
  private generateFilename(document: GeneratedDocument): string {
    const sanitizedTitle = document.title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)

    const timestamp = new Date().toISOString().split('T')[0]
    
    return `${sanitizedTitle}_${timestamp}.pdf`
  }

  /**
   * Hash string for cache key generation
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  /**
   * Clear PDF cache
   */
  clearCache(): void {
    this.generationCache.clear()
  }
}

// Export singleton instance
export const pdfGenerationService = PDFGenerationService.getInstance()
