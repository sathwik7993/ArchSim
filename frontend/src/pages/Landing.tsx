import React from 'react';
import { Link } from 'react-router-dom';
import { HeroDiagram } from '../components/HeroDiagram';
import { AccountMenu } from '../components/AccountMenu';
import { useCanvasStore } from '../state/canvasStore';

// Small concept icons for the feature grid (stroke-based, inherit currentColor).
const S = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

interface Feature {
  icon: React.ReactNode;
  title: string;
  body: string;
  tag?: string;
}

const FEATURES: Feature[] = [
  {
    icon: S('M3 3h18v18H3z|M3 9h18|M9 21V9'),
    title: 'Infinite design canvas',
    body: '34 real component types — compute, networking, databases, caches, messaging, Kubernetes — drag, connect and configure on a pannable dot grid.',
  },
  {
    icon: S('M13 2L3 14h7l-1 8 10-12h-7z'),
    title: 'Live traffic simulation',
    body: 'Send requests through your design and watch packets flow. Every component has a real capacity, so load drives CPU, queueing and error rates.',
  },
  {
    icon: S('M12 3a9 9 0 109 9|M12 12l4-2|M12 7v5'),
    title: 'Realistic mechanics',
    body: 'Cache hit ratios, DB connection pools and replication lag, Kafka consumer lag, IOPS, rate limits — a cache in front of a database visibly offloads it.',
  },
  {
    icon: S('M3 12h4l3 8 4-16 3 8h4'),
    title: 'Interactive diagnostics',
    body: 'Scrub a timeline, scale traffic live, inject chaos (CPU spike, memory leak, packet loss, node kill) and read the distributed-trace latency waterfall.',
  },
  {
    icon: S('M12 3l2.2 5.6L20 9l-4.5 3.9L17 19l-5-3.2L7 19l1.5-6.1L4 9l5.8-.4z'),
    title: 'AI design evaluation',
    body: 'Bring your own free Google Gemini key and get a scored review of your architecture — bottlenecks, single points of failure and missing pieces.',
  },
  {
    icon: S('M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z'),
    title: 'Templates & interview practice',
    body: 'Load proven blueprints and practice 148 real system-design interview problems — attempt each on the canvas first, then unlock a guided, edge-case-aware solution.',
  },
];

interface Step { n: string; title: string; body: string; }
const STEPS: Step[] = [
  { n: '01', title: 'Design', body: 'Drop components onto the canvas and wire them together.' },
  { n: '02', title: 'Simulate', body: 'Run traffic and watch it flow against real capacity limits.' },
  { n: '03', title: 'Diagnose', body: 'Inject chaos and trace latency to find the bottleneck.' },
  { n: '04', title: 'Evaluate', body: 'Get AI feedback and iterate toward a stronger design.' },
];

export function Landing() {
  const theme = useCanvasStore((s) => s.theme);
  const toggleTheme = useCanvasStore((s) => s.toggleTheme);

  return (
    <div className="landing">
      <a className="skip-link" href="#lp-main">Skip to content</a>

      <header className="lp-nav">
        <div className="topbar-brand">
          <span className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          </span>
          <strong>ArchSim</strong>
        </div>
        <nav className="lp-nav-links" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <Link to="/problems">Practice</Link>
          <button className="ghost-btn" onClick={toggleTheme} aria-label="Toggle colour theme" title="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <AccountMenu />
          <Link className="primary-btn" to="/dashboard">Open workbench</Link>
        </nav>
      </header>

      <main id="lp-main">
        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">Distributed-systems simulator</span>
            <h1 className="lp-title">
              Design systems that <span className="grad-text">behave like the real thing.</span>
            </h1>
            <p className="lp-lede">
              ArchSim is an interactive workbench where you sketch an architecture, send live traffic
              through it, and watch every component respond under load — capacity limits, cascading
              failures, latency and all. Built for engineers and students learning system design.
            </p>
            <div className="lp-cta-row">
              <Link className="primary-btn lp-cta" to="/dashboard">Start designing — it's free</Link>
              <a className="ghost-btn lp-cta" href="#how">See how it works</a>
            </div>
            <p className="lp-trust">Runs entirely in your browser · No signup · Saves locally</p>
          </div>
          <div className="lp-hero-visual" aria-hidden="false">
            <div className="lp-hero-glow" aria-hidden="true" />
            <HeroDiagram />
            <span className="lp-hero-caption">Live request flow · steady-state simulation</span>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="lp-section" id="features">
          <div className="lp-section-head">
            <h2>Everything you need to reason about scale</h2>
            <p>A design tool and a simulator in one — so you can test an idea instead of just drawing it.</p>
          </div>
          <div className="lp-feature-grid">
            {FEATURES.map((f) => (
              <article className="lp-feature" key={f.title}>
                <span className="lp-feature-icon">{f.icon}</span>
                <h3>
                  {f.title}
                  {f.tag && <span className="lp-badge">{f.tag}</span>}
                </h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lp-section lp-how" id="how">
          <div className="lp-section-head">
            <h2>From blank canvas to battle-tested in four steps</h2>
          </div>
          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li className="lp-step" key={s.n}>
                <span className="lp-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Closing CTA ── */}
        <section className="lp-cta-band">
          <div className="lp-cta-inner">
            <h2>Ready to design your first system?</h2>
            <p>Open the workbench and drop your first component in seconds.</p>
            <Link className="primary-btn lp-cta" to="/dashboard">Open the workbench</Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="topbar-brand">
          <span className="brand-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          </span>
          <strong>ArchSim</strong>
        </div>
        <p className="lp-foot-note">A system-design simulation workbench.</p>
      </footer>
    </div>
  );
}
