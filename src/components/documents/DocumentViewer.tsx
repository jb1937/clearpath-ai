import React, { useState, useEffect } from 'react'
import { documentStorageService } from '../../services/documentStorageService'
import { pdfGenerationService } from '../../services/pdfGenerationService'
import type { StoredDocument } from '../../services/documentStorageService'
import type { PDFGenerationOptions } from '../../services/pdfGenerationService'

interface DocumentViewerProps {
  documentId: string
  version?: number
  userId?: string
  onClose: () => void
  onDownload?: (document: StoredDocument) => void
  onEdit?: (document: StoredDocument) => void
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  version,
  userId,
  onClose,
  onDownload,
  onEdit
}) => {
  const [document, setDocument] = useState<StoredDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    loadDocument()
  }, [documentId, version])

  const loadDocument = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const doc = await documentStorageService.retrieveDocument(documentId, version, userId)
      if (!doc) {
        setError('Document not found or access denied')
        return
      }
      
      setDocument(doc)
    } catch (err) {
      console.error('Failed to load document:', err)
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!document) return

    try {
      setGeneratingPdf(true)
      
      // Convert stored document to GeneratedDocument format for PDF generation
      const generatedDoc = {
        id: document.originalId,
        templateId: document.templateId || '',
        documentType: document.documentType as any,
        title: document.title,
        content: document.content,
        htmlContent: document.htmlContent,
        metadata: document.metadata,
        status: 'generated' as const,
        createdAt: document.storageMetadata.storedAt,
        updatedAt: document.storageMetadata.lastAccessed
      }

      const pdfOptions: PDFGenerationOptions = {
        format: 'letter',
        headerFooter: true,
        pageNumbers: true
      }

      const result = await pdfGenerationService.generatePDF(generatedDoc, pdfOptions)
      
      if (result.success && result.pdfBuffer) {
        // Create download link
        const blob = new Blob([result.pdfBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = window.document.createElement('a')
        link.href = url
        link.download = result.filename || `${document.title}.pdf`
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        setError('Failed to generate PDF')
      }
    } catch (err) {
      console.error('PDF generation failed:', err)
      setError('Failed to generate PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownload = () => {
    if (document && onDownload) {
      onDownload(document)
    }
  }

  const handleEdit = () => {
    if (document && onEdit) {
      onEdit(document)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span>Loading document...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error</span>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{document.title}</h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Version {document.version}</span>
              <span>•</span>
              <span>{document.documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              <span>•</span>
              <span>{formatFileSize(document.storageMetadata.fileSize)}</span>
              {document.storageMetadata.encrypted && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-green-600">Encrypted</span>
                  </span>
                </>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('html')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'html'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Formatted View
            </button>
            <button
              onClick={() => setViewMode('text')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'text'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Plain Text
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
            
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPdf ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span>{generatingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>

            {onDownload && (
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download</span>
              </button>
            )}
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">
            {viewMode === 'html' ? (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: document.htmlContent }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded-md">
                {document.content}
              </pre>
            )}
          </div>
        </div>

        {/* Footer with metadata */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <div className="text-gray-600">{formatDate(document.storageMetadata.storedAt)}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Accessed:</span>
              <div className="text-gray-600">{formatDate(document.storageMetadata.lastAccessed)}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Access Count:</span>
              <div className="text-gray-600">{document.storageMetadata.accessCount}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                document.status === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : document.status === 'archived'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
