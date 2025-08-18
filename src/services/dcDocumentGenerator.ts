import { documentTemplateEngine } from './documentTemplateEngine'
import { legalDataValidator } from './legalDataValidator'
import { dataSecurityService } from './dataSecurity'
import type { 
  DocumentGenerationRequest, 
  DocumentGenerationResult, 
  DocumentTemplate,
  DocumentType 
} from '../types/documents'
import type { UserCase, AdditionalFactors } from '../types'

/**
 * DC-Specific Document Generator
 * Creates actual legal documents for Washington DC cases
 * Implements DC-specific legal requirements and formatting
 */

export interface DCDocumentPackage {
  id: string
  caseId: string
  packageType: 'expungement' | 'sealing' | 'actual_innocence'
  documents: DCGeneratedDocument[]
  filingInstructions: string[]
  requiredFees: DCFilingFee[]
  estimatedProcessingTime: string
  createdAt: Date
}

export interface DCGeneratedDocument {
  id: string
  templateId: string
  documentType: DocumentType
  title: string
  content: string
  htmlContent: string
  pdfBuffer?: Buffer
  status: 'draft' | 'ready_for_review' | 'attorney_approved' | 'ready_to_file' | 'review_required' | 'generated' | 'filed' | 'rejected'
  metadata: {
    jurisdiction: 'dc'
    caseId: string
    courtName: string
    filingFee?: number
    requiredCopies: number
    specialInstructions?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface DCFilingFee {
  documentType: DocumentType
  amount: number
  description: string
  payableTo: string
  waiverAvailable: boolean
}

export class DCDocumentGenerator {
  private static instance: DCDocumentGenerator
  private dcTemplates: Map<string, DocumentTemplate> = new Map()

  static getInstance(): DCDocumentGenerator {
    if (!DCDocumentGenerator.instance) {
      DCDocumentGenerator.instance = new DCDocumentGenerator()
    }
    return DCDocumentGenerator.instance
  }

  constructor() {
    this.initializeDCTemplates()
  }

  /**
   * Generate complete document package for DC expungement case
   */
  async generateExpungementPackage(
    userCase: UserCase,
    additionalFactors: AdditionalFactors,
    personalInfo: any
  ): Promise<DocumentGenerationResult & { package?: DCDocumentPackage }> {
    try {
      // Validate all data first
      const validation = legalDataValidator.validateComplete({
        userCase,
        additionalFactors,
        personalInfo
      })

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        }
      }

      // Determine required documents based on case characteristics
      const requiredDocuments = this.determineRequiredDocuments(userCase, additionalFactors)
      
      // Generate each document
      const documents: DCGeneratedDocument[] = []
      const errors: any[] = []
      const warnings: string[] = []

      for (const docType of requiredDocuments) {
        const docResult = await this.generateSingleDocument(
          docType,
          userCase,
          additionalFactors,
          personalInfo
        )

        if (docResult.success && docResult.document) {
          documents.push(docResult.document as DCGeneratedDocument)
        } else {
          errors.push(...(docResult.errors || []))
        }

        if (docResult.warnings) {
          warnings.push(...docResult.warnings)
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors,
          warnings
        }
      }

      // Create document package
      const packageData: DCDocumentPackage = {
        id: dataSecurityService.generateSecureId(),
        caseId: userCase.id,
        packageType: additionalFactors.seekingActualInnocence ? 'actual_innocence' : 'expungement',
        documents,
        filingInstructions: this.generateFilingInstructions(userCase, documents),
        requiredFees: this.calculateFilingFees(documents),
        estimatedProcessingTime: this.estimateProcessingTime(userCase, additionalFactors),
        createdAt: new Date()
      }

      return {
        success: true,
        package: packageData,
        warnings
      }

    } catch (error) {
      console.error('DC document package generation failed:', error)
      return {
        success: false,
        errors: [{
          field: 'general',
          message: 'Document package generation failed',
          code: 'PACKAGE_GENERATION_ERROR',
          severity: 'error'
        }]
      }
    }
  }

  /**
   * Generate single DC document
   */
  async generateSingleDocument(
    documentType: DocumentType,
    userCase: UserCase,
    additionalFactors: AdditionalFactors,
    personalInfo: any
  ): Promise<DocumentGenerationResult & { document?: DCGeneratedDocument }> {
    const templateId = this.getTemplateIdForDocumentType(documentType)
    const template = this.dcTemplates.get(templateId)

    if (!template) {
      return {
        success: false,
        errors: [{
          field: 'documentType',
          message: `Template not found for document type: ${documentType}`,
          code: 'TEMPLATE_NOT_FOUND',
          severity: 'error'
        }]
      }
    }

    // Generate document using template engine
    const request: DocumentGenerationRequest = {
      templateId,
      userCase,
      additionalFactors,
      customFields: {
        ...personalInfo,
        courtName: this.getDCCourtName(userCase),
        filingDate: new Date().toLocaleDateString(),
        attorneyName: personalInfo.attorneyName || '[ATTORNEY NAME]',
        attorneyBarNumber: personalInfo.attorneyBarNumber || '[BAR NUMBER]'
      }
    }

    const result = await documentTemplateEngine.generateDocument(request)

    if (!result.success || !result.document) {
      return result as DocumentGenerationResult & { document?: DCGeneratedDocument }
    }

    // Convert to DC-specific document format
    const dcDocument: DCGeneratedDocument = {
      id: result.document.id,
      templateId: result.document.templateId,
      documentType: result.document.documentType,
      title: result.document.title,
      content: result.document.content,
      htmlContent: result.document.htmlContent,
      status: result.document.metadata.attorneyReviewRequired ? 'ready_for_review' : 'ready_to_file',
      metadata: {
        jurisdiction: 'dc',
        caseId: userCase.id,
        courtName: this.getDCCourtName(userCase),
        filingFee: this.getFilingFee(documentType),
        requiredCopies: this.getRequiredCopies(documentType),
        specialInstructions: this.getSpecialInstructions(documentType, userCase)
      },
      createdAt: result.document.createdAt,
      updatedAt: result.document.updatedAt
    }

    return {
      success: true,
      document: dcDocument as any,
      warnings: result.warnings
    }
  }

  /**
   * Determine required documents based on case characteristics
   */
  private determineRequiredDocuments(
    userCase: UserCase, 
    additionalFactors: AdditionalFactors
  ): DocumentType[] {
    const documents: DocumentType[] = []

    if (additionalFactors.seekingActualInnocence) {
      // Actual innocence petition
      documents.push('petition_actual_innocence')
      documents.push('affidavit_actual_innocence')
      documents.push('memorandum_actual_innocence')
    } else {
      // Standard expungement
      documents.push('petition_expungement')
      documents.push('affidavit_expungement')
    }

    // Common documents for all cases
    documents.push('certificate_of_service')
    documents.push('proposed_order')

    // Conviction-specific documents
    if (userCase.outcome === 'convicted') {
      documents.push('certificate_completion')
      if (userCase.sentence?.probation) {
        documents.push('probation_completion_certificate')
      }
    }

    // Trafficking victim documents
    if (additionalFactors.isTraffickingVictim) {
      documents.push('trafficking_victim_affidavit')
    }

    return documents
  }

  /**
   * Generate filing instructions for document package
   */
  private generateFilingInstructions(
    userCase: UserCase, 
    documents: DCGeneratedDocument[]
  ): string[] {
    const instructions: string[] = []
    const courtName = this.getDCCourtName(userCase)

    instructions.push(`File all documents with the ${courtName}`)
    instructions.push('Submit original plus required copies as specified for each document')
    
    // Fee instructions
    const totalFees = documents.reduce((sum, doc) => sum + (doc.metadata.filingFee || 0), 0)
    if (totalFees > 0) {
      instructions.push(`Pay filing fees totaling $${totalFees} (money order or cashier's check)`)
      instructions.push('Fee waivers may be available for qualifying individuals')
    }

    // Service instructions
    if (documents.some(doc => doc.documentType === 'certificate_of_service')) {
      instructions.push('Serve copies on the U.S. Attorney\'s Office and Metropolitan Police Department')
      instructions.push('File proof of service with the court')
    }

    // Timeline instructions
    instructions.push('Allow 60-90 days for court processing')
    instructions.push('Check court records online or call for status updates')

    // Special instructions based on case type
    if (userCase.outcome === 'convicted') {
      instructions.push('Ensure all sentence requirements are completed before filing')
    }

    if (userCase.isTraffickingRelated) {
      instructions.push('Trafficking-related cases may qualify for expedited processing')
    }

    return instructions
  }

  /**
   * Calculate filing fees for documents
   */
  private calculateFilingFees(documents: DCGeneratedDocument[]): DCFilingFee[] {
    const feeMap = new Map<DocumentType, DCFilingFee>()

    // DC filing fees (as of 2024)
    const dcFees: Partial<Record<DocumentType, Partial<DCFilingFee>>> = {
      'petition_expungement': {
        amount: 50,
        description: 'Petition for Expungement filing fee',
        waiverAvailable: true
      },
      'petition_actual_innocence': {
        amount: 0,
        description: 'Actual innocence petition (no fee)',
        waiverAvailable: false
      },
      'petition_sealing': {
        amount: 50,
        description: 'Motion to Seal Records filing fee',
        waiverAvailable: true
      }
    }

    documents.forEach(doc => {
      const feeInfo = dcFees[doc.documentType]
      if (feeInfo && !feeMap.has(doc.documentType)) {
        feeMap.set(doc.documentType, {
          documentType: doc.documentType,
          amount: feeInfo.amount || 0,
          description: feeInfo.description || `${doc.documentType} filing fee`,
          payableTo: 'D.C. Superior Court',
          waiverAvailable: feeInfo.waiverAvailable || false
        })
      }
    })

    return Array.from(feeMap.values())
  }

  /**
   * Estimate processing time based on case complexity
   */
  private estimateProcessingTime(
    _userCase: UserCase, 
    additionalFactors: AdditionalFactors
  ): string {
    let baseTime = 60 // Base 60 days

    // Factors that increase processing time
    if (_userCase.outcome === 'convicted') {
      baseTime += 30 // Convicted cases take longer
    }

    if (additionalFactors.seekingActualInnocence) {
      baseTime += 60 // Actual innocence cases are more complex
    }

    if (additionalFactors.hasOpenCases) {
      baseTime += 30 // Open cases complicate processing
    }

    // Factors that decrease processing time
    if (additionalFactors.isTraffickingVictim) {
      baseTime -= 30 // Trafficking victims get expedited processing
    }

    const minTime = Math.max(baseTime - 15, 30)
    const maxTime = baseTime + 30

    return `${minTime}-${maxTime} days`
  }

  /**
   * Get appropriate DC court name based on case
   */
  private getDCCourtName(_userCase: UserCase): string {
    // Most criminal cases in DC go through Superior Court
    return 'Superior Court of the District of Columbia'
  }

  /**
   * Get template ID for document type
   */
  private getTemplateIdForDocumentType(documentType: DocumentType): string {
    const templateMap: Partial<Record<DocumentType, string>> = {
      'petition_expungement': 'dc_petition_expungement',
      'petition_sealing': 'dc_petition_sealing',
      'petition_actual_innocence': 'dc_petition_actual_innocence',
      'affidavit_expungement': 'dc_affidavit_expungement',
      'affidavit_actual_innocence': 'dc_affidavit_actual_innocence',
      'certificate_of_service': 'dc_certificate_of_service',
      'proposed_order': 'dc_proposed_order',
      'memorandum_actual_innocence': 'dc_memorandum_actual_innocence',
      'certificate_completion': 'dc_certificate_completion',
      'probation_completion_certificate': 'dc_probation_completion',
      'trafficking_victim_affidavit': 'dc_trafficking_victim_affidavit'
    }

    return templateMap[documentType] || documentType
  }

  /**
   * Get filing fee for document type
   */
  private getFilingFee(documentType: DocumentType): number {
    const fees: Partial<Record<DocumentType, number>> = {
      'petition_expungement': 50,
      'petition_sealing': 50,
      'petition_actual_innocence': 0,
      'affidavit_expungement': 0,
      'affidavit_actual_innocence': 0,
      'certificate_of_service': 0,
      'proposed_order': 0,
      'memorandum_actual_innocence': 0,
      'certificate_completion': 0,
      'probation_completion_certificate': 0,
      'trafficking_victim_affidavit': 0
    }

    return fees[documentType] || 0
  }

  /**
   * Get required number of copies for document type
   */
  private getRequiredCopies(documentType: DocumentType): number {
    // Most DC court documents require original + 2 copies
    const copyRequirements: Partial<Record<DocumentType, number>> = {
      'petition_expungement': 3,
      'petition_sealing': 3,
      'petition_actual_innocence': 3,
      'affidavit_expungement': 3,
      'affidavit_actual_innocence': 3,
      'certificate_of_service': 2,
      'proposed_order': 3,
      'memorandum_actual_innocence': 3,
      'certificate_completion': 2,
      'probation_completion_certificate': 2,
      'trafficking_victim_affidavit': 3
    }

    return copyRequirements[documentType] || 2
  }

  /**
   * Get special instructions for document type
   */
  private getSpecialInstructions(
    documentType: DocumentType, 
    _userCase: UserCase
  ): string[] {
    const instructions: string[] = []

    switch (documentType) {
      case 'petition_expungement':
        instructions.push('Must be notarized')
        instructions.push('Attach certified copies of court records')
        break

      case 'certificate_of_service':
        instructions.push('Must be filed within 3 days of service')
        instructions.push('Include proof of service method')
        break

      case 'petition_actual_innocence':
        instructions.push('Must include new evidence of innocence')
        instructions.push('Consider attorney representation for complex cases')
        break

      case 'trafficking_victim_affidavit':
        instructions.push('May require supporting documentation from service providers')
        break
    }

    return instructions
  }

  /**
   * Initialize DC-specific document templates
   */
  private initializeDCTemplates(): void {
    // DC Expungement Petition Template
    this.dcTemplates.set('dc_petition_expungement', {
      id: 'dc_petition_expungement',
      name: 'DC Petition for Expungement',
      type: 'petition_expungement',
      jurisdiction: 'dc',
      requiredFields: [
        { id: 'firstName', name: 'First Name', type: 'text', required: true },
        { id: 'lastName', name: 'Last Name', type: 'text', required: true },
        { id: 'dateOfBirth', name: 'Date of Birth', type: 'date', required: true },
        { id: 'address', name: 'Address', type: 'text', required: true }
      ],
      template: `
SUPERIOR COURT OF THE DISTRICT OF COLUMBIA
CRIMINAL DIVISION

{{firstName}} {{lastName}},                    Case No. {{userCase.id}}
                    Petitioner

PETITION FOR EXPUNGEMENT OF CRIMINAL RECORDS

TO THE HONORABLE COURT:

Petitioner {{firstName}} {{lastName}}, respectfully petitions this Court for an order expunging all records relating to the arrest and prosecution in the above-captioned case, and in support thereof states:

1. Petitioner's full name is {{firstName}} {{lastName}}.

2. Petitioner's date of birth is {{dateOfBirth}}.

3. Petitioner's current address is {{address}}.

4. On {{userCase.offenseDate}}, Petitioner was {{#if userCase.outcome == 'convicted'}}convicted of{{else}}charged with{{/if}} {{userCase.offense}}.

5. {{#if userCase.outcome == 'convicted'}}
   Petitioner was convicted and {{#if userCase.sentence.allCompleted}}has completed all requirements of the sentence{{else}}sentence requirements are pending completion{{/if}}.
   {{else}}
   The case was resolved with a disposition of {{userCase.outcome}}.
   {{/if}}

6. {{#if additionalFactors.isTraffickingVictim}}
   Petitioner was a victim of human trafficking at the time of the offense.
   {{/if}}

7. Petitioner meets all statutory requirements for expungement under D.C. Code § 16-803.

WHEREFORE, Petitioner respectfully requests that this Court enter an order:

a) Expunging all records of the above-captioned case;
b) Directing all agencies to remove or seal records related to this case;
c) Granting such other relief as the Court deems just and proper.

Respectfully submitted,

_________________________
{{firstName}} {{lastName}}
Petitioner

{{#if attorneyName}}
_________________________
{{attorneyName}}
D.C. Bar No. {{attorneyBarNumber}}
Attorney for Petitioner
{{/if}}

VERIFICATION

I, {{firstName}} {{lastName}}, hereby verify under penalty of perjury that the foregoing petition is true and correct to the best of my knowledge and belief.

_________________________
{{firstName}} {{lastName}}

Subscribed and sworn to before me this _____ day of _________, 2024.

_________________________
Notary Public
      `.trim(),
      version: '1.0.0',
      lastUpdated: new Date()
    })

    // DC Certificate of Service Template
    this.dcTemplates.set('dc_certificate_of_service', {
      id: 'dc_certificate_of_service',
      name: 'DC Certificate of Service',
      type: 'certificate_of_service',
      jurisdiction: 'dc',
      requiredFields: [
        { id: 'firstName', name: 'First Name', type: 'text', required: true },
        { id: 'lastName', name: 'Last Name', type: 'text', required: true }
      ],
      template: `
SUPERIOR COURT OF THE DISTRICT OF COLUMBIA
CRIMINAL DIVISION

{{firstName}} {{lastName}},                    Case No. {{userCase.id}}
                    Petitioner

CERTIFICATE OF SERVICE

I hereby certify that a true and correct copy of the foregoing Petition for Expungement was served upon the following parties by the method indicated:

[ ] Hand delivery
[ ] First-class mail, postage prepaid
[X] Electronic mail

United States Attorney's Office
District of Columbia
555 4th Street, N.W.
Washington, D.C. 20530

Metropolitan Police Department
Records Division
300 Indiana Avenue, N.W.
Washington, D.C. 20001

This _____ day of _________, 2024.

_________________________
{{firstName}} {{lastName}}
Petitioner
      `.trim(),
      version: '1.0.0',
      lastUpdated: new Date()
    })

    // Add the templates to the main template engine
    this.dcTemplates.forEach((template, id) => {
      (documentTemplateEngine as any).templates.set(id, template)
    })
  }
}

// Export singleton instance
export const dcDocumentGenerator = DCDocumentGenerator.getInstance()
