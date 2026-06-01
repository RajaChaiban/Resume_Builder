// Era palette shared by every renderer (globe, US map, timeline) so a career
// chapter reads the same color wherever it appears.
import type { Era } from './types';

export const ERA_COLOR: Record<Era, string> = {
  'pre-ai': '#64748b',
  transition: '#38bdf8',
  'ai-era': '#a855f7',
};
