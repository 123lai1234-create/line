import { Link, useLocation } from "wouter";
import { useLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, User, Send, LogOut, Bot, Menu, X } from "lucide-react";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "已成功登出" });
        setLocation("/login");
      },
      onError: () => {
        toast({ title: "登出失敗", variant: "destructive" });
      }
    });
  };

  const navItems = [
    { href: "/", label: "數據總覽", icon: LayoutDashboard },
    { href: "/profile", label: "機器人設定", icon: User },
    { href: "/broadcasts", label: "推播訊息", icon: Send },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20 font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-sidebar flex-col p-6 fixed h-full z-20 hidden md:flex">
        <div className="flex items-center gap-3 mb-10 mt-2">
          <div className="w-9 h-9 rounded-sm bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Bot size={20} />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">控制中心</span>
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3.5 py-3 rounded-md transition-all font-medium text-sm ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <item.icon size={18} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border/50 pt-6">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" onClick={handleLogout}>
            <LogOut size={18} className="mr-3" />
            登出
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Nav */}
      <div className="md:hidden flex flex-col w-full fixed top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <header className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Bot size={16} />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">控制中心</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </header>

        {/* Mobile Menu Expansion */}
        {mobileMenuOpen && (
          <nav className="flex flex-col p-4 border-t border-border/50 bg-background animate-in slide-in-from-top-2 duration-200">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-md transition-colors font-medium text-sm mb-1 ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground mt-4 border-t border-border/50 pt-4 rounded-none" onClick={handleLogout}>
              <LogOut size={18} className="mr-3" />
              登出
            </Button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:pl-64 pt-[72px] md:pt-0">
        <div className="p-6 md:p-12 max-w-5xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          {children}
        </div>
      </main>
    </div>
  );
}
