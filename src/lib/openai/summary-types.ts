export type SessionSummary = {
  headline: string;
  key_events: string[];
  promises: string[];
  hypothesis_update: string;
};

export type TranscriptMessage = {
  role: 'student' | 'client';
  content: string;
};

export type GenerateSummaryInput = {
  case: {
    presenting: string;
    background: string;
    personality: string;
    speech_style: string;
    goals_hidden: string;
    insight_level?: string | null;
    defense_style?: string | null;
    register?: string | null;
  };
  transcript: TranscriptMessage[];
  priorSummaries?: SessionSummary[];
  livingFormulation?: {
    presenting?: string;
    hypothesis?: string;
    patterns?: string;
    next_session?: string;
  } | null;
};

export type GenerateSummaryResult = {
  summary: SessionSummary;
  token_count: number;
};
