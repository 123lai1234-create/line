import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// 各頁拆包:首屏只載登入頁,登入後才按需載 dashboard/profile/broadcasts。
const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Profile = lazy(() => import("@/pages/profile"));
const Broadcasts = lazy(() => import("@/pages/broadcasts"));
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  return (
    <AuthGuard>
      <Layout>
        <Suspense fallback={null}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/profile" component={Profile} />
            <Route path="/broadcasts" component={Broadcasts} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </Layout>
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <Suspense fallback={null}>
          <Login />
        </Suspense>
      </Route>
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
