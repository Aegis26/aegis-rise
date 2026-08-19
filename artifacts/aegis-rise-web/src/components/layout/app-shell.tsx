import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { aegisLogo } from "@/lib/brand";
import { getGetCurrentMemberQueryKey, useGetCurrentMember, useLogout } from "@workspace/api-client-react";
import { Shield, Home, User, Settings, LogOut, Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { token, logout, setAuth } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  const { data: memberData, isLoading, isError } = useGetCurrentMember({
    query: {
      enabled: !!token,
      queryKey: getGetCurrentMemberQueryKey(),
      retry: false,
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        logout();
        setLocation("/login");
      }
    }
  });

  // Handle unauthorized response from member fetch
  useEffect(() => {
    if (isError) {
      logout();
      setLocation("/login");
    }
  }, [isError, logout, setLocation]);

  // Update auth context with full member data when loaded
  useEffect(() => {
    if (memberData?.member && token) {
      setAuth(token, {
        id: memberData.member.id,
        name: memberData.member.name,
        email: memberData.member.email,
        role: memberData.member.role as any,
        status: memberData.member.status as any,
      });
    }
  }, [memberData, token, setAuth]);

  if (!token) return null;

  if (isLoading && !memberData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const member = memberData?.member;
  const isAdmin = member?.role === "admin" || member?.role === "super_admin";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const NavLinks = () => (
    <>
      <Link href="/feed" className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" data-testid="nav-feed">
        <Home className="h-5 w-5" />
        <span className="font-medium">Feed</span>
      </Link>
      <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" data-testid="nav-profile">
        <User className="h-5 w-5" />
        <span className="font-medium">Profile</span>
      </Link>
      {isAdmin && (
        <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" data-testid="nav-admin">
          <Settings className="h-5 w-5" />
          <span className="font-medium">Admin</span>
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
          <img src={aegisLogo} alt="Aegis Rise" className="h-6 w-auto" />
          <span>AEGIS RISE</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-card p-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
                <img src={aegisLogo} alt="Aegis Rise" className="h-6 w-auto" />
                <span>AEGIS RISE</span>
              </div>
            </div>
            <nav className="p-4 flex flex-col gap-2">
              <NavLinks />
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 text-primary font-display font-bold text-2xl tracking-tight">
            <img src={aegisLogo} alt="Aegis Rise" className="h-8 w-auto" />
            <span>AEGIS RISE</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-2" data-testid="button-user-menu">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={member?.profilePictureUrl || ""} alt={member?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">{member?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start flex-1 overflow-hidden">
                  <span className="text-sm font-medium truncate w-full text-left">{member?.name}</span>
                  <span className="text-xs text-muted-foreground truncate w-full text-left">{member?.chapter}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer" data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
