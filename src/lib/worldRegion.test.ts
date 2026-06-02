import { describe, expect, it } from 'vitest';
import { rolesByCountry } from './worldRegion';
import type { CareerNode, CareerProfile, GeoLocation } from './types';

function node(id: string, location?: GeoLocation): CareerNode {
  return {
    id,
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

const at = (city: string, lat: number, lng: number): GeoLocation => ({ city, lat, lng });

describe('rolesByCountry', () => {
  it('maps coordinates onto the containing atlas country', () => {
    const map = rolesByCountry(
      profileWith([
        node('a', at('San Francisco', 37.7749, -122.4194)),
        node('b', at('Santiago', -33.4489, -70.6693)),
      ]),
    );
    expect([...map.keys()].sort()).toEqual(['Chile', 'United States of America']);
  });

  it('groups multiple roles in the same country together, in order', () => {
    const map = rolesByCountry(
      profileWith([
        node('sea', at('Seattle', 47.6062, -122.3321)),
        node('aus', at('Austin', 30.2672, -97.7431)),
      ]),
    );
    expect(map.get('United States of America')?.map((n) => n.id)).toEqual(['sea', 'aus']);
    expect(map.has('Chile')).toBe(false);
  });

  it('skips roles without a location', () => {
    const map = rolesByCountry(profileWith([node('x'), node('sf', at('SF', 37.77, -122.42))]));
    expect([...map.keys()]).toEqual(['United States of America']);
  });

  it('skips coordinates that fall in no country (mid-ocean)', () => {
    const map = rolesByCountry(profileWith([node('sea', at('Null Island Ocean', 0, -30))]));
    expect(map.size).toBe(0);
  });
});
