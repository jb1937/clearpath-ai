// Document generation types for ClearPathAI
import type { UserCase, AdditionalFactors } from './index'

export interface DocumentTemplate {
  id: string
  name: string
  type: DocumentType
  jurisdiction: string
  requiredFields: DocumentField[]
  conditionalFields?: ConditionalField[]
  template: string
  version: string
  lastUpdated: Date
}

export type DocumentType = 
  | 'petition_expungement'
  | 'petition_sealing'
  | 'petition_actual_innocence'
  | 'motion_sealing'
  | 'supporting_affidavit'
  | 'affidavit_expungement'
  | 'affidavit_actual_innocence'
  | 'certificate_service'
  | 'certificate_of_service'
  | 'certificate_completion'
  | 'probation_completion_certificate'
  | 'trafficking_victim_affidavit'
  | 'proposed_order'
  | 'memorandum_actual_innocence'
  | 'order_expungement'
  | 'order_sealing'
  | 'background_check_removal'
  | 'filing_instructions'

export interface DocumentField {
  id: string
  name: string
  type: 'text' | 'date' | 'number' | 'boolean' | 'select' | 'textarea'
  required: boolean
  validation?: ValidationRule[]
  placeholder?: string
  options?: string[] // for select fields
  maxLength?: number
  description?: string
}

export interface ConditionalField extends DocumentField {
  condition: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: any
  }
}

export interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'date_range' | 'custom'
  value?: any
  message: string
}

export interface DocumentData {
  templateId: string
  userCase: UserCase
  additionalFactors: AdditionalFactors
  customFields: Record<string, any>
  generatedAt: Date
  version: string
}

export interface GeneratedDocument {
  id: string
  templateId: string
  documentType: DocumentType
  title: string
  content: string
  htmlContent: string
  pdfBlob?: Blob
  metadata: DocumentMetadata
  status: DocumentStatus
  createdAt: Date
  updatedAt: Date
}

export interface DocumentMetadata {
  jurisdiction: string
  caseId: string
  userId?: string
  attorneyReviewRequired: boolean
  attorneyReviewed: boolean
  reviewedBy?: string
  reviewedAt?: Date
  filingDeadline?: Date
  courtName?: string
  judgeAssigned?: string
  customData: Record<string, any>
}

export type DocumentStatus = 
  | 'draft'
  | 'generated'
  | 'review_required'
  | 'attorney_approved'
  | 'ready_to_file'
  | 'filed'
  | 'rejected'

export interface DocumentPackage {
  id: string
  name: string
  description: string
  documents: GeneratedDocument[]
  filingInstructions: string
  requiredDocuments: string[]
  optionalDocuments: string[]
  estimatedFilingTime: string
  courtFees: number
  status: DocumentStatus
  createdAt: Date
}

export interface DocumentGenerationRequest {
  templateId: string
  userCase: UserCase
  additionalFactors: AdditionalFactors
  customFields?: Record<string, any>
  options?: DocumentGenerationOptions
}

export interface DocumentGenerationOptions {
  includeInstructions: boolean
  generatePdf: boolean
  requireAttorneyReview: boolean
  customizations?: Record<string, any>
}

export interface DocumentGenerationResult {
  success: boolean
  document?: GeneratedDocument
  errors?: DocumentError[]
  warnings?: string[]
}

export interface DocumentError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning' | 'info'
}

// Template engine interfaces
export interface TemplateEngine {
  generateDocument(request: DocumentGenerationRequest): Promise<DocumentGenerationResult>
  validateTemplate(template: DocumentTemplate): ValidationResult
  previewDocument(request: DocumentGenerationRequest): Promise<string>
  getRequiredFields(templateId: string): DocumentField[]
}

export interface ValidationResult {
  isValid: boolean
  errors: DocumentError[]
  warnings: string[]
}

// Security and audit interfaces
export interface DocumentAuditLog {
  id: string
  documentId: string
  action: 'created' | 'modified' | 'viewed' | 'downloaded' | 'deleted' | 'attorney_reviewed' | 'stored' | 'accessed' | 'archived'
  userId?: string
  timestamp: Date
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export interface DocumentSecuritySettings {
  encryptionEnabled: boolean
  accessLogging: boolean
  retentionPeriodDays: number
  allowDownload: boolean
  watermarkEnabled: boolean
  passwordProtected: boolean
}
