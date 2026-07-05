import { Link, useLocation } from "wouter";
import { useLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, User, Send, LogOut, Bot } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const { toast } = useToast();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Logged out successfully" });
        setLocation("/login");
      },
      onError: () => {
        toast({ title: "Failed to log out", variant: "destructive" });
      }
    });
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Bot Profile", icon: User },
    { href: "/broadcasts", label: "Broadcasts", icon: Send },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-sidebar flex flex-col p-4 fixed h-full z-10 hidden md:flex">
        <div className="flex items-center gap-3 px-2 mb-8 mt-4">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Bot size={18} />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Command</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border/50 pt-4">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut size={18} className="mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:pl-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <Bot size={14} />
            </div>
            <span className="font-display font-semibold">Command</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={16} />
          </Button>
        </header>

        {/* Mobile Nav */}
        <nav className="md:hidden flex overflow-x-auto border-b border-border bg-sidebar px-2 py-1 gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm whitespace-nowrap ${isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          {children}
        </div>
      </main>
    </div>
  );
}
