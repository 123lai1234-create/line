import { useGetAuthStatus } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: auth, isLoading, isError } = useGetAuthStatus();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!auth?.authenticated || isError)) {
      setLocation("/login");
    }
  }, [auth, isLoading, isError, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!auth?.authenticated || isError) {
    return null;
  }

  return <>{children}</>;
}
