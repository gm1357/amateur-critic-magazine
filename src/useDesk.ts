import { useState } from 'react';
import { type Desk, parseDesk } from './desk';

const KEY = 'desk';

// Storage throws in a private window or with site data blocked. The desk is a convenience,
// so a reader without storage simply gets the default each visit.
function stored(): Desk {
  try {
    return parseDesk(localStorage.getItem(KEY));
  } catch {
    return parseDesk(null);
  }
}

export function useDesk(): [Desk, (desk: Desk) => void] {
  const [desk, setDesk] = useState(stored);

  function choose(next: Desk) {
    setDesk(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Still the desk for this visit; it just is not remembered.
    }
  }

  return [desk, choose];
}
