import { describe, it, expect, beforeEach } from 'vitest'
import { EligibilityEngine } from '../../services/eligibilityEngine'
import { testScenarios, additionalFactorsScenarios } from '../../test-utils/test-data'

describe('EligibilityEngine', () => {
  let engine: EligibilityEngine

  beforeEach(() => {
    engine = new EligibilityEngine()
  })

  describe('Automatic Expungement', () => {
    it('should identify marijuana possession before decriminalization as eligible', () => {
      const result = engine.assessEligibility(
        testScenarios.marijuanaBeforeDecriminalization,
        additionalFactorsScenarios.standard
      )

      expect(result.bestOption?.eligible).toBe(true)
      expect(result.bestOption?.reliefType).toBe('automatic_expungement')
      expect(result.bestOption?.reasons).toContain(
        'Simple marijuana possession before decriminalization date (February 15, 2015)'
      )
      expect(result.bestOption?.filingFee).toBe(0)
      expect(result.bestOption?.difficulty).toBe('low')
    })

    it('should not identify marijuana possession after decriminalization as eligible for automatic expungement', () => {
      const result = engine.assessEligibility(
        testScenarios.marijuanaAfterDecriminalization,
        additionalFactorsScenarios.standard
      )

      const autoExpungement = result.allOptions.find(o => o.reliefType === 'automatic_expungement')
      expect(autoExpungement?.eligible).toBe(false)
      expect(autoExpungement?.reasons).toContain('Does not qualify for automatic expungement')
    })
  })

  describe('Automatic Sealing', () => {
    it('should identify non-conviction cases as eligible for automatic sealing', () => {
      const result = engine.assessEligibility(
        testScenarios.nonConvictionCase,
        additionalFactorsScenarios.standard
      )

      const autoSealing = result.allOptions.find(o => o.reliefType === 'automatic_sealing')
      expect(autoSealing?.eligible).toBe(true)
      expect(autoSealing?.reasons).toContain('Non-conviction record qualifies for automatic sealing')
      expect(autoSealing?.timeline).toBe('Within 90 days of case termination')
    })

    it('should identify old misdemeanor convictions as eligible for automatic sealing', () => {
      const result = engine.assessEligibility(
        testScenarios.misdemeanorWithWaitingPeriod,
        additionalFactorsScenarios.standard
      )

      const autoSealing = result.allOptions.find(o => o.reliefType === 'automatic_sealing')
      expect(autoSealing?.eligible).toBe(true)
      expect(autoSealing?.reasons).toContain('Misdemeanor conviction with 10-year waiting period completed')
    })

    it('should not identify recent misdemeanor convictions as eligible for automatic sealing', () => {
      const result = engine.assessEligibility(
        testScenarios.recentMisdemeanor,
        additionalFactorsScenarios.standard
      )

      const autoSealing = result.allOptions.find(o => o.reliefType === 'automatic_sealing')
      expect(autoSealing?.eligible).toBe(false)
      expect(autoSealing?.reasons).toContain('10-year waiting period not yet completed')
      expect(autoSealing?.estimatedEligibilityDate).toBeDefined()
    })
  })

  describe('Motion-Based Relief', () => {
    it('should always offer motion for expungement (actual innocence)', () => {
      const result = engine.assessEligibility(
        testScenarios.adultOffender,
        additionalFactorsScenarios.standard
      )

      const motionExpungement = result.allOptions.find(o => o.reliefType === 'motion_expungement')
      expect(motionExpungement?.eligible).toBe(true)
      expect(motionExpungement?.reasons).toContain('Available if you can prove actual innocence')
      expect(motionExpungement?.filingFee).toBe(50)
      expect(motionExpungement?.attorneyRecommended).toBe(true)
    })

    it('should adjust success likelihood when seeking actual innocence', () => {
      const result = engine.assessEligibility(
        testScenarios.adultOffender,
        additionalFactorsScenarios.seekingInnocence
      )

      const motionExpungement = result.allOptions.find(o => o.reliefType === 'motion_expungement')
      expect(motionExpungement?.successLikelihood).toBe('medium')
      expect(motionExpungement?.reasons).toContain('You indicated belief in actual innocence - this may be a viable option')
    })

    it('should identify eligible motion sealing for old misdemeanors', () => {
      const result = engine.assessEligibility(
        testScenarios.misdemeanorWithWaitingPeriod,
        additionalFactorsScenarios.standard
      )

      const motionSealing = result.allOptions.find(o => o.reliefType === 'motion_sealing')
      expect(motionSealing?.eligible).toBe(true)
      expect(motionSealing?.reasons).toContain('Misdemeanor conviction with 5-year waiting period completed')
    })
  })

  describe('Special Programs', () => {
    it('should identify Youth Rehabilitation Act eligibility', () => {
      const result = engine.assessEligibility(
        testScenarios.youthOffender,
        additionalFactorsScenarios.standard
      )

      const youthProgram = result.allOptions.find(o => o.reliefType === 'youth_rehabilitation_act')
      expect(youthProgram?.eligible).toBe(true)
      expect(youthProgram?.reasons).toContain('You were 19 years old at time of offense, qualifying for YRA consideration')
      expect(youthProgram?.successLikelihood).toBe('high')
    })

    it('should not offer Youth Rehabilitation Act for older offenders', () => {
      const result = engine.assessEligibility(
        testScenarios.adultOffender,
        additionalFactorsScenarios.standard
      )

      const youthProgram = result.allOptions.find(o => o.reliefType === 'youth_rehabilitation_act')
      expect(youthProgram).toBeUndefined()
    })

    it('should identify trafficking survivors relief', () => {
      const result = engine.assessEligibility(
        testScenarios.traffickingVictim,
        additionalFactorsScenarios.traffickingVictim
      )

      const traffickingRelief = result.allOptions.find(o => o.reliefType === 'trafficking_survivors')
      expect(traffickingRelief?.eligible).toBe(true)
      expect(traffickingRelief?.reasons).toContain('You indicated being a victim of human trafficking')
      expect(traffickingRelief?.filingFee).toBe(0)
    })
  })

  describe('Best Option Selection', () => {
    it('should prioritize automatic expungement over other options', () => {
      const result = engine.assessEligibility(
        testScenarios.marijuanaBeforeDecriminalization,
        additionalFactorsScenarios.standard
      )

      expect(result.bestOption?.reliefType).toBe('automatic_expungement')
    })

    it('should prioritize automatic sealing when expungement not available', () => {
      const result = engine.assessEligibility(
        testScenarios.nonConvictionCase,
        additionalFactorsScenarios.standard
      )

      expect(result.bestOption?.reliefType).toBe('automatic_sealing')
    })

    it('should prioritize trafficking survivors relief appropriately', () => {
      const result = engine.assessEligibility(
        testScenarios.traffickingVictim,
        additionalFactorsScenarios.traffickingVictim
      )

      // Trafficking survivors relief should be high priority
      expect(result.bestOption?.reliefType).toBe('trafficking_survivors')
    })
  })

  describe('Timeline and Document Calculations', () => {
    it('should calculate appropriate timelines', () => {
      const result = engine.assessEligibility(
        testScenarios.marijuanaBeforeDecriminalization,
        additionalFactorsScenarios.standard
      )

      expect(result.estimatedTimeline).toBeDefined()
      expect(result.estimatedTimeline).not.toBe('No immediate timeline available')
    })

    it('should provide required documents list', () => {
      const result = engine.assessEligibility(
        testScenarios.youthOffender,
        additionalFactorsScenarios.standard
      )

      expect(result.requiredDocuments).toBeDefined()
      expect(result.requiredDocuments?.length).toBeGreaterThan(0)
      expect(result.requiredDocuments).toContain('Certified copy of criminal record')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle cases with no completion date', () => {
      const caseWithoutCompletion = {
        ...testScenarios.recentMisdemeanor,
        completionDate: undefined,
      }

      const result = engine.assessEligibility(
        caseWithoutCompletion,
        additionalFactorsScenarios.standard
      )

      expect(result).toBeDefined()
      expect(result.allOptions.length).toBeGreaterThan(0)
    })

    it('should handle unknown offense types gracefully', () => {
      const unknownOffense = {
        ...testScenarios.adultOffender,
        offense: 'Unknown Offense Type XYZ',
      }

      const result = engine.assessEligibility(
        unknownOffense,
        additionalFactorsScenarios.standard
      )

      expect(result).toBeDefined()
      // Should still offer motion-based relief
      const motionExpungement = result.allOptions.find(o => o.reliefType === 'motion_expungement')
      expect(motionExpungement?.eligible).toBe(true)
    })

    it('should provide meaningful reasoning when no options are available', () => {
      const result = engine.assessEligibility(
        testScenarios.excludedOffense,
        additionalFactorsScenarios.standard
      )

      expect(result.reasoning).toBeDefined()
      expect(result.reasoning.length).toBeGreaterThan(0)
      expect(result.nextSteps).toBeDefined()
      expect(result.nextSteps.length).toBeGreaterThan(0)
    })
  })

  describe('Date Calculations', () => {
    it('should correctly calculate waiting periods', () => {
      const oldCase = {
        ...testScenarios.recentMisdemeanor,
        offenseDate: new Date('2010-01-01'),
        completionDate: new Date('2010-06-01'),
      }

      const result = engine.assessEligibility(oldCase, additionalFactorsScenarios.standard)
      
      const autoSealing = result.allOptions.find(o => o.reliefType === 'automatic_sealing')
      expect(autoSealing?.eligible).toBe(true)
    })

    it('should handle future eligibility dates', () => {
      const result = engine.assessEligibility(
        testScenarios.recentMisdemeanor,
        additionalFactorsScenarios.standard
      )

      const autoSealing = result.allOptions.find(o => o.reliefType === 'automatic_sealing')
      expect(autoSealing?.estimatedEligibilityDate).toBeInstanceOf(Date)
      if (autoSealing?.estimatedEligibilityDate) {
        expect(autoSealing.estimatedEligibilityDate.getTime()).toBeGreaterThan(new Date().getTime())
      }
    })
  })
})
