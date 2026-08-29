import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { AuthProvider, useAuth } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import NotFound from '@/pages/not-found';
import Login from '@/pages/login';
import Signup from '@/pages/signup';
import ForgotPassword from '@/pages/forgot-password';
import ResetPassword from '@/pages/reset-password';
import Privacy from '@/pages/privacy';
import Feed from '@/pages/feed';
import Profile from '@/pages/profile';
import PublicProfile from '@/pages/public-profile';
import Admin from '@/pages/admin';

const queryClient = new QueryClient();

// A wrapper to enforce AppShell for authenticated routes
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return null; // Or a loading spinner
  }
  
  // AppShell also does a token check and redirect, but we can do a quick check here too
  
  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

function RootRedirect() {
  const [, setLocation] = useLocation();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      setLocation(token ? "/feed" : "/login");
    }
  }, [isLoading, setLocation, token]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/privacy" component={Privacy} />
        
        {/* Protected Routes inside AppShell */}
        <Route path="/feed">
          <ProtectedRoute component={Feed} />
        </Route>
        <Route path="/profile/settings">
          <ProtectedRoute component={Profile} />
        </Route>
        <Route path="/profile">
          <ProtectedRoute component={Profile} />
        </Route>
        <Route path="/members/:memberId">
          {(params) => (
            <ProtectedRoute component={() => <PublicProfile memberId={params.memberId} />} />
          )}
        </Route>
        <Route path="/admin">
          <ProtectedRoute component={Admin} />
        </Route>
        
        {/* Redirect root to feed or login */}
        <Route path="/" component={RootRedirect} />
        
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
