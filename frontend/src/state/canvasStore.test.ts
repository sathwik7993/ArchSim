import { describe, expect, it } from 'vitest';
import { useCanvasStore } from './canvasStore';

describe('canvasStore', () => {
  it('snaps moved nodes to a 20px grid', () => {
    useCanvasStore.getState().moveNode('node-client', 33, 47);
    const node = useCanvasStore.getState().nodes.find((candidate) => candidate.id === 'node-client');
    expect(node?.position).toEqual({ x: 40, y: 40 });
  });
});

