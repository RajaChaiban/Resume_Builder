import { describe, expect, it } from 'vitest';
import { mapMode } from './region';
import type { CareerNode, CareerProfile, GeoLocation } from './types';

// Minimal node factory — only the fields mapMode reads matter here.
function node(location?: GeoLocation): CareerNode {
  return {
    id: 'x',
    employer: 'e',
    role: 'r',
    start: '2020',
    end: '2021',
    startYear: 2020,
    endYear: 2021,
    location,
    highlights: [],
    skills: [],
    aiRelevance: 0.5,
    era: 'transition',
  };
}

function profileWith(nodes: CareerNode[]): CareerProfile {
  return {
    name: 'n',
    title: 't',
    tagline: 'tl',
    summary: 's',
    links: [],
    skills: [],
    nodes,
    aiEra: { projectedRole: 'p', narrative: 'n', augmentations: [] },
    source: 'sample',
  };
}

const us = (country: string): GeoLocation => ({ city: 'c', country, lat: 39, lng: -98 });
const abroad: GeoLocation = { city: 'Paris', country: 'France', lat: 48.85, lng: 2.35 };

describe('mapMode', () => {
  it('returns "us" when every located role is in the US', () => {
    expect(mapMode(profileWith([node(us('USA')), node(us('USA'))]))).toBe('us');
  });

  it('is case-insensitive and accepts US country spellings', () => {
    expect(mapMode(profileWith([node(us('usa')), node(us('United States'))]))).toBe('us');
  });

  it('returns "globe" when any located role is outside the US', () => {
    expect(mapMode(profileWith([node(us('USA')), node(abroad)]))).toBe('globe');
  });

  it('ignores nodes without a location when deciding US-only', () => {
    expect(mapMode(profileWith([node(us('USA')), node(undefined)]))).toBe('us');
  });

  it('returns "globe" when there are no located roles at all', () => {
    expect(mapMode(profileWith([node(undefined)]))).toBe('globe');
  });

  it('returns "globe" for an empty profile', () => {
    expect(mapMode(profileWith([]))).toBe('globe');
  });
});
