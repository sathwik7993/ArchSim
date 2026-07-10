import type { CanvasLink, CanvasNode } from '../types/graph';

// ---------------------------------------------------------------------------
// Phase 9 — AI design evaluation.
//
// Assembles the full context (problem + requirements + reference components,
// the user's actual components WITH their configured values, the connections,
// and any live simulation metrics), asks a Gemini model to grade it against the
// problem, and parses a structured report with concrete improvements.
// ---------------------------------------------------------------------------

export interface ReqCheck {
  name: string;
  status: 'met' | 'partial' | 'missing';
  note: string;
}
export interface Issue {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}
export interface Improvement {
  title: string;
  detail: string;
  components?: string[];
}
export interface Evaluation {
  score: number;
  verdict: string;
  requirements: ReqCheck[];
  strengths: string[];
  issues: Issue[];
  improvements: Improvement[];
  missingComponents: string[];
  scalability: string;
}

interface Message {
  role: 'system' | 'user';
  content: string;
}

export interface EvalContext {
  problemName?: string;
  difficulty?: string;
  summary?: string;
  note?: string;
  functional?: string[];
  nonFunctional?: string[];
  referenceComponents?: string[];
  nodes: CanvasNode[];
  links: CanvasLink[];
  simSummary?: string;
}

function serializeDesign(nodes: CanvasNode[], links: CanvasLink[]): string {
  if (nodes.length === 0) return 'The canvas is EMPTY — the candidate has not placed any components.';
  const label = new Map(nodes.map((n) => [n.id, n.label]));
  const comps = nodes
    .map((n) => {
      const props = Object.entries(n.properties)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      return `- ${n.type} "${n.label}"${props ? ` { ${props} }` : ''}`;
    })
    .join('\n');
  const conns = links.length
    ? links.map((l) => `- ${label.get(l.source) ?? l.source} -> ${label.get(l.target) ?? l.target}`).join('\n')
    : '- (no connections drawn)';
  return `Components (${nodes.length}):\n${comps}\n\nConnections (${links.length}):\n${conns}`;
}

const SCHEMA = `{
  "score": <integer 0-100, how well the design solves THIS problem at scale>,
  "verdict": "<one punchy sentence overall assessment>",
  "requirements": [{"name":"<requirement>","status":"met|partial|missing","note":"<why, referencing their components>"}],
  "strengths": ["<specific good choice they made>"],
  "issues": [{"severity":"high|medium|low","title":"<short>","detail":"<concrete problem in THEIR design, name the component>"}],
  "improvements": [{"title":"<short>","detail":"<specific, actionable change and why it helps>","components":["<ArchSim component types to add, e.g. REDIS, KAFKA>"]}],
  "missingComponents": ["<component types the design should have but doesn't>"],
  "scalability": "<2-3 sentences on how it behaves under 10x load and the first bottleneck>"
}`;

export function buildMessages(ctx: EvalContext): Message[] {
  const system =
    'You are a principal distributed-systems engineer conducting a system-design interview. ' +
    'Evaluate the candidate\'s architecture strictly against the given problem and requirements. ' +
    'Be specific and reference their ACTUAL components and configuration values — never generic. ' +
    'Reward good choices, call out real bottlenecks, single points of failure, missing pieces, and misconfigurations, ' +
    'and give concrete, actionable improvements. ' +
    'Respond with ONLY a single minified JSON object matching this schema, and nothing else (no markdown, no prose, no code fences):\n' +
    SCHEMA;

  const parts: string[] = [];
  if (ctx.problemName) parts.push(`# Problem: ${ctx.problemName}${ctx.difficulty ? ` (${ctx.difficulty})` : ''}`);
  if (ctx.summary) parts.push(`## What to build\n${ctx.summary}`);
  if (ctx.note) parts.push(`Note: ${ctx.note}`);
  if (ctx.functional?.length) parts.push(`## Functional requirements to satisfy\n${ctx.functional.map((f) => `- ${f}`).join('\n')}`);
  if (ctx.nonFunctional?.length) parts.push(`## Non-functional requirements\n${ctx.nonFunctional.map((f) => `- ${f}`).join('\n')}`);
  if (ctx.referenceComponents?.length) parts.push(`## Components a strong solution typically uses\n${ctx.referenceComponents.join(', ')}`);
  parts.push(`# Candidate's design\n${serializeDesign(ctx.nodes, ctx.links)}`);
  if (ctx.simSummary) parts.push(`# Live simulation results\n${ctx.simSummary}`);
  parts.push('Now grade this design. Return ONLY the JSON object.');

  return [
    { role: 'system', content: system },
    { role: 'user', content: parts.join('\n\n') },
  ];
}

function coerceStatus(s: unknown): ReqCheck['status'] {
  return s === 'met' || s === 'partial' || s === 'missing' ? s : 'partial';
}
function coerceSeverity(s: unknown): Issue['severity'] {
  return s === 'high' || s === 'medium' || s === 'low' ? s : 'medium';
}
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

export function parseEvaluation(content: string): Evaluation {
  // Reasoning models (e.g. DeepSeek R1) may wrap thoughts in <think>…</think>.
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('The model did not return a structured result. Try again or pick a different model.');
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error('Could not parse the evaluation. Try again or pick a more capable model.');
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
  return {
    score,
    verdict: typeof raw.verdict === 'string' ? raw.verdict : 'Evaluation complete.',
    requirements: Array.isArray(raw.requirements)
      ? raw.requirements.map((r: any) => ({ name: String(r?.name ?? ''), status: coerceStatus(r?.status), note: String(r?.note ?? '') })).filter((r) => r.name)
      : [],
    strengths: strArr(raw.strengths),
    issues: Array.isArray(raw.issues)
      ? raw.issues.map((i: any) => ({ severity: coerceSeverity(i?.severity), title: String(i?.title ?? ''), detail: String(i?.detail ?? '') })).filter((i) => i.title)
      : [],
    improvements: Array.isArray(raw.improvements)
      ? raw.improvements.map((i: any) => ({ title: String(i?.title ?? ''), detail: String(i?.detail ?? ''), components: strArr(i?.components) })).filter((i) => i.title)
      : [],
    missingComponents: strArr(raw.missingComponents),
    scalability: typeof raw.scalability === 'string' ? raw.scalability : '',
  };
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export async function requestEvaluation(model: string, apiKey: string, messages: Message[]): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Gemini-Api-Key': apiKey },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    // The proxy returns a structured { error: "<human message>" } for every
    // failure — surface that so the user sees the real reason (rate limit,
    // model unavailable, timeout, bad key…).
    let msg = '';
    try {
      const j = (await res.json()) as { error?: string };
      msg = j?.error ?? '';
    } catch {
      /* body wasn't JSON */
    }
    if (!msg) {
      if (res.status === 403 || res.status === 404) {
        msg = 'The evaluation endpoint isn’t available — rebuild & restart the backend (docker compose up --build -d backend).';
      } else if (res.status === 502 || res.status === 504) {
        msg = 'The AI service is unreachable right now. Is the backend running?';
      } else {
        msg = `Evaluation failed (${res.status}).`;
      }
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { content: string };
  return data.content ?? '';
}

export async function evaluateDesign(ctx: EvalContext, model: string, apiKey: string): Promise<Evaluation> {
  const content = await requestEvaluation(model, apiKey, buildMessages(ctx));
  return parseEvaluation(content);
}
