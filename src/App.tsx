import { Route, Routes } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import Magazine from './components/Magazine';

// One route, because `src/pages.ts` is the issue's URL contract: it maps a pathname to a
// page, and a pathname it does not recognise is the 404. A route table here would only
// restate that mapping in a second place, and it could never render the pages the URL is
// *not* pointing at — which is most of what the magazine puts on screen.
export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Magazine />} path="*" />
      </Routes>
      <Analytics />
    </>
  );
}
