import raw from './system_design_problems.json';
import { classifyTopic, type TopicId } from './topics';
import { buildSolution, type Solution } from './solution';

// ---------------------------------------------------------------------------
// Phase 8 — problem catalog. Loads the imported index, derives a topic + slug
// for each problem, and exposes lookups + the composed solution.
// ---------------------------------------------------------------------------

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface ProblemSource {
  site: string;
  title: string;
  url: string;
  has_written_content: boolean;
}

interface RawProblem {
  name: string;
  difficulty: Difficulty;
  sources: ProblemSource[];
  summary: string;
  note?: string;
}

export interface Problem {
  slug: string;
  name: string;
  difficulty: Difficulty;
  topic: TopicId;
  sources: ProblemSource[];
  summary: string;
  note?: string;
}

interface RawIndex {
  total_problems: number;
  sources: Array<{ site: string; listing_url: string }>;
  problems: RawProblem[];
}

const index = raw as unknown as RawIndex;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[+&/]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Build the catalog, guaranteeing unique slugs even if two names collide.
const seen = new Set<string>();
export const PROBLEMS: Problem[] = index.problems.map((p) => {
  let slug = slugify(p.name);
  if (seen.has(slug)) {
    let i = 2;
    while (seen.has(`${slug}-${i}`)) i += 1;
    slug = `${slug}-${i}`;
  }
  seen.add(slug);
  return {
    slug,
    name: p.name,
    difficulty: p.difficulty,
    topic: classifyTopic(p.name),
    sources: p.sources,
    summary: p.summary,
    note: p.note,
  };
});

export const PROBLEM_BY_SLUG: Record<string, Problem> = Object.fromEntries(
  PROBLEMS.map((p) => [p.slug, p])
);

export function getProblem(slug: string): Problem | undefined {
  return PROBLEM_BY_SLUG[slug];
}

export function getSolution(p: Problem): Solution {
  return buildSolution(p.name, p.topic, p.slug);
}

export const DIFFICULTY_ORDER: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

export const TOTAL_PROBLEMS = PROBLEMS.length;
