import type { Jurisdiction, ReliefType, ExcludedOffense, SpecialProgram, WaitingPeriod } from '../../types'

// DC Excluded Offenses Database
export const DC_EXCLUDED_OFFENSES: ExcludedOffense[] = [
  {
    id: 'intrafamily_offenses',
    category: 'Domestic Violence',
    description: 'Intrafamily offenses including domestic violence, stalking, and protective order violations',
    statuteReferences: ['D.C. Code § 16-1001(8)'],
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    reasoning: 'Public safety concerns and victim protection',
    keywords: ['domestic violence', 'stalking', 'protective order', 'restraining order', 'intrafamily']
  },
  {
    id: 'sexual_offenses',
    category: 'Sexual Offenses',
    description: 'Misdemeanor sexual abuse and sexual performances by minors',
    statuteReferences: ['D.C. Code § 22-3006', 'Chapter 31A'],
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    reasoning: 'Public safety and protection of vulnerable populations',
    keywords: ['sexual abuse', 'sexual assault', 'sexual performance', 'minor', 'indecent exposure']
  },
  {
    id: 'crimes_of_violence',
    category: 'Crimes of Violence',
    description: 'Armed robbery, assault with deadly weapon, and other violent crimes',
    statuteReferences: ['D.C. Code § 23-1331(4)'],
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    reasoning: 'Serious violent nature poses ongoing public safety risk',
    keywords: ['armed robbery', 'assault deadly weapon', 'carjacking', 'robbery', 'aggravated assault']
  },
  {
    id: 'dui_dwi',
    category: 'Impaired Driving',
    description: 'All DUI/DWI and impaired driving offenses',
    statuteReferences: ['D.C. Code § 50-2206.11', '§ 50-2206.12', '§ 50-2206.14'],
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    reasoning: 'Public safety concerns related to impaired driving',
    keywords: ['dui', 'dwi', 'driving under influence', 'operating while impaired', 'drunk driving', 'owi']
  },
  {
    id: 'weapons_violations',
    category: 'Weapons Offenses',
    description: 'All Chapter 30A weapons violations',
    statuteReferences: ['Chapter 30A'],
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    reasoning: 'Public safety concerns related to weapons possession',
    keywords: ['weapon', 'firearm', 'gun', 'carrying pistol', 'concealed weapon', 'unlawful possession']
  },
  {
    id: 'child_abuse',
    category: 'Child Abuse and Neglect',
    description: 'Abuse, neglect, or financial exploitation of children or vulnerable adults',
    statuteReferences: ['D.C. Code § 22-933', '§ 22-933.01', '§ 22-1102'],
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    reasoning: 'Protection of vulnerable populations',
    keywords: ['child abuse', 'child neglect', 'vulnerable adult', 'elderly abuse', 'exploitation']
  },
  {
    id: 'failure_to_appear',
    category: 'Failure to Appear',
    description: 'Failure to appear in court (excluded from automatic sealing only)',
    statuteReferences: ['Various'],
    excludedFrom: ['automatic_sealing'], // Still eligible for motion sealing
    reasoning: 'Administrative concerns about court compliance',
    keywords: ['failure to appear', 'fta', 'bench warrant']
  }
]

// DC Relief Types
const DC_RELIEF_TYPES: ReliefType[] = [
  {
    id: 'automatic_expungement',
    name: 'Automatic Expungement',
    description: 'Automatic removal of eligible records without filing required',
    requirements: [
      {
        id: 'decriminalized_offense',
        description: 'Offense must have been subsequently decriminalized',
        type: 'documentation',
        required: true
      }
    ],
    exclusions: ['severity_groups_123'],
    eligibilityStandard: 'automatic'
  },
  {
    id: 'automatic_sealing',
    name: 'Automatic Sealing',
    description: 'Automatic sealing of eligible records without filing required',
    requirements: [
      {
        id: 'waiting_period',
        description: 'Applicable waiting period must be completed',
        type: 'waiting_period',
        required: true
      },
      {
        id: 'sentence_completion',
        description: 'All sentence requirements must be completed',
        type: 'completion',
        required: true
      }
    ],
    exclusions: ['intrafamily_offenses', 'sexual_offenses', 'crimes_of_violence', 'dui_dwi', 'weapons_violations', 'child_abuse', 'failure_to_appear'],
    waitingPeriod: 10, // years for misdemeanors
    eligibilityStandard: 'automatic'
  },
  {
    id: 'motion_expungement',
    name: 'Motion for Expungement (Actual Innocence)',
    description: 'Court-ordered expungement based on actual innocence',
    requirements: [
      {
        id: 'actual_innocence',
        description: 'Prove by preponderance of evidence that offense did not occur or was committed by someone else',
        type: 'court_filing',
        required: true
      }
    ],
    exclusions: ['severity_groups_123'],
    eligibilityStandard: 'actual_innocence'
  },
  {
    id: 'motion_sealing',
    name: 'Motion for Sealing (Interests of Justice)',
    description: 'Court-ordered sealing based on interests of justice standard',
    requirements: [
      {
        id: 'interests_of_justice',
        description: 'Demonstrate that sealing serves the interests of justice',
        type: 'court_filing',
        required: true
      },
      {
        id: 'waiting_period',
        description: 'Applicable waiting period must be completed',
        type: 'waiting_period',
        required: true
      }
    ],
    exclusions: Object.keys(DC_EXCLUDED_OFFENSES).filter(id => id !== 'failure_to_appear'),
    waitingPeriod: 5, // years for misdemeanors
    eligibilityStandard: 'interests_of_justice'
  }
]

// DC Special Programs
const DC_SPECIAL_PROGRAMS: SpecialProgram[] = [
  {
    id: 'youth_rehabilitation_act',
    name: 'Youth Rehabilitation Act',
    description: 'Special consideration for offenses committed under age 25',
    eligibilityRequirements: [
      'Age 24 or younger at time of offense',
      'Successfully completed sentence',
      'No subsequent convictions'
    ],
    benefits: [
      'Enhanced sealing eligibility',
      'Reduced waiting periods',
      'Special consideration for employment'
    ],
    applicationProcess: [
      'File motion with DC Superior Court',
      'Provide evidence of rehabilitation',
      'Demonstrate community benefit'
    ]
  },
  {
    id: 'trafficking_survivors',
    name: 'Human Trafficking Survivors Relief',
    description: 'Special relief for victims of human trafficking',
    eligibilityRequirements: [
      'Evidence of being a trafficking victim',
      'Offense related to trafficking situation',
      'Cooperation with law enforcement (if applicable)'
    ],
    benefits: [
      'Expedited processing',
      'Waived filing fees',
      'Enhanced privacy protections'
    ],
    applicationProcess: [
      'File specialized motion',
      'Provide trafficking documentation',
      'Work with victim services'
    ]
  }
]

// DC Waiting Periods
const DC_WAITING_PERIODS: WaitingPeriod[] = [
  {
    reliefType: 'automatic_sealing',
    offenseType: 'misdemeanor',
    years: 10,
    startDate: 'completion_date'
  },
  {
    reliefType: 'motion_sealing',
    offenseType: 'misdemeanor',
    years: 5,
    startDate: 'completion_date'
  },
  {
    reliefType: 'motion_sealing',
    offenseType: 'felony',
    years: 8,
    startDate: 'completion_date'
  }
]

// Main DC Jurisdiction Configuration
export const DC_JURISDICTION: Jurisdiction = {
  id: 'dc',
  name: 'Washington, DC',
  effectiveDate: new Date('2023-01-01'),
  reliefTypes: DC_RELIEF_TYPES,
  excludedOffenses: DC_EXCLUDED_OFFENSES,
  specialPrograms: DC_SPECIAL_PROGRAMS,
  waitingPeriods: DC_WAITING_PERIODS
}

// DC Offense Database
export const DC_OFFENSES = [
  // Marijuana Offenses (Eligible for automatic expungement if before 2015)
  {
    id: 'marijuana_simple_possession',
    name: 'Simple Possession of Marijuana',
    keywords: ['marijuana', 'cannabis', 'possession', 'simple possession marijuana', 'weed'],
    statuteNumbers: ['D.C. Code § 48-1201'],
    severity: 'misdemeanor' as const,
    category: 'drug',
    isExcluded: false,
    excludedFrom: [],
    specialConsiderations: ['Automatic expungement if offense occurred before February 15, 2015']
  },
  
  // Common Misdemeanors
  {
    id: 'simple_assault',
    name: 'Simple Assault',
    keywords: ['simple assault', 'assault', 'fighting', 'battery'],
    statuteNumbers: ['D.C. Code § 22-404'],
    severity: 'misdemeanor' as const,
    category: 'assault',
    isExcluded: false,
    excludedFrom: [],
    specialConsiderations: []
  },
  {
    id: 'theft_second_degree',
    name: 'Theft in the Second Degree',
    keywords: ['theft', 'stealing', 'larceny', 'shoplifting'],
    statuteNumbers: ['D.C. Code § 22-3212'],
    severity: 'misdemeanor' as const,
    category: 'theft',
    isExcluded: false,
    excludedFrom: [],
    specialConsiderations: []
  },
  {
    id: 'disorderly_conduct',
    name: 'Disorderly Conduct',
    keywords: ['disorderly conduct', 'public disturbance', 'breach of peace'],
    statuteNumbers: ['D.C. Code § 22-1321'],
    severity: 'misdemeanor' as const,
    category: 'public_order',
    isExcluded: false,
    excludedFrom: [],
    specialConsiderations: []
  },
  {
    id: 'unlawful_entry',
    name: 'Unlawful Entry',
    keywords: ['unlawful entry', 'trespassing', 'breaking and entering'],
    statuteNumbers: ['D.C. Code § 22-3302'],
    severity: 'misdemeanor' as const,
    category: 'property',
    isExcluded: false,
    excludedFrom: [],
    specialConsiderations: []
  },
  
  // Excluded Offenses
  {
    id: 'dui',
    name: 'Driving Under the Influence',
    keywords: ['dui', 'dwi', 'drunk driving', 'impaired driving', 'owi'],
    statuteNumbers: ['D.C. Code § 50-2206.11'],
    severity: 'misdemeanor' as const,
    category: 'traffic',
    isExcluded: true,
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    specialConsiderations: ['Excluded from all sealing relief']
  },
  {
    id: 'domestic_violence',
    name: 'Domestic Violence',
    keywords: ['domestic violence', 'intrafamily offense', 'domestic assault'],
    statuteNumbers: ['D.C. Code § 16-1001'],
    severity: 'misdemeanor' as const,
    category: 'domestic',
    isExcluded: true,
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    specialConsiderations: ['Excluded from all sealing relief']
  },
  {
    id: 'carrying_pistol',
    name: 'Carrying a Pistol Without a License',
    keywords: ['carrying pistol', 'weapon', 'firearm', 'gun', 'cpwl'],
    statuteNumbers: ['D.C. Code § 22-4504'],
    severity: 'felony' as const,
    category: 'weapons',
    isExcluded: true,
    excludedFrom: ['automatic_sealing', 'motion_sealing'],
    specialConsiderations: ['Excluded from all sealing relief']
  },
  
  // Additional Common Offenses
  {
    id: 'possession_controlled_substance',
    name: 'Possession of Controlled Substance',
    keywords: ['possession controlled substance', 'drug possession', 'narcotics'],
    statuteNumbers: ['D.C. Code § 48-904.01'],
    severity: 'misdemeanor' as const,
    category: 'drug',
    isExcluded: false,
    excludedFrom: [],
    specialConsiderations: []
  },
  {
    id: 'failure_to_appear',
    name: 'Failure to Appear',
    keywords: ['failure to appear', 'fta', 'bench warrant'],
    statuteNumbers: ['Various'],
    severity: 'misdemeanor' as const,
    category: 'administrative',
    isExcluded: true,
    excludedFrom: ['automatic_sealing'], // Can still get motion sealing
    specialConsiderations: ['Excluded from automatic sealing only']
  },
  {
    id: 'public_urination',
    name: 'Public Urination',
    keywords: ['public urination', 'urinating in public'],
    statuteNumbers: ['D.C. Code § 22-1321'],
    severity: 'infraction' as const,
    category: 'public_order',
    isExcluded: false,
    excludedFrom: [],
    specialConsiderations: []
  },
  {
    id: 'metro_fare_evasion',
    name: 'Metro Fare Evasion',
    keywords: ['fare evasion', 'metro', 'subway', 'transit'],
    statuteNumbers: ['WMATA regulations'],
    severity: 'infraction' as const,
    category: 'transit',
    isExcluded: false,
    excludedFrom: [],
    specialConsiderations: []
  }
]
