import { z } from 'zod'
import type { UserCase, AdditionalFactors } from '../types'

/**
 * Legal Data Validation System
 * Ensures all user information meets legal requirements before generating documents
 * Prevents the 40-60% error rates identified in manual preparation
 */

// Validation schemas for different data types
const phoneSchema = z.string()
  .regex(/^[\+]?[1]?[\s\-\.]?[\(]?[0-9]{3}[\)]?[\s\-\.]?[0-9]{3}[\s\-\.]?[0-9]{4}$/, 'Invalid phone number format')
  .transform(phone => phone.replace(/\D/g, '')) // Remove non-digits
  .refine(phone => phone !== '0000000000', 'Invalid phone pattern') // Reject obvious invalid patterns

const ssnSchema = z.string()
  .regex(/^\d{3}-?\d{2}-?\d{4}$/, 'Invalid SSN format')
  .transform(ssn => ssn.replace(/-/g, '')) // Remove dashes
  .refine(ssn => ssn !== '000000000', 'Invalid SSN') // Only reject 000-00-0000

const zipCodeSchema = z.string()
  .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format')

const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long')

// Date validation helpers
const dateSchema = z.date()
  .refine(date => date <= new Date(), 'Date cannot be in the future')
  .refine(date => date >= new Date('1900-01-01'), 'Date too far in the past')

const ageSchema = z.number()
  .int('Age must be a whole number')
  .min(0, 'Age cannot be negative')
  .max(150, 'Age too high')

// Legal-specific validations
const offenseSchema = z.string()
  .min(3, 'Offense description too short')
  .max(500, 'Offense description too long')
  .refine(offense => !offense.includes('<'), 'Invalid characters in offense')
  .refine(offense => !offense.includes('>'), 'Invalid characters in offense')

const jurisdictionSchema = z.enum(['dc', 'maryland', 'virginia'], {
  message: 'Unsupported jurisdiction'
})

const outcomeSchema = z.enum(['convicted', 'dismissed', 'acquitted', 'no_papered', 'nolle_prosequi'], {
  message: 'Invalid case outcome'
})

// Comprehensive validation schemas
export const userCaseValidationSchema = z.object({
  id: z.string().min(1, 'Case ID required'),
  offense: offenseSchema,
  offenseDate: dateSchema,
  statuteNumber: z.string().optional(),
  outcome: outcomeSchema,
  sentence: z.object({
    jailTime: z.number().min(0).optional(),
    probation: z.number().min(0).optional(),
    fines: z.number().min(0).optional(),
    communityService: z.number().min(0).optional(),
    allCompleted: z.boolean(),
    completionDate: dateSchema.optional()
  }).optional(),
  completionDate: dateSchema.optional(),
  ageAtOffense: ageSchema,
  isTraffickingRelated: z.boolean(),
  jurisdiction: jurisdictionSchema,
  court: z.string().optional()
})

export const additionalFactorsValidationSchema = z.object({
  hasOpenCases: z.boolean(),
  isTraffickingVictim: z.boolean(),
  seekingActualInnocence: z.boolean(),
  additionalInfo: z.string().max(2000, 'Additional information too long').optional()
})

export const personalInfoValidationSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name required').max(50, 'Last name too long'),
  middleName: z.string().max(50, 'Middle name too long').optional(),
  dateOfBirth: dateSchema,
  ssn: ssnSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  address: z.object({
    street: z.string().min(1, 'Street address required').max(100, 'Street address too long'),
    city: z.string().min(1, 'City required').max(50, 'City too long'),
    state: z.string().length(2, 'State must be 2 characters'),
    zipCode: zipCodeSchema
  }).optional()
})

// Jurisdiction-specific validation rules
const dcSpecificValidation = {
  minimumWaitingPeriod: (offenseDate: Date, outcome: string): boolean => {
    const monthsSince = (Date.now() - offenseDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    
    switch (outcome) {
      case 'dismissed':
      case 'acquitted':
      case 'no_papered':
      case 'nolle_prosequi':
        return monthsSince >= 2 // 2 months for non-convictions
      case 'convicted':
        return monthsSince >= 96 // 8 years for convictions
      default:
        return false
    }
  },
  
  excludedOffenses: [
    'murder',
    'manslaughter',
    'sexual abuse',
    'child abuse',
    'kidnapping',
    'arson',
    'burglary in the first degree',
    'robbery',
    'carjacking'
  ],
  
  isOffenseExcluded: (offense: string): boolean => {
    const lowerOffense = offense.toLowerCase()
    return dcSpecificValidation.excludedOffenses.some(excluded => 
      lowerOffense.includes(excluded)
    )
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  suggestions: string[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning'
}

export class LegalDataValidator {
  private static instance: LegalDataValidator

  static getInstance(): LegalDataValidator {
    if (!LegalDataValidator.instance) {
      LegalDataValidator.instance = new LegalDataValidator()
    }
    return LegalDataValidator.instance
  }

  /**
   * Validate user case data with jurisdiction-specific rules
   */
  validateUserCase(userCase: UserCase): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Handle null/undefined input
    if (!userCase) {
      return {
        isValid: false,
        errors: [{
          field: 'userCase',
          message: 'User case data is required',
          code: 'REQUIRED_FIELD',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      }
    }

    try {
      // Basic schema validation
      userCaseValidationSchema.parse(userCase)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err: any) => {
          errors.push({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR',
            severity: 'error'
          })
        })
      }
    }

    // Jurisdiction-specific validation
    if (userCase.jurisdiction === 'dc') {
      this.validateDCSpecificRules(userCase, errors, warnings, suggestions)
    }

    // Cross-field validation
    this.validateCrossFieldRules(userCase, errors, warnings, suggestions)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Validate additional factors
   */
  validateAdditionalFactors(factors: AdditionalFactors): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      additionalFactorsValidationSchema.parse(factors)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err: any) => {
          errors.push({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR',
            severity: 'error'
          })
        })
      }
    }

    // Additional logic validation
    if (factors.hasOpenCases && factors.seekingActualInnocence) {
      warnings.push('Having open cases may complicate actual innocence claims')
    }

    if (factors.isTraffickingVictim) {
      suggestions.push('Consider specialized trafficking victim relief programs')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Validate personal information
   */
  validatePersonalInfo(personalInfo: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      personalInfoValidationSchema.parse(personalInfo)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err: any) => {
          errors.push({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR',
            severity: 'error'
          })
        })
      }
    }

    // Age validation
    if (personalInfo.dateOfBirth) {
      const age = this.calculateAge(personalInfo.dateOfBirth)
      if (age < 18) {
        warnings.push('Juvenile cases may have special procedures')
      }
      if (age > 100) {
        warnings.push('Please verify date of birth')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Comprehensive validation of all data
   */
  validateComplete(data: {
    userCase: UserCase
    additionalFactors: AdditionalFactors
    personalInfo?: any
  }): ValidationResult {
    const caseValidation = this.validateUserCase(data.userCase)
    const factorsValidation = this.validateAdditionalFactors(data.additionalFactors)
    const personalValidation = data.personalInfo ? 
      this.validatePersonalInfo(data.personalInfo) : 
      { isValid: true, errors: [], warnings: [], suggestions: [] }

    const allErrors = [
      ...caseValidation.errors,
      ...factorsValidation.errors,
      ...personalValidation.errors
    ]

    const allWarnings = [
      ...caseValidation.warnings,
      ...factorsValidation.warnings,
      ...personalValidation.warnings
    ]

    const allSuggestions = [
      ...caseValidation.suggestions,
      ...factorsValidation.suggestions,
      ...personalValidation.suggestions
    ]

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions
    }
  }

  /**
   * DC-specific validation rules
   */
  private validateDCSpecificRules(
    userCase: UserCase, 
    errors: ValidationError[], 
    warnings: string[], 
    suggestions: string[]
  ): void {
    // Check waiting period
    if (!dcSpecificValidation.minimumWaitingPeriod(userCase.offenseDate, userCase.outcome)) {
      const requiredMonths = userCase.outcome === 'convicted' ? 96 : 2
      errors.push({
        field: 'offenseDate',
        message: `Minimum waiting period of ${requiredMonths} months not met`,
        code: 'WAITING_PERIOD_NOT_MET',
        severity: 'error'
      })
    }

    // Check excluded offenses
    if (dcSpecificValidation.isOffenseExcluded(userCase.offense)) {
      errors.push({
        field: 'offense',
        message: 'This offense type is not eligible for expungement in DC',
        code: 'EXCLUDED_OFFENSE',
        severity: 'error'
      })
    }

    // Trafficking-related cases
    if (userCase.isTraffickingRelated) {
      suggestions.push('Trafficking-related cases may qualify for expedited processing')
    }

    // Conviction-specific warnings
    if (userCase.outcome === 'convicted') {
      warnings.push('Convicted cases require more extensive documentation')
      
      if (userCase.sentence && !userCase.sentence.allCompleted) {
        errors.push({
          field: 'sentence.allCompleted',
          message: 'All sentence requirements must be completed before expungement',
          code: 'SENTENCE_INCOMPLETE',
          severity: 'error'
        })
      }
    }
  }

  /**
   * Cross-field validation rules
   */
  private validateCrossFieldRules(
    userCase: UserCase, 
    errors: ValidationError[], 
    warnings: string[], 
    _suggestions: string[]
  ): void {
    // Age consistency check
    const ageAtOffense = this.calculateAge(userCase.offenseDate)
    if (Math.abs(ageAtOffense - userCase.ageAtOffense) > 1) {
      warnings.push('Age at offense may be inconsistent with offense date')
    }

    // Sentence completion date validation
    if (userCase.sentence?.completionDate && userCase.completionDate) {
      if (userCase.sentence.completionDate > userCase.completionDate) {
        errors.push({
          field: 'sentence.completionDate',
          message: 'Sentence completion date cannot be after case completion date',
          code: 'DATE_INCONSISTENCY',
          severity: 'error'
        })
      }
    }

    // Outcome-specific validation
    if (['dismissed', 'acquitted', 'no_papered', 'nolle_prosequi'].includes(userCase.outcome)) {
      if (userCase.sentence) {
        warnings.push('Sentence information unusual for non-conviction outcome')
      }
    }
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    if (!dateOfBirth || !(dateOfBirth instanceof Date) || isNaN(dateOfBirth.getTime())) {
      return 0 // Return 0 for invalid dates
    }
    
    const today = new Date()
    let age = today.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = today.getMonth() - dateOfBirth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--
    }
    
    return age
  }

  /**
   * Get validation schema for a specific field
   */
  getFieldSchema(fieldPath: string): z.ZodSchema | null {
    const schemas: Record<string, z.ZodSchema> = {
      'userCase': userCaseValidationSchema,
      'additionalFactors': additionalFactorsValidationSchema,
      'personalInfo': personalInfoValidationSchema,
      'phone': phoneSchema,
      'ssn': ssnSchema,
      'email': emailSchema,
      'zipCode': zipCodeSchema
    }

    return schemas[fieldPath] || null
  }

  /**
   * Validate single field
   */
  validateField(fieldPath: string, value: any): ValidationResult {
    const schema = this.getFieldSchema(fieldPath)
    if (!schema) {
      return {
        isValid: false,
        errors: [{
          field: fieldPath,
          message: 'Unknown field',
          code: 'UNKNOWN_FIELD',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      }
    }

    try {
      schema.parse(value)
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.issues.map((err: any) => ({
            field: fieldPath,
            message: err.message,
            code: 'VALIDATION_ERROR',
            severity: 'error' as const
          })),
          warnings: [],
          suggestions: []
        }
      }

      return {
        isValid: false,
        errors: [{
          field: fieldPath,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      }
    }
  }
}

// Export singleton instance
export const legalDataValidator = LegalDataValidator.getInstance()
