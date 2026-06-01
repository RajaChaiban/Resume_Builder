// A curated skills vocabulary. AI-aligned skills are weighted to drive the
// "march into the AI era" scoring across the timeline and globe.

export interface SkillDef {
  name: string;
  aiAligned: boolean;
  aliases?: string[];
}

export const SKILL_VOCAB: SkillDef[] = [
  // --- AI-aligned ---
  { name: 'Machine Learning', aiAligned: true, aliases: ['ml', 'machine-learning'] },
  { name: 'Deep Learning', aiAligned: true, aliases: ['neural networks', 'deep-learning'] },
  { name: 'LLMs', aiAligned: true, aliases: ['large language models', 'gpt', 'llm', 'transformers'] },
  { name: 'Generative AI', aiAligned: true, aliases: ['genai', 'gen ai', 'generative'] },
  { name: 'Prompt Engineering', aiAligned: true, aliases: ['prompting'] },
  { name: 'Computer Vision', aiAligned: true, aliases: ['cv', 'image recognition'] },
  { name: 'NLP', aiAligned: true, aliases: ['natural language processing'] },
  { name: 'Data Science', aiAligned: true, aliases: ['data-science'] },
  { name: 'PyTorch', aiAligned: true },
  { name: 'TensorFlow', aiAligned: true },
  { name: 'MLOps', aiAligned: true },
  { name: 'RAG', aiAligned: true, aliases: ['retrieval augmented generation'] },
  { name: 'Vector Databases', aiAligned: true, aliases: ['vector db', 'embeddings'] },
  { name: 'Reinforcement Learning', aiAligned: true, aliases: ['rl'] },
  { name: 'AI Agents', aiAligned: true, aliases: ['agentic', 'autonomous agents'] },
  // --- General tech ---
  { name: 'Python', aiAligned: false },
  { name: 'JavaScript', aiAligned: false, aliases: ['js'] },
  { name: 'TypeScript', aiAligned: false, aliases: ['ts'] },
  { name: 'React', aiAligned: false, aliases: ['react.js', 'reactjs'] },
  { name: 'Node.js', aiAligned: false, aliases: ['node', 'nodejs'] },
  { name: 'Go', aiAligned: false, aliases: ['golang'] },
  { name: 'Rust', aiAligned: false },
  { name: 'Java', aiAligned: false },
  { name: 'C++', aiAligned: false, aliases: ['cpp'] },
  { name: 'SQL', aiAligned: false },
  { name: 'AWS', aiAligned: false, aliases: ['amazon web services'] },
  { name: 'GCP', aiAligned: false, aliases: ['google cloud'] },
  { name: 'Azure', aiAligned: false },
  { name: 'Kubernetes', aiAligned: false, aliases: ['k8s'] },
  { name: 'Docker', aiAligned: false },
  { name: 'Cloud', aiAligned: false },
  { name: 'DevOps', aiAligned: false },
  // --- Non-tech / transferable ---
  { name: 'Leadership', aiAligned: false },
  { name: 'Product Management', aiAligned: false, aliases: ['product manager', 'pm'] },
  { name: 'Strategy', aiAligned: false },
  { name: 'Marketing', aiAligned: false },
  { name: 'Sales', aiAligned: false },
  { name: 'Design', aiAligned: false, aliases: ['ux', 'ui'] },
  { name: 'Finance', aiAligned: false },
  { name: 'Operations', aiAligned: false },
  { name: 'Project Management', aiAligned: false },
  { name: 'Communication', aiAligned: false },
];

const AI_KEYWORDS = [
  'ai',
  'a.i.',
  'artificial intelligence',
  'machine learning',
  'ml',
  'deep learning',
  'llm',
  'gpt',
  'neural',
  'generative',
  'automation',
  'data scien',
  'model',
  'algorithm',
  'agent',
];

/** Extract recognised skills from a blob of text. */
export function extractSkills(text: string): { name: string; aiAligned: boolean }[] {
  const lower = ` ${text.toLowerCase()} `;
  const found = new Map<string, boolean>();
  for (const def of SKILL_VOCAB) {
    const terms = [def.name.toLowerCase(), ...(def.aliases ?? [])];
    for (const t of terms) {
      const re = new RegExp(`[^a-z0-9+]${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z0-9]`);
      if (re.test(lower)) {
        found.set(def.name, def.aiAligned);
        break;
      }
    }
  }
  return [...found].map(([name, aiAligned]) => ({ name, aiAligned }));
}

/** 0..1 score of how "AI-era" a piece of text reads. */
export function aiScore(text: string): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const k of AI_KEYWORDS) if (lower.includes(k)) hits++;
  return Math.min(1, hits / 5);
}
