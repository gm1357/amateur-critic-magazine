import { useSyncExternalStore } from 'react';
import type { Mode } from './spread';

// Two facing A4 pages need roughly a laptop's width before each one is wide enough to
// read; below that the issue opens one leaf at a time. The mode is read in JS rather than
// only in CSS because the page model needs it too — which pages are on screen, and which
// page a turn lands on, both depend on it.
const SPREAD = '(min-width: 64rem)';

// Module scope, so the store identity never changes between a compiled and an uncompiled
// build of this component.
const media = typeof window === 'undefined' ? undefined : window.matchMedia(SPREAD);

function subscribe(onChange: () => void): () => void {
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

function getSnapshot(): Mode {
  return media?.matches ? 'spread' : 'single';
}

function getServerSnapshot(): Mode {
  return 'single';
}

export function useMode(): Mode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
