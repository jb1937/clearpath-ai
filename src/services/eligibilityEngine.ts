import { addYears, isAfter, isBefore } from 'date-fns'
import type { UserCase, AdditionalFactors, EligibilityResult, ReliefOption, NextStep } from '../types'
import { DC_OFFENSES } from '../data/jurisdictions/dc'

export class EligibilityEngine {
  
  assessEligibility(userCase: UserCase, additionalFactors: AdditionalFactors): EligibilityResult {
    const results: ReliefOption[] = []
    
    // Check automatic expungement
    const autoExpunge = this.checkAutomaticExpungement(userCase)
    if (autoExpunge.eligible) results.push(autoExpunge)
    
    // Check automatic sealing  
    const autoSeal = this.checkAutomaticSealing(userCase)
    if (autoSeal.eligible) results.push(autoSeal)
    
    // Check motion-based relief
    const motionRelief = this.checkMotionBasedRelief(userCase, additionalFactors)
    results.push(...motionRelief.filter(r => r.eligible))
    
    // Check special programs
    const specialPrograms = this.checkSpecialPrograms(userCase, additionalFactors)
    results.push(...specialPrograms.filter(r => r.eligible))
    
    // Generate reasoning and next steps
    const reasoning = this.generateReasoning(userCase, results)
    const nextSteps = this.generateNextSteps(results, userCase)
    
    return {
      bestOption: this.selectBestOption(results),
      allOptions: results,
      reasoning,
      nextSteps,
      estimatedTimeline: this.calculateTimeline(results),
      requiredDocuments: this.getRequiredDocuments(results)
    }
  }
  
  private checkAutomaticExpungement(userCase: UserCase): ReliefOption {
    const result: ReliefOption = {
      eligible: false,
      reliefType: 'automatic_expungement',
      name: 'Automatic Expungement',
      description: 'Automatic removal of eligible records without filing required',
      reasons: [],
      timeline: undefined,
      requirements: []
    }
    
    // Rule 1: Simple marijuana possession before Feb 15, 2015
    if (this.isMarijuanaPossession(userCase.offense) && 
        isBefore(userCase.offenseDate, new Date('2015-02-15'))) {
      result.eligible = true
      result.reasons.push('Simple marijuana possession before decriminalization date (February 15, 2015)')
      result.timeline = 'Should be completed by January 1, 2026'
      result.requirements = ['No action required - automatic process']
      result.filingFee = 0
      result.difficulty = 'low'
      result.successLikelihood = 'high'
      return result
    }
    
    // Rule 2: Other decriminalized offenses
    if (this.isDecriminalizedOffense(userCase.offense)) {
      result.eligible = true
      result.reasons.push('Offense was subsequently decriminalized')
      result.timeline = 'Within 90 days of case termination or by October 2027'
      result.requirements = ['No action required - automatic process']
      result.filingFee = 0
      result.difficulty = 'low'
      result.successLikelihood = 'high'
      return result
    }
    
    result.reasons.push('Does not qualify for automatic expungement')
    return result
  }
  
  private checkAutomaticSealing(userCase: UserCase): ReliefOption {
    const result: ReliefOption = {
      eligible: false,
      reliefType: 'automatic_sealing',
      name: 'Automatic Sealing',
      description: 'Automatic sealing of eligible records without filing required',
      reasons: [],
      timeline: undefined,
      requirements: []
    }
    
    // Check if offense is excluded
    if (this.isExcludedOffense(userCase.offense, 'automatic_sealing')) {
      result.reasons.push('Offense type is excluded from automatic sealing')
      return result
    }
    
    // Non-conviction cases
    if (userCase.outcome !== 'convicted') {
      result.eligible = true
      result.reasons.push('Non-conviction record qualifies for automatic sealing')
      result.timeline = 'Within 90 days of case termination'
      result.requirements = ['No action required - automatic process']
      result.filingFee = 0
      result.difficulty = 'low'
      result.successLikelihood = 'high'
      return result
    }
    
    // Conviction cases - check severity and waiting period
    const offense = this.findOffense(userCase.offense)
    if (offense?.severity === 'misdemeanor') {
      const waitingPeriodMet = this.checkWaitingPeriod(userCase, 10) // 10 years for DC
      
      if (waitingPeriodMet) {
        result.eligible = true
        result.reasons.push('Misdemeanor conviction with 10-year waiting period completed')
        result.timeline = 'Should be completed by January 1, 2027'
        result.requirements = ['No action required - automatic process']
        result.filingFee = 0
        result.difficulty = 'low'
        result.successLikelihood = 'high'
      } else {
        result.reasons.push('10-year waiting period not yet completed')
        result.estimatedEligibilityDate = this.calculateEligibilityDate(userCase, 10)
      }
      
      return result
    }
    
    if (offense?.severity === 'felony') {
      result.reasons.push('Felony convictions not eligible for automatic sealing')
    } else {
      result.reasons.push('Unable to determine offense severity')
    }
    
    return result
  }
  
  private checkMotionBasedRelief(userCase: UserCase, additionalFactors: AdditionalFactors): ReliefOption[] {
    const results: ReliefOption[] = []
    
    // Motion-based expungement (actual innocence)
    results.push(this.checkMotionExpungement(userCase, additionalFactors))
    
    // Motion-based sealing (interests of justice)  
    results.push(this.checkMotionSealing(userCase, additionalFactors))
    
    return results
  }
  
  private checkMotionExpungement(_userCase: UserCase, additionalFactors: AdditionalFactors): ReliefOption {
    const result: ReliefOption = {
      eligible: true, // Always available to claim innocence
      reliefType: 'motion_expungement',
      name: 'Motion for Expungement (Actual Innocence)',
      description: 'Court-ordered expungement based on actual innocence',
      reasons: ['Available if you can prove actual innocence'],
      requirements: [
        'Prove by preponderance of evidence that offense did not occur OR was committed by someone else',
        'File motion with DC Superior Court',
        'No waiting period required'
      ],
      timeline: 'Court must decide within 180 days',
      difficulty: 'high',
      successLikelihood: additionalFactors.seekingActualInnocence ? 'medium' : 'low_without_new_evidence',
      filingFee: 50,
      attorneyRecommended: true
    }
    
    if (additionalFactors.seekingActualInnocence) {
      result.reasons.push('You indicated belief in actual innocence - this may be a viable option')
      result.successLikelihood = 'medium'
    }
    
    return result
  }
  
  private checkMotionSealing(userCase: UserCase, _additionalFactors: AdditionalFactors): ReliefOption {
    const result: ReliefOption = {
      eligible: false,
      reliefType: 'motion_sealing',
      name: 'Motion for Sealing (Interests of Justice)',
      description: 'Court-ordered sealing based on interests of justice standard',
      reasons: [],
      requirements: [],
      timeline: 'Court typically decides within 6 months',
      filingFee: 50,
      attorneyRecommended: true
    }
    
    // Check if offense type allows motion sealing
    if (this.isExcludedOffense(userCase.offense, 'motion_sealing')) {
      result.reasons.push('Offense type excluded from all sealing relief')
      return result
    }
    
    // Non-conviction cases for excluded offenses
    if (userCase.outcome !== 'convicted') {
      result.eligible = true
      result.reasons.push('Non-conviction record can be sealed by motion even for excluded offense types')
      result.requirements = [
        'Prove sealing serves interests of justice',
        'File motion with DC Superior Court',
        'No waiting period for non-convictions'
      ]
      result.difficulty = 'medium'
      result.successLikelihood = 'high'
      return result
    }
    
    // Conviction cases
    if (userCase.outcome === 'convicted') {
      const offense = this.findOffense(userCase.offense)
      
      if (offense?.severity === 'misdemeanor') {
        const waitingPeriodMet = this.checkWaitingPeriod(userCase, 5) // 5 years for motion
        
        if (waitingPeriodMet) {
          result.eligible = true
          result.reasons.push('Misdemeanor conviction with 5-year waiting period completed')
          result.requirements = [
            'Prove sealing serves interests of justice',
            'Demonstrate rehabilitation and community benefit',
            'Show minimal public safety risk',
            'File motion with DC Superior Court'
          ]
          result.difficulty = 'medium'
          result.successLikelihood = 'medium'
        } else {
          result.reasons.push('5-year waiting period not yet completed')
          result.estimatedEligibilityDate = this.calculateEligibilityDate(userCase, 5)
        }
      } else if (offense?.severity === 'felony' && this.isFailureToAppearFelony(userCase.offense)) {
        const waitingPeriodMet = this.checkWaitingPeriod(userCase, 8) // 8 years for felonies
        
        if (waitingPeriodMet) {
          result.eligible = true
          result.reasons.push('Failure to appear felony with 8-year waiting period completed')
          result.requirements = [
            'Prove sealing serves interests of justice',
            'Limited to failure-to-appear felonies only',
            'File motion with DC Superior Court'
          ]
          result.difficulty = 'medium'
          result.successLikelihood = 'medium'
        } else {
          result.reasons.push('8-year waiting period not yet completed')
          result.estimatedEligibilityDate = this.calculateEligibilityDate(userCase, 8)
        }
      } else {
        result.reasons.push('Felony convictions not eligible for sealing (except failure to appear)')
      }
    }
    
    return result
  }
  
  private checkSpecialPrograms(userCase: UserCase, additionalFactors: AdditionalFactors): ReliefOption[] {
    const results: ReliefOption[] = []
    
    // Youth Rehabilitation Act
    if (userCase.ageAtOffense <= 24) {
      results.push(this.checkYouthRehabilitationAct(userCase))
    }
    
    // Trafficking survivors relief
    if (additionalFactors.isTraffickingVictim) {
      results.push(this.checkTraffickingSurvivorsRelief(userCase))
    }
    
    return results
  }
  
  private checkYouthRehabilitationAct(userCase: UserCase): ReliefOption {
    return {
      eligible: true,
      reliefType: 'youth_rehabilitation_act',
      name: 'Youth Rehabilitation Act',
      description: 'Special consideration for offenses committed under age 25',
      reasons: [`You were ${userCase.ageAtOffense} years old at time of offense, qualifying for YRA consideration`],
      requirements: [
        'File motion citing Youth Rehabilitation Act',
        'Demonstrate rehabilitation and community benefit',
        'Show no subsequent serious offenses'
      ],
      timeline: '6-12 months for court decision',
      difficulty: 'medium',
      successLikelihood: 'high',
      filingFee: 50,
      attorneyRecommended: true
    }
  }
  
  private checkTraffickingSurvivorsRelief(_userCase: UserCase): ReliefOption {
    return {
      eligible: true,
      reliefType: 'trafficking_survivors',
      name: 'Human Trafficking Survivors Relief',
      description: 'Special relief for victims of human trafficking',
      reasons: ['You indicated being a victim of human trafficking'],
      requirements: [
        'Provide evidence of trafficking victimization',
        'Show connection between offense and trafficking situation',
        'File specialized motion with supporting documentation'
      ],
      timeline: '3-6 months for expedited processing',
      difficulty: 'medium',
      successLikelihood: 'high',
      filingFee: 0, // Waived for trafficking victims
      attorneyRecommended: true
    }
  }
  
  // Helper methods
  private isMarijuanaPossession(offense: string): boolean {
    const keywords = ['marijuana', 'cannabis', 'simple possession marijuana', 'weed']
    return keywords.some(keyword => 
      offense.toLowerCase().includes(keyword.toLowerCase())
    )
  }
  
  private isDecriminalizedOffense(offense: string): boolean {
    // Add logic for other decriminalized offenses
    return this.isMarijuanaPossession(offense)
  }
  
  private isExcludedOffense(offense: string, reliefType: string): boolean {
    const offenseData = this.findOffense(offense)
    if (!offenseData) return false
    
    // Type-safe check for excluded relief types
    return offenseData.excludedFrom.some(excluded => excluded === reliefType)
  }
  
  private findOffense(offense: string) {
    return DC_OFFENSES.find(o => 
      o.name.toLowerCase() === offense.toLowerCase() ||
      o.keywords.some(keyword => 
        offense.toLowerCase().includes(keyword.toLowerCase())
      )
    )
  }
  
  private isFailureToAppearFelony(offense: string): boolean {
    return offense.toLowerCase().includes('failure to appear') && 
           this.findOffense(offense)?.severity === 'felony'
  }
  
  private checkWaitingPeriod(userCase: UserCase, years: number): boolean {
    if (!userCase.completionDate) return false
    
    const eligibilityDate = addYears(userCase.completionDate, years)
    return isAfter(new Date(), eligibilityDate)
  }
  
  private calculateEligibilityDate(userCase: UserCase, years: number): Date | undefined {
    if (!userCase.completionDate) return undefined
    return addYears(userCase.completionDate, years)
  }
  
  private selectBestOption(options: ReliefOption[]): ReliefOption | undefined {
    if (options.length === 0) return undefined
    
    // Priority order: automatic > motion > special programs
    const priorities: Record<string, number> = {
      'automatic_expungement': 1,
      'automatic_sealing': 2,
      'motion_expungement': 3,
      'motion_sealing': 4,
      'youth_rehabilitation_act': 5,
      'trafficking_survivors': 3 // High priority for trafficking victims
    }
    
    return options.sort((a, b) => {
      const aPriority = priorities[a.reliefType] || 10
      const bPriority = priorities[b.reliefType] || 10
      return aPriority - bPriority
    })[0]
  }
  
  private generateReasoning(userCase: UserCase, results: ReliefOption[]): string[] {
    const reasoning: string[] = []
    
    reasoning.push(`Analyzed case: ${userCase.offense}`)
    reasoning.push(`Offense date: ${userCase.offenseDate.toLocaleDateString()}`)
    reasoning.push(`Case outcome: ${userCase.outcome}`)
    
    if (userCase.ageAtOffense <= 24) {
      reasoning.push(`Age at offense (${userCase.ageAtOffense}) qualifies for Youth Rehabilitation Act consideration`)
    }
    
    const eligibleOptions = results.filter(r => r.eligible)
    if (eligibleOptions.length > 0) {
      reasoning.push(`Found ${eligibleOptions.length} potential relief option(s)`)
    } else {
      reasoning.push('No immediate relief options available, but circumstances may change')
    }
    
    return reasoning
  }
  
  private generateNextSteps(results: ReliefOption[], _userCase: UserCase): NextStep[] {
    const steps: NextStep[] = []
    const eligibleOptions = results.filter(r => r.eligible)
    
    if (eligibleOptions.length === 0) {
      steps.push({
        id: 'wait_or_consult',
        title: 'Consider Future Options',
        description: 'While no immediate relief is available, circumstances may change over time.',
        priority: 'medium',
        timeframe: 'Ongoing',
        resources: [
          {
            title: 'Legal Aid DC',
            url: 'https://www.legalaiddc.org',
            type: 'legal_aid',
            description: 'Free legal assistance for eligible individuals'
          }
        ]
      })
      return steps
    }
    
    const bestOption = this.selectBestOption(eligibleOptions)
    
    if (bestOption?.reliefType.includes('automatic')) {
      steps.push({
        id: 'monitor_automatic',
        title: 'Monitor Automatic Processing',
        description: 'Your case appears eligible for automatic processing. Monitor your record periodically.',
        priority: 'high',
        timeframe: bestOption.timeline || 'Within 1-2 years',
        resources: [
          {
            title: 'DC Courts Record Check',
            url: 'https://www.dccourts.gov',
            type: 'court_info',
            description: 'Check the status of your criminal record'
          }
        ]
      })
    } else {
      steps.push({
        id: 'file_motion',
        title: 'File Court Motion',
        description: `Prepare and file a ${bestOption?.name} with DC Superior Court.`,
        priority: 'high',
        timeframe: 'Next 30-60 days',
        resources: [
          {
            title: 'DC Superior Court Forms',
            url: 'https://www.dccourts.gov/services/forms-and-fees',
            type: 'form',
            description: 'Official court forms for sealing and expungement'
          }
        ]
      })
    }
    
    if (bestOption?.attorneyRecommended) {
      steps.push({
        id: 'consult_attorney',
        title: 'Consult with Attorney',
        description: 'Consider consulting with an attorney experienced in DC criminal record relief.',
        priority: 'high',
        timeframe: 'Before filing',
        resources: [
          {
            title: 'DC Bar Lawyer Referral Service',
            url: 'https://www.dcbar.org/attorney-directory',
            type: 'attorney_directory',
            description: 'Find qualified attorneys in DC'
          }
        ]
      })
    }
    
    steps.push({
      id: 'gather_documents',
      title: 'Gather Required Documents',
      description: 'Collect all necessary documentation for your case.',
      priority: 'medium',
      timeframe: 'Before filing',
      resources: [
        {
          title: 'Document Checklist',
          url: '#',
          type: 'guide',
          description: 'Complete list of required documents'
        }
      ]
    })
    
    return steps
  }
  
  private calculateTimeline(results: ReliefOption[]): string {
    const eligibleOptions = results.filter(r => r.eligible)
    if (eligibleOptions.length === 0) return 'No immediate timeline available'
    
    const bestOption = this.selectBestOption(eligibleOptions)
    return bestOption?.timeline || 'Timeline varies by case'
  }
  
  private getRequiredDocuments(results: ReliefOption[]): string[] {
    const eligibleOptions = results.filter(r => r.eligible)
    if (eligibleOptions.length === 0) return []
    
    const documents = [
      'Certified copy of criminal record',
      'Proof of sentence completion',
      'Court case documents'
    ]
    
    const bestOption = this.selectBestOption(eligibleOptions)
    if (bestOption?.reliefType.includes('motion')) {
      documents.push('Motion filing forms', 'Supporting affidavits')
    }
    
    return documents
  }
}

// Export singleton instance
export const eligibilityEngine = new EligibilityEngine()
