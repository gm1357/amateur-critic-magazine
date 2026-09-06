import { createContext, useContext } from 'react';
import { type Page, pages } from './pages';

// The issue as it has actually been typeset. It is a context rather than a module constant
// because how many leaves an article takes is measured, not declared — so the page a folio
// points at is only known once the magazine has laid itself out.
//
// The default is the untypeset issue, which is what a component rendered outside the
// magazine sees: every article on a single leaf.
const IssueContext = createContext<Page[]>(pages);

export const IssueProvider = IssueContext.Provider;

export function useIssue(): Page[] {
  return useContext(IssueContext);
}
