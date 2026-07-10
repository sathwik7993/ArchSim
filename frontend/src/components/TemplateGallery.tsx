import React from 'react';
import { TEMPLATES, type Template } from '../data/templates';
import { CanvasThumbnail } from './CanvasThumbnail';

interface Props {
  onClose: () => void;
  onUse: (template: Template) => void;
}

const DIFF_CLASS: Record<Template['difficulty'], string> = {
  Beginner: 'diff-beginner',
  Intermediate: 'diff-intermediate',
  Advanced: 'diff-advanced',
};

export function TemplateGallery({ onClose, onUse }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal template-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-modal-head">
          <div>
            <h2 className="modal-title">Start from a template</h2>
            <p className="template-modal-sub">Load a proven architecture, then run it and make it your own.</p>
          </div>
          <button className="ghost-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <article className="template-card" key={t.id}>
              <div className="template-preview">
                <CanvasThumbnail nodes={t.nodes} links={t.links} />
              </div>
              <div className="template-card-body">
                <div className="template-card-title">
                  <h3>{t.name}</h3>
                  <span className={`diff-badge ${DIFF_CLASS[t.difficulty]}`}>{t.difficulty}</span>
                </div>
                <p className="template-tagline">{t.tagline}</p>
                <div className="template-tags">
                  {t.tags.map((tag) => (
                    <span className="template-tag" key={tag}>{tag}</span>
                  ))}
                </div>
                <button className="primary-btn template-use" onClick={() => onUse(t)}>
                  Use template
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
