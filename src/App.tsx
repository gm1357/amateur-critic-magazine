import { Route, Routes } from 'react-router';
import Cover from './components/Cover';
import MagazineLayout from './components/MagazineLayout';

export default function App() {
  return (
    <Routes>
      <Route element={<MagazineLayout />}>
        <Route index element={<Cover />} />
      </Route>
    </Routes>
  );
}
