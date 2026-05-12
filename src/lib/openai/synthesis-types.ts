import type { SessionSummary } from './summary-types';

export type SeriesSynthesis = {
  summary: string;
  arc: string;
  themes: string[];
  growth: string[];
  missed_opportunities: string[];
  next_steps: string;
};

export type CaseProfileLite = {
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  goals_hidden: string;
};

export type FormulationLite = {
  presenting?: string;
  hypothesis?: string;
  patterns?: string;
  next_session?: string;
};

export type GenerateSynthesisInput = {
  case: CaseProfileLite;
  sessionCount: number;
  sessionSummaries: SessionSummary[];
  livingFormulation?: FormulationLite | null;
  closingReflection?: string;
};

export type GenerateSynthesisResult = {
  synthesis: SeriesSynthesis;
  token_count: number;
};
