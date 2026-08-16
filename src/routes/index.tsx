import { createBrowserRouter } from 'react-router-dom';
import HomePage from '@/pages/Home/index';
import NotFoundPage from '@/pages/NotFound/index';
import Layout from '@/components/Layout';

/**
 * Router Configuration
 *
 * AI Agent Usage Guide:
 * 1. Add new page routes here (before the 404 route)
 * 2. Use lazy() for code splitting
 * 3. Wrap all lazy-loaded components with <Lazy>
 * 4. The 404 route must be last (path: '*')
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // AI Agent: Add new page routes here
      {
        path: '/',
        element: <HomePage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
], { basename: '/extremedemonarchive/' }); // <--- AQUÍ SE AGREGÓ EL BASENAME