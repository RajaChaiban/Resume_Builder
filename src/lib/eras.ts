// Era palette shared by every renderer (globe, US map, timeline) so a career
// chapter reads the same color wherever it appears.
import type { Era } from './types';

// Earthy "paper" progression: taupe → teal → terracotta. Earliest chapters are
// muted, the present/AI era reads warm.
export const ERA_COLOR: Record<Era, string> = {
  'pre-ai': '#a08e76',
  transition: '#3f8079',
  'ai-era': '#bf6336',
};

// Human-readable labels for the legend.
export const ERA_LABEL: Record<Era, string> = {
  'pre-ai': 'Early career',
  transition: 'Transition',
  'ai-era': 'AI era',
};
