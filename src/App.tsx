import { Route, Routes } from 'react-router';
import Cover from './components/Cover';
import MagazineLayout from './components/MagazineLayout';
import ReviewPage from './components/ReviewPage';

export default function App() {
  return (
    <Routes>
      <Route element={<MagazineLayout />}>
        <Route index element={<Cover />} />
        <Route path="reviews/:slug" element={<ReviewPage />} />
      </Route>
    </Routes>
  );
}
