import React, { useState, useEffect } from 'react'
import { documentTemplateEngine } from '../../services/documentTemplateEngine'
import { dcDocumentGenerator } from '../../services/dcDocumentGenerator'
import { pdfGenerationService } from '../../services/pdfGenerationService'
import { documentStorageService } from '../../services/documentStorageService'
import { DocumentViewer } from './DocumentViewer'
import type { UserCase, AdditionalFactors } from '../../types'
import type { GeneratedDocument, DocumentGenerationResult } from '../../types/documents'
import type { StoredDocument } from '../../services/documentStorageService'

interface DocumentGenerationPanelProps {
  userCase: UserCase
  additionalFactors: AdditionalFactors
  eligibilityResult: any
  onDocumentGenerated?: (document: GeneratedDocument) => void
}

export const DocumentGenerationPanel: React.FC<DocumentGenerationPanelProps> = ({
  userCase,
  additionalFactors,
  eligibilityResult,
  onDocumentGenerated
}) => {
  const [availableDocuments, setAvailableDocuments] = useState<string[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewingDocument, setViewingDocument] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState<{
    current: number
    total: number
    currentDocument: string
  } | null>(null)

  useEffect(() => {
    loadAvailableDocuments()
  }, [userCase, eligibilityResult])

  const loadAvailableDocuments = async () => {
    try {
      // Get available document types based on eligibility results
      const documents: string[] = []

      if (eligibilityResult.expungementEligible) {
        documents.push('petition_expungement')
        documents.push('affidavit_expungement')
      }

      if (eligibilityResult.sealingEligible) {
        documents.push('petition_sealing')
        documents.push('motion_sealing')
      }

      if (eligibilityResult.actualInnocenceEligible) {
        documents.push('petition_actual_innocence')
        documents.push('affidavit_actual_innocence')
        documents.push('memorandum_actual_innocence')
      }

      // Always include supporting documents
      documents.push('certificate_of_service')
      documents.push('proposed_order')

      setAvailableDocuments(documents)
      
      // Auto-select primary documents
      const autoSelected = documents.filter(doc => 
        doc.includes('petition_') || doc.includes('motion_')
      )
      setSelectedDocuments(autoSelected)

    } catch (err) {
      console.error('Failed to load available documents:', err)
      setError('Failed to determine available documents')
    }
  }

  const handleDocumentSelection = (documentType: string, selected: boolean) => {
    if (selected) {
      setSelectedDocuments(prev => [...prev, documentType])
    } else {
      setSelectedDocuments(prev => prev.filter(doc => doc !== documentType))
    }
  }

  const generateDocuments = async () => {
    if (selectedDocuments.length === 0) {
      setError('Please select at least one document to generate')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setGenerationProgress({
        current: 0,
        total: selectedDocuments.length,
        currentDocument: ''
      })

      const documents: GeneratedDocument[] = []

      for (let i = 0; i < selectedDocuments.length; i++) {
        const documentType = selectedDocuments[i]
        
        setGenerationProgress({
          current: i + 1,
          total: selectedDocuments.length,
          currentDocument: documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        })

        // Generate document based on jurisdiction
        let result: DocumentGenerationResult

        if (userCase.jurisdiction === 'dc') {
          // Use the DC document generator for all DC documents
          result = await dcDocumentGenerator.generateSingleDocument(
            documentType as any,
            userCase,
            additionalFactors,
            {
              includeInstructions: true,
              requireAttorneyReview: shouldRequireAttorneyReview(documentType)
            }
          )
        } else {
          result = await documentTemplateEngine.generateDocument({
            templateId: `${userCase.jurisdiction}_${documentType}`,
            userCase,
            additionalFactors,
            options: {
              includeInstructions: true,
              generatePdf: false,
              requireAttorneyReview: shouldRequireAttorneyReview(documentType)
            }
          })
        }

        if (result.success && result.document) {
          documents.push(result.document)
          
          // Store document automatically
          await documentStorageService.storeDocument(result.document, {
            encrypt: true,
            accessLevel: 'private',
            retentionDays: 2555 // 7 years
          })

          if (onDocumentGenerated) {
            onDocumentGenerated(result.document)
          }
        } else {
          console.error(`Failed to generate ${documentType}:`, result.errors)
        }
      }

      setGeneratedDocuments(documents)
      setGenerationProgress(null)

    } catch (err) {
      console.error('Document generation failed:', err)
      setError(err instanceof Error ? err.message : 'Document generation failed')
      setGenerationProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const shouldRequireAttorneyReview = (documentType: string): boolean => {
    // Require attorney review for complex documents
    return [
      'petition_actual_innocence',
      'memorandum_actual_innocence',
      'motion_sealing'
    ].includes(documentType)
  }

  const getCourtName = (jurisdiction: string): string => {
    switch (jurisdiction) {
      case 'dc':
        return 'Superior Court of the District of Columbia'
      default:
        return 'Superior Court'
    }
  }

  const getDocumentDisplayName = (documentType: string): string => {
    const names: Record<string, string> = {
      'petition_expungement': 'Petition for Expungement',
      'petition_sealing': 'Petition for Sealing',
      'petition_actual_innocence': 'Petition for Actual Innocence',
      'motion_sealing': 'Motion for Sealing',
      'affidavit_expungement': 'Supporting Affidavit for Expungement',
      'affidavit_actual_innocence': 'Affidavit of Actual Innocence',
      'memorandum_actual_innocence': 'Memorandum in Support of Actual Innocence',
      'certificate_of_service': 'Certificate of Service',
      'proposed_order': 'Proposed Order'
    }
    return names[documentType] || documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getDocumentDescription = (documentType: string): string => {
    const descriptions: Record<string, string> = {
      'petition_expungement': 'Main petition requesting expungement of criminal records',
      'petition_sealing': 'Main petition requesting sealing of criminal records',
      'petition_actual_innocence': 'Petition claiming actual innocence of charges',
      'motion_sealing': 'Motion requesting court to seal records',
      'affidavit_expungement': 'Supporting sworn statement for expungement petition',
      'affidavit_actual_innocence': 'Sworn statement declaring actual innocence',
      'memorandum_actual_innocence': 'Legal memorandum supporting actual innocence claim',
      'certificate_of_service': 'Document proving proper service to all parties',
      'proposed_order': 'Draft order for the court to sign if petition is granted'
    }
    return descriptions[documentType] || 'Legal document'
  }

  const handleDownloadPdf = async (document: GeneratedDocument) => {
    try {
      const result = await pdfGenerationService.generatePDF(document, {
        format: 'legal',
        headerFooter: true,
        pageNumbers: true
      })

      if (result.success && result.pdfBuffer) {
        const blob = new Blob([result.pdfBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = window.document.createElement('a')
        link.href = url
        link.download = result.filename || `${document.title}.pdf`
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('PDF download failed:', err)
      setError('Failed to download PDF')
    }
  }

  const handleViewDocument = (documentId: string) => {
    setViewingDocument(documentId)
  }

  const handleCloseViewer = () => {
    setViewingDocument(null)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Legal Documents</h2>
        <p className="text-gray-600">
          Based on your eligibility results, select the documents you need to generate.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {generationProgress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-800 font-medium">Generating Documents...</span>
            <span className="text-blue-600 text-sm">
              {generationProgress.current} of {generationProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-blue-700 text-sm">
            Currently generating: {generationProgress.currentDocument}
          </p>
        </div>
      )}

      {/* Document Selection */}
      {availableDocuments.length > 0 && generatedDocuments.length === 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Documents</h3>
          <div className="space-y-3">
            {availableDocuments.map(documentType => (
              <div key={documentType} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md">
                <input
                  type="checkbox"
                  id={documentType}
                  checked={selectedDocuments.includes(documentType)}
                  onChange={(e) => handleDocumentSelection(documentType, e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor={documentType} className="block text-sm font-medium text-gray-900 cursor-pointer">
                    {getDocumentDisplayName(documentType)}
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {getDocumentDescription(documentType)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={generateDocuments}
              disabled={loading || selectedDocuments.length === 0}
              className="px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : `Generate ${selectedDocuments.length} Document${selectedDocuments.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Generated Documents */}
      {generatedDocuments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Documents</h3>
          <div className="space-y-4">
            {generatedDocuments.map(document => (
              <div key={document.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{document.title}</h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{document.documentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span>•</span>
                      <span>Generated {new Date(document.createdAt).toLocaleDateString()}</span>
                      {document.metadata.attorneyReviewRequired && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-medium">Attorney Review Required</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewDocument(document.id)}
                      className="px-3 py-2 text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(document)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-green-800 font-medium">Documents Generated Successfully</p>
                <p className="text-green-700 text-sm mt-1">
                  Your documents have been generated and saved securely. You can view, download, or print them at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument}
          onClose={handleCloseViewer}
          onDownload={(doc) => {
            // Convert StoredDocument back to GeneratedDocument for PDF generation
            const generatedDoc = generatedDocuments.find(d => d.id === doc.originalId)
            if (generatedDoc) {
              handleDownloadPdf(generatedDoc)
            }
          }}
        />
      )}
    </div>
  )
}
