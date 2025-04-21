export type Voice = {
  id: string;
  name: string;
  description?: string;
};

export type Occasion = {
  id: string;
  name: string;
  emoji: string;
  templates: string[];
};

export type AudioState = {
  isGenerating: boolean;
  isPlaying: boolean;
  audioUrl: string | null;
  error: string | null;
};

export type GreetingFormData = {
  message: string;
  occasionId: string;
  voiceId: string;
};

export interface CurrentUser {
  userId: string;
  email: string;
}