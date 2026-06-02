import { describe, expect, it } from 'vitest';
import { extractProfile } from './extract';
import { INTL_RESUME, GS_RESUME } from './__fixtures__/resumes';

describe('extractProfile — international resume', () => {
  const p = extractProfile(INTL_RESUME);

  it('finds all four jobs', () => {
    expect(p.nodes).toHaveLength(4);
  });

  it('locates every job (no dropped roles)', () => {
    expect(p.nodes.every((n) => n.location)).toBe(true);
  });

  it('maps the international countries, not just the US one', () => {
    const countries = new Set(p.nodes.map((n) => n.location?.country));
    expect(countries).toContain('Lebanon');
    expect(countries).toContain('UAE');
    expect(countries).toContain('USA');
  });

  it('pairs employer + role + city correctly', () => {
    const byEmployer = Object.fromEntries(p.nodes.map((n) => [n.employer, n.location?.city]));
    expect(byEmployer['RentLevy']).toBe('Dubai');
    expect(byEmployer['Chedid Capital Holding/Ascoma']).toBe('Beirut');
  });
});

describe('extractProfile — all-US resume', () => {
  const p = extractProfile(GS_RESUME);

  it('finds all three jobs and locates each', () => {
    expect(p.nodes).toHaveLength(3);
    expect(p.nodes.every((n) => n.location)).toBe(true);
  });

  it('maps every distinct state worked in', () => {
    const cities = new Set(p.nodes.map((n) => n.location?.city));
    expect(cities).toContain('Albany');
    expect(cities).toContain('Orlando');
    expect(cities).toContain('Gainesville');
  });

  it('does not turn the education entry into a job', () => {
    expect(p.nodes.some((n) => /master of science/i.test(n.role))).toBe(false);
  });
});
