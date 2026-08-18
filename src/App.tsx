import { Route, Routes } from 'react-router';
import Contents from './components/Contents';
import Cover from './components/Cover';
import MagazineLayout from './components/MagazineLayout';
import NotFound from './components/NotFound';
import ReviewPage from './components/ReviewPage';

export default function App() {
  return (
    <Routes>
      <Route element={<MagazineLayout />}>
        <Route index element={<Cover />} />
        <Route path="contents" element={<Contents />} />
        <Route path="reviews/:slug" element={<ReviewPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
