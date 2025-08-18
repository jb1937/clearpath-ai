import type { UserCase, AdditionalFactors, Sentence } from '../types'
import type { GeneratedDocument, DocumentTemplate } from '../types/documents'

/**
 * Test data factory with correct type definitions
 * This ensures all test data matches the current type interfaces
 */

export const createMockSentence = (overrides: Partial<Sentence> = {}): Sentence => ({
  jailTime: 0,
  probation: 12,
  fines: 500,
  communityService: 40,
  allCompleted: true,
  completionDate: new Date('2015-01-15'), // Match the case completion date
  ...overrides
})

export const createMockUserCase = (overrides: Partial<UserCase> = {}): UserCase => ({
  id: 'test-case-123',
  offense: 'Simple Assault',
  offenseDate: new Date('2014-01-15'), // 10+ years ago to definitely meet DC waiting period
  outcome: 'convicted',
  ageAtOffense: 25,
  isTraffickingRelated: false,
  jurisdiction: 'dc',
  sentence: createMockSentence(),
  completionDate: new Date('2015-01-15'), // Completed sentence
  court: 'DC Superior Court',
  ...overrides
})

export const createMockAdditionalFactors = (overrides: Partial<AdditionalFactors> = {}): AdditionalFactors => ({
  hasOpenCases: false,
  isTraffickingVictim: false,
  seekingActualInnocence: false,
  additionalInfo: 'Test case for validation',
  ...overrides
})

export const createMockPersonalInfo = (overrides: any = {}) => ({
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: new Date('1990-01-01'),
  phone: '(555) 123-4567',
  email: 'john.doe@example.com',
  address: {
    street: '123 Main St',
    city: 'Washington',
    state: 'DC',
    zipCode: '20001'
  },
  ...overrides
})

export const createMockDocumentTemplate = (overrides: Partial<DocumentTemplate> = {}): DocumentTemplate => ({
  id: 'dc_petition_expungement',
  name: 'DC Petition for Expungement',
  type: 'petition_expungement',
  jurisdiction: 'dc',
  requiredFields: [
    {
      id: 'petitioner_name',
      name: 'Petitioner Name',
      type: 'text',
      required: true
    }
  ],
  template: `
    <h1>PETITION FOR EXPUNGEMENT</h1>
    <p>Petitioner: {{petitioner_name}}</p>
    <p>Offense: {{offense}}</p>
    <p>Date: {{offense_date}}</p>
  `,
  version: '1.0',
  lastUpdated: new Date(),
  ...overrides
})

export const createMockGeneratedDocument = (overrides: Partial<GeneratedDocument> = {}): GeneratedDocument => ({
  id: 'doc-123',
  templateId: 'dc_petition_expungement',
  title: 'Petition for Expungement - John Doe',
  documentType: 'petition_expungement',
  content: 'Mock document content',
  htmlContent: '<h1>PETITION FOR EXPUNGEMENT</h1><p>Mock content</p>',
  status: 'generated',
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {
    jurisdiction: 'dc',
    caseId: 'test-case-123',
    attorneyReviewRequired: false,
    attorneyReviewed: false,
    customData: {
      templateVersion: '1.0',
      generatedBy: 'test-user'
    },
    ...overrides.metadata
  },
  ...overrides
})

export const createMockValidationResult = (overrides: any = {}) => ({
  isValid: true,
  errors: [],
  warnings: [],
  suggestions: [],
  ...overrides
})

// Create a guaranteed valid case for concurrent testing
export const createValidConcurrentTestCase = (id: string): UserCase => ({
  id: `concurrent-case-${id}`,
  offense: 'Simple Assault',
  offenseDate: new Date('2014-01-15'), // 10+ years ago
  outcome: 'convicted',
  ageAtOffense: 25,
  isTraffickingRelated: false,
  jurisdiction: 'dc',
  sentence: {
    jailTime: 0,
    probation: 12,
    fines: 500,
    communityService: 40,
    allCompleted: true,
    completionDate: new Date('2015-01-15')
  },
  completionDate: new Date('2015-01-15'),
  court: 'DC Superior Court'
})

// Mock service responses
export const mockServiceResponses = {
  documentGeneration: {
    success: {
      success: true,
      document: createMockGeneratedDocument(),
      errors: []
    },
    failure: {
      success: false,
      document: undefined,
      errors: [
        {
          field: 'template',
          message: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND',
          severity: 'error' as const
        }
      ]
    }
  },
  
  validation: {
    valid: createMockValidationResult(),
    invalid: createMockValidationResult({
      isValid: false,
      errors: [
        {
          field: 'offense',
          message: 'Offense is required',
          code: 'REQUIRED_FIELD',
          severity: 'error' as const
        }
      ]
    })
  },
  
  pdfGeneration: {
    success: {
      success: true,
      pdfBuffer: new ArrayBuffer(1024),
      filename: 'petition_expungement.pdf'
    },
    failure: {
      success: false,
      pdfBuffer: null,
      filename: null,
      error: 'PDF generation failed'
    }
  }
}

// Test case variations
export const testCases = {
  // Valid cases
  validConvicted: createMockUserCase({
    outcome: 'convicted',
    offenseDate: new Date('2019-01-15'), // Old enough to meet waiting period
    sentence: createMockSentence({ allCompleted: true })
  }),
  
  validDismissed: createMockUserCase({
    outcome: 'dismissed',
    offenseDate: new Date('2023-01-15'), // Recent but dismissed
    sentence: undefined
  }),
  
  validAcquitted: createMockUserCase({
    outcome: 'acquitted',
    offenseDate: new Date('2023-06-15'),
    sentence: undefined
  }),
  
  // Invalid cases
  tooRecent: createMockUserCase({
    outcome: 'convicted',
    offenseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    sentence: createMockSentence({ allCompleted: false })
  }),
  
  excludedOffense: createMockUserCase({
    offense: 'Murder in the First Degree'
  }),
  
  incompleteCase: createMockUserCase({
    id: '',
    offense: ''
  }),
  
  // Edge cases
  juvenile: createMockUserCase({
    ageAtOffense: 16,
    offenseDate: new Date('2020-01-15')
  }),
  
  trafficking: createMockUserCase({
    isTraffickingRelated: true
  })
}

// Additional factors variations
export const additionalFactorsVariations = {
  clean: createMockAdditionalFactors(),
  
  withOpenCases: createMockAdditionalFactors({
    hasOpenCases: true
  }),
  
  traffickingVictim: createMockAdditionalFactors({
    isTraffickingVictim: true
  }),
  
  actualInnocence: createMockAdditionalFactors({
    seekingActualInnocence: true
  }),
  
  longInfo: createMockAdditionalFactors({
    additionalInfo: 'x'.repeat(2001) // Exceeds limit
  })
}
