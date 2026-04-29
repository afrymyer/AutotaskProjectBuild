import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initPostHog } from './lib/posthog';
import { PREVIEW_MODE } from './lib/data';
import App from './App';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (PREVIEW_MODE) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Imix Projects] Running in PREVIEW MODE. Auth disabled, dummy data only. ' +
      'Set VITE_CLERK_PUBLISHABLE_KEY in .env.local to switch to production mode.',
  );
} else {
  initPostHog();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const tree = (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {PREVIEW_MODE ? (
      tree
    ) : (
      <ClerkProvider publishableKey={clerkPublishableKey!} afterSignOutUrl="/">
        {tree}
      </ClerkProvider>
    )}
  </React.StrictMode>,
);
