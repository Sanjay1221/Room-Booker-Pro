import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { Calendar, LayoutDashboard, LogOut, Lectern, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const { mutate: logout } = useLogout();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  if (isLoading) return null; // Or a global loading spinner

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Book Room", href: "/book", icon: Lectern },
    { label: "My Bookings", href: "/bookings", icon: Calendar },
    ...(user?.isAdmin ? [{ label: "Admin Panel", href: "/admin", icon: User }] : []),
  ];

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-primary">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              {/* Lectern icon placeholder */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-primary"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" x2="20" y1="8" y2="14" />
                <line x1="23" x2="17" y1="11" y2="11" />
              </svg>
            </div>
            <span>MeetSpace</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {user && navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                    isActive(item.href) ? "text-primary font-semibold" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>

          {/* User Profile / Auth Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="text-muted-foreground mr-2"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs text-muted-foreground">{user.isAdmin ? "Administrator" : "Team Member"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">Log In</Button>
                </Link>
                <Link href="/register">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t p-4 bg-background animate-in slide-in-from-top-5">
            <nav className="flex flex-col gap-4">
              {user && navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={cn(
                    "flex items-center gap-3 p-2 rounded-md",
                    isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}>
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </div>
                </Link>
              ))}
              <div className="h-px bg-border my-2" />
              {user ? (
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 p-2 text-destructive font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Log In</Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </div>
              )}
              <div className="h-px bg-border mt-2 mb-1" />
              <button
                onClick={() => {
                  setTheme(theme === "light" ? "dark" : "light");
                  setIsMobileMenuOpen(false);
                }}
                className="flex justify-between items-center p-2 text-muted-foreground font-medium"
              >
                <span>Switch Theme</span>
                {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container px-4 sm:px-8 py-8 animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}
