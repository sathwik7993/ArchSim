import { describe, expect, it } from 'vitest';
import { buildMessages, parseEvaluation } from './evaluate';

describe('parseEvaluation', () => {
  const valid = JSON.stringify({
    score: 82,
    verdict: 'Solid read-optimized design.',
    requirements: [{ name: 'Low-latency redirects', status: 'met', note: 'Redis cache in front' }],
    strengths: ['Cache-aside on the hot path'],
    issues: [{ severity: 'high', title: 'Single DB', detail: 'PostgreSQL has no replica' }],
    improvements: [{ title: 'Add replicas', detail: 'Scale reads', components: ['POSTGRESQL'] }],
    missingComponents: ['CDN'],
    scalability: 'Fine to 10x with a cache; DB writes are the next limit.',
  });

  it('parses a clean JSON payload', () => {
    const e = parseEvaluation(valid);
    expect(e.score).toBe(82);
    expect(e.requirements[0].status).toBe('met');
    expect(e.issues[0].severity).toBe('high');
    expect(e.improvements[0].components).toEqual(['POSTGRESQL']);
  });

  it('strips <think> reasoning and surrounding prose', () => {
    const wrapped = `<think>Let me analyze...</think>\nHere is the result:\n${valid}\nHope that helps!`;
    const e = parseEvaluation(wrapped);
    expect(e.score).toBe(82);
    expect(e.verdict).toContain('Solid');
  });

  it('handles markdown code fences', () => {
    const fenced = '```json\n' + valid + '\n```';
    expect(parseEvaluation(fenced).score).toBe(82);
  });

  it('clamps score and coerces bad enum values', () => {
    const messy = JSON.stringify({
      score: 250,
      requirements: [{ name: 'X', status: 'wat', note: '' }],
      issues: [{ severity: 'nope', title: 'T', detail: 'd' }],
    });
    const e = parseEvaluation(messy);
    expect(e.score).toBe(100);
    expect(e.requirements[0].status).toBe('partial');
    expect(e.issues[0].severity).toBe('medium');
  });

  it('throws on non-JSON output', () => {
    expect(() => parseEvaluation('I cannot help with that.')).toThrow();
  });
});

describe('buildMessages', () => {
  it('includes the problem, requirements and the design with configs', () => {
    const msgs = buildMessages({
      problemName: 'URL Shortener',
      difficulty: 'Easy',
      summary: 'Shorten URLs',
      functional: ['Redirect fast'],
      nonFunctional: ['Low latency'],
      referenceComponents: ['REDIS', 'POSTGRESQL'],
      nodes: [
        { id: 'n1', type: 'REDIS', label: 'Cache', position: { x: 0, y: 0 }, properties: { maxmemory_mb: 1024 } },
      ],
      links: [],
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    const user = msgs[1].content;
    expect(user).toContain('URL Shortener');
    expect(user).toContain('Redirect fast');
    expect(user).toContain('REDIS "Cache"');
    expect(user).toContain('maxmemory_mb=1024'); // configured values are included
  });

  it('flags an empty canvas', () => {
    const msgs = buildMessages({ nodes: [], links: [] });
    expect(msgs[1].content).toContain('EMPTY');
  });
});
