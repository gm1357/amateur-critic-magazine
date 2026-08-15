// Browser tests mount <App/> directly, never src/main.tsx, so nothing would pull in the
// stylesheet. Without this the suite renders unstyled markup — layout-dependent
// assertions would silently pass against a page that looks nothing like what ships.
import './src/index.css';
