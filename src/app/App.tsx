import { RouterProvider } from 'react-router-dom';

import AppStage from '@/app/AppStage';
import { router } from '@/app/router';

export default function App() {
  return (
    <AppStage>
      <RouterProvider router={router} />
    </AppStage>
  );
}
