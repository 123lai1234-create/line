import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Broadcasts from "@/pages/broadcasts";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  return (
    <AuthGuard>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/profile" component={Profile} />
          <Route path="/broadcasts" component={Broadcasts} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="*">
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
