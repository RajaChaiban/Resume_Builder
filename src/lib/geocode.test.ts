import { describe, expect, it } from 'vitest';
import { geocode } from './geocode';

describe('geocode', () => {
  it('resolves known US cities with state codes', () => {
    expect(geocode('Gainesville, FL')).toMatchObject({ city: 'Gainesville', state: 'FL', country: 'USA' });
    expect(geocode('Albany, NY')).toMatchObject({ city: 'Albany', state: 'NY', country: 'USA' });
    expect(geocode('Orlando, FL')).toMatchObject({ city: 'Orlando', state: 'FL', country: 'USA' });
  });

  it('does NOT match a city alias inside another word (the "orLAndo" bug)', () => {
    // "Orlando" must never resolve to Los Angeles via the "la" alias.
    expect(geocode('Orlando, FL')?.city).toBe('Orlando');
  });

  it('resolves "Washington, D.C." to DC, not a state mismatch', () => {
    expect(geocode('Washington, D.C.')).toMatchObject({ city: 'Washington', country: 'USA' });
  });

  it('resolves international cities and country codes', () => {
    expect(geocode('Dubai, UAE')).toMatchObject({ city: 'Dubai', country: 'UAE' });
    expect(geocode('Beirut, LB')).toMatchObject({ city: 'Beirut', country: 'Lebanon' });
  });

  it('extracts the real city from a noisy role+location phrase', () => {
    expect(geocode('Vice President of Operations Dubai, UAE')).toMatchObject({ city: 'Dubai', country: 'UAE' });
    expect(geocode('Accountant Beirut, LB')).toMatchObject({ city: 'Beirut', country: 'Lebanon' });
  });

  it('falls back to a state centroid for an unknown US city', () => {
    const g = geocode('Smalltownville, KS');
    expect(g).toMatchObject({ state: 'KS', country: 'USA' });
    expect(g?.lat).toBeTypeOf('number');
  });

  it('returns undefined when there is no recognizable place', () => {
    expect(geocode('Self-employed freelancer')).toBeUndefined();
    expect(geocode(undefined)).toBeUndefined();
  });
});
