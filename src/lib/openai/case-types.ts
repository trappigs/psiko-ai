export type Difficulty = 'easy' | 'medium' | 'hard';

export type GenerateCaseInput = {
  difficulty: Difficulty;
  themeHint?: string;
};

export type GeneratedCase = {
  title: string;
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  goals_hidden: string;
  insight_level: string;
  defense_style: string;
  register: string;
  diagnosis_hint: string | null;
  difficulty: Difficulty;
};

export type GenerateCaseResult = {
  case: GeneratedCase;
  token_count: number;
};
