import React, { useState } from 'react';
import { useCanvasStore } from '../state/canvasStore';
import { PALETTE, CATEGORY_COLOR } from '../types/graph';
import type { ComponentCategory } from '../types/graph';
import { Icon, CategoryIcon } from './icons';

export function NodePalette() {
  const addNode = useCanvasStore((state) => state.addNode);
  const connectSequentially = useCanvasStore((state) => state.connectSequentially);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    COMPUTE: true,
    NETWORKING: true,
    DATABASE: true,
  });

  const toggleCategory = (category: ComponentCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const searching = searchTerm.trim().length > 0;
  const filteredPalette = PALETTE.map((cat) => {
    const types = cat.types.filter((t) =>
      t.toLowerCase().replace(/_/g, ' ').includes(searchTerm.toLowerCase())
    );
    return { ...cat, types };
  }).filter((cat) => cat.types.length > 0);

  return (
    <aside className="palette">
      <div className="panel-title">Components</div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search components…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', margin: '0 -2px' }}>
        {filteredPalette.map((group) => {
          const color = CATEGORY_COLOR[group.category];
          const isExpanded = searching || expandedCategories[group.category];

          return (
            <div className="category-group" key={group.category}>
              <div
                className="category-header"
                style={{ ['--cat-color' as string]: color }}
                onClick={() => toggleCategory(group.category)}
              >
                <span className="category-badge">
                  <CategoryIcon category={group.category} size={15} />
                </span>
                <span>{group.label}</span>
                <span className={`category-arrow ${isExpanded ? 'expanded' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </span>
              </div>

              {isExpanded && (
                <div className="category-content">
                  {group.types.map((type) => {
                    const label = type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <button
                        key={type}
                        className="palette-btn"
                        style={{ ['--cat-color' as string]: color }}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/archsim-component', type);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => addNode(type)}
                        title={`Drag onto the canvas, or click to add ${label}`}
                      >
                        <span className="p-icon"><Icon type={type} size={18} /></span>
                        <span>{label}</span>
                        <span className="p-grip" aria-hidden="true">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.6"/><circle cx="8" cy="12" r="1.6"/><circle cx="8" cy="18" r="1.6"/><circle cx="16" cy="6" r="1.6"/><circle cx="16" cy="12" r="1.6"/><circle cx="16" cy="18" r="1.6"/></svg>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '14px', padding: '0 2px' }}>
        <button
          onClick={connectSequentially}
          style={{ width: '100%', justifyContent: 'center' }}
          title="Connect all canvas nodes sequentially based on their list order"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" /></svg>
          Auto-link nodes
        </button>
      </div>
    </aside>
  );
}
