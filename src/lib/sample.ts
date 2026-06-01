// Demo profile shown on load so the experience is alive before any upload.
import type { CareerProfile } from './types';
import { geocode } from './geocode';

export const SAMPLE_PROFILE: CareerProfile = {
  name: 'Ada Vega',
  title: 'Principal AI Engineer',
  tagline: 'Twelve years bending software toward intelligence — and just getting started.',
  summary:
    'Ada turned a physics degree into a career that tracked the rise of modern AI: from ' +
    'crunching telescope data, to shipping recommendation engines, to architecting the ' +
    'agentic systems that now run autonomously across her org. Each move pulled her closer ' +
    'to the frontier.',
  email: 'ada.vega@example.com',
  location: 'San Francisco',
  links: [
    { label: 'LinkedIn', url: 'https://linkedin.com' },
    { label: 'GitHub', url: 'https://github.com' },
  ],
  skills: [
    { name: 'LLMs', level: 0.95, aiAligned: true },
    { name: 'AI Agents', level: 0.9, aiAligned: true },
    { name: 'PyTorch', level: 0.85, aiAligned: true },
    { name: 'MLOps', level: 0.8, aiAligned: true },
    { name: 'Python', level: 0.95, aiAligned: false },
    { name: 'Kubernetes', level: 0.7, aiAligned: false },
    { name: 'Leadership', level: 0.8, aiAligned: false },
    { name: 'Strategy', level: 0.75, aiAligned: false },
  ],
  nodes: [
    {
      id: 'n0',
      employer: 'Cerro Observatory',
      role: 'Research Assistant, Astrophysics',
      start: '2013',
      end: '2015',
      startYear: 2013,
      endYear: 2015,
      location: geocode('Santiago, Chile') ?? { city: 'Santiago', country: 'Chile', lat: -33.45, lng: -70.66 },
      highlights: [
        'Processed terabytes of telescope imaging with early Python pipelines.',
        'First exposure to statistical modeling at scale.',
      ],
      skills: ['Python', 'Data Science'],
      aiRelevance: 0.15,
      era: 'pre-ai',
    },
    {
      id: 'n1',
      employer: 'StreamLayer',
      role: 'Data Engineer',
      start: '2015',
      end: '2018',
      startYear: 2015,
      endYear: 2018,
      location: geocode('Austin, TX'),
      highlights: [
        'Built the batch pipeline behind a 4M-user recommendation feed.',
        'Shipped the first ML model to production for the company.',
      ],
      skills: ['Python', 'SQL', 'Machine Learning', 'AWS'],
      aiRelevance: 0.4,
      era: 'transition',
    },
    {
      id: 'n2',
      employer: 'Northwind AI',
      role: 'Machine Learning Engineer',
      start: '2018',
      end: '2022',
      startYear: 2018,
      endYear: 2022,
      location: geocode('Seattle'),
      highlights: [
        'Led a deep-learning vision team from prototype to 99.2% precision.',
        'Cut inference cost 60% with a custom serving stack.',
      ],
      skills: ['Deep Learning', 'Computer Vision', 'PyTorch', 'MLOps'],
      aiRelevance: 0.75,
      era: 'transition',
    },
    {
      id: 'n3',
      employer: 'Helix Labs',
      role: 'Principal AI Engineer',
      start: '2022',
      end: 'Present',
      startYear: 2022,
      endYear: 2026,
      location: geocode('San Francisco'),
      highlights: [
        'Architected an agentic platform that automates 40% of internal ops.',
        'Drove the org-wide adoption of LLMs and RAG.',
      ],
      skills: ['LLMs', 'AI Agents', 'RAG', 'MLOps'],
      aiRelevance: 0.97,
      era: 'ai-era',
    },
  ],
  aiEra: {
    projectedRole: 'Autonomous Systems Architect',
    narrative:
      'Ada\'s trajectory points to orchestrating fleets of AI agents — designing the systems ' +
      'that design systems, while she sets the goals and guards the guardrails.',
    augmentations: [
      'Commands a swarm of specialized AI agents',
      'Synthesizes a decade of domain data on demand',
      'Native fluency in LLMs & agentic design',
      'Human judgment at machine scale',
    ],
  },
  source: 'sample',
};
