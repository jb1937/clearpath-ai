import type { UserCase, AdditionalFactors } from '../types'

export const createMockUserCase = (overrides: Partial<UserCase> = {}): UserCase => ({
  id: 'test-case-1',
  offense: 'Simple Possession of Marijuana',
  offenseDate: new Date('2014-01-15'),
  outcome: 'convicted',
  ageAtOffense: 22,
  isTraffickingRelated: false,
  jurisdiction: 'dc',
  completionDate: new Date('2014-06-15'),
  sentence: {
    jailTime: 0,
    probation: 6,
    fines: 250,
    allCompleted: true,
    completionDate: new Date('2014-06-15'),
  },
  ...overrides,
})

export const createMockAdditionalFactors = (overrides: Partial<AdditionalFactors> = {}): AdditionalFactors => ({
  hasOpenCases: false,
  isTraffickingVictim: false,
  seekingActualInnocence: false,
  ...overrides,
})

// Test scenarios for eligibility engine
export const testScenarios = {
  // Automatic Expungement Cases
  marijuanaBeforeDecriminalization: createMockUserCase({
    offense: 'Simple Possession of Marijuana',
    offenseDate: new Date('2014-01-15'),
    outcome: 'convicted',
  }),

  marijuanaAfterDecriminalization: createMockUserCase({
    offense: 'Simple Possession of Marijuana',
    offenseDate: new Date('2016-01-15'),
    outcome: 'convicted',
  }),

  // Automatic Sealing Cases
  nonConvictionCase: createMockUserCase({
    offense: 'Assault',
    outcome: 'dismissed',
    completionDate: new Date('2020-01-15'),
  }),

  misdemeanorWithWaitingPeriod: createMockUserCase({
    offense: 'Petty Theft',
    offenseDate: new Date('2012-01-15'),
    outcome: 'convicted',
    completionDate: new Date('2012-06-15'),
  }),

  recentMisdemeanor: createMockUserCase({
    offense: 'Petty Theft',
    offenseDate: new Date('2022-01-15'),
    outcome: 'convicted',
    completionDate: new Date('2022-06-15'),
  }),

  // Motion-Based Cases
  youthOffender: createMockUserCase({
    offense: 'Burglary',
    ageAtOffense: 19,
    outcome: 'convicted',
    offenseDate: new Date('2018-01-15'),
    completionDate: new Date('2019-01-15'),
  }),

  adultOffender: createMockUserCase({
    offense: 'Burglary',
    ageAtOffense: 30,
    outcome: 'convicted',
    offenseDate: new Date('2018-01-15'),
    completionDate: new Date('2019-01-15'),
  }),

  // Special Programs
  traffickingVictim: createMockUserCase({
    offense: 'Prostitution',
    outcome: 'convicted',
    isTraffickingRelated: true,
  }),

  // Excluded Offenses
  excludedOffense: createMockUserCase({
    offense: 'Murder',
    outcome: 'convicted',
  }),
}

export const additionalFactorsScenarios = {
  standard: createMockAdditionalFactors(),
  traffickingVictim: createMockAdditionalFactors({
    isTraffickingVictim: true,
  }),
  seekingInnocence: createMockAdditionalFactors({
    seekingActualInnocence: true,
  }),
  hasOpenCases: createMockAdditionalFactors({
    hasOpenCases: true,
  }),
}
