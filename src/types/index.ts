// Core data structures for the Criminal Record Expungement Eligibility System

export interface Jurisdiction {
  id: string; // 'dc', 'california', etc.
  name: string;
  effectiveDate: Date;
  reliefTypes: ReliefType[];
  excludedOffenses: ExcludedOffense[];
  specialPrograms: SpecialProgram[];
  waitingPeriods: WaitingPeriod[];
}

export interface ReliefType {
  id: string; // 'automatic_expungement', 'motion_sealing', etc.
  name: string;
  description: string;
  requirements: Requirement[];
  exclusions: string[]; // References to excluded offense IDs
  waitingPeriod?: number; // Years
  eligibilityStandard: 'automatic' | 'actual_innocence' | 'interests_of_justice';
}

export interface Requirement {
  id: string;
  description: string;
  type: 'waiting_period' | 'completion' | 'documentation' | 'court_filing';
  required: boolean;
}

export interface ExcludedOffense {
  id: string;
  category: string;
  description: string;
  statuteReferences: string[];
  excludedFrom: string[]; // Relief type IDs
  reasoning: string;
  keywords: string[];
}

export interface SpecialProgram {
  id: string;
  name: string;
  description: string;
  eligibilityRequirements: string[];
  benefits: string[];
  applicationProcess: string[];
}

export interface WaitingPeriod {
  reliefType: string;
  offenseType: 'misdemeanor' | 'felony' | 'infraction';
  years: number;
  startDate: 'offense_date' | 'completion_date' | 'conviction_date';
}

export interface UserCase {
  id: string;
  offense: string;
  offenseDate: Date;
  statuteNumber?: string;
  outcome: 'convicted' | 'dismissed' | 'acquitted' | 'no_papered' | 'nolle_prosequi';
  sentence?: Sentence;
  completionDate?: Date;
  ageAtOffense: number;
  isTraffickingRelated: boolean;
  jurisdiction: string;
  court?: string;
}

export interface Sentence {
  jailTime?: number; // months
  probation?: number; // months  
  fines?: number;
  communityService?: number; // hours
  allCompleted: boolean;
  completionDate?: Date;
}

export interface OffenseCategory {
  id: string;
  name: string;
  jurisdiction: string;
  statuteNumbers: string[];
  keywords: string[];
  severity: 'felony' | 'misdemeanor' | 'infraction';
  isExcluded: boolean;
  excludedFrom: string[]; // Relief type IDs
  specialConsiderations: string[];
}

export interface EligibilityResult {
  bestOption?: ReliefOption;
  allOptions: ReliefOption[];
  reasoning: string[];
  nextSteps: NextStep[];
  estimatedTimeline?: string;
  requiredDocuments?: string[];
}

export interface ReliefOption {
  eligible: boolean;
  reliefType: string;
  name?: string;
  description?: string;
  reasons: string[];
  requirements?: string[];
  timeline?: string;
  estimatedEligibilityDate?: Date;
  difficulty?: 'low' | 'medium' | 'high';
  successLikelihood?: 'high' | 'medium' | 'low' | 'low_without_new_evidence';
  filingFee?: number;
  attorneyRecommended?: boolean;
}

export interface NextStep {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
  resources?: Resource[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'form' | 'guide' | 'attorney_directory' | 'legal_aid' | 'court_info';
  description?: string;
}

// Form state interfaces
export interface FormState {
  currentStep: number;
  jurisdiction: string;
  cases: UserCase[];
  additionalFactors: AdditionalFactors;
  isComplete: boolean;
  lastSaved: Date;
}

export interface AdditionalFactors {
  hasOpenCases: boolean;
  isTraffickingVictim: boolean;
  seekingActualInnocence: boolean;
  additionalInfo?: string;
}

// UI state interfaces
export interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export interface ProgressStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

// Content management interfaces
export interface ContentSection {
  id: string;
  title: string;
  content: string;
  lastUpdated: Date;
}

export interface LegalDisclaimer {
  id: string;
  title: string;
  content: string;
  required: boolean;
  placement: 'header' | 'footer' | 'step' | 'results';
}

// Analytics interfaces
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId: string;
}

export interface UsageMetrics {
  completionRate: number;
  averageTimeToComplete: number;
  mostCommonOffenses: string[];
  eligibilityDistribution: Record<string, number>;
  dropoffPoints: Record<string, number>;
}

// Test data interfaces
export interface TestCase {
  name: string;
  description: string;
  userCase: UserCase;
  additionalFactors: AdditionalFactors;
  expectedResult: {
    eligible: boolean;
    reliefType: string;
    reasoning: string[];
  };
}
