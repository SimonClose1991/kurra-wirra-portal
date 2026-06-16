import { Link, useLocation } from "wouter";
import { Show, useClerk, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetMe } from "@workspace/api-client-react";
import { Shield, BookOpen, LayoutDashboard, LogOut, Settings, FileText } from "lucide-react";

export function Navbar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe({ query: { enabled: !!user, queryKey: ["/api/users/me"] } });

  const isAdmin = me?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/kw-logo.jpg`} alt="Kurra-Wirra Logo" className="h-10 w-auto max-w-[120px] object-contain" />
            <span className="hidden font-bold sm:inline-block text-primary">Kurra-Wirra Staff Portal</span>
          </Link>
          
          <Show when="signed-in">
            <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/dashboard" className="transition-colors hover:text-foreground" data-testid="link-nav-dashboard">
                Dashboard
              </Link>
              {isAdmin && (
                <>
                  <Link href="/admin" className="transition-colors hover:text-foreground flex items-center gap-1" data-testid="link-nav-admin">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                  <Link href="/admin/content" className="transition-colors hover:text-foreground flex items-center gap-1" data-testid="link-nav-content">
                    <FileText className="h-4 w-4" />
                    Manage Content
                  </Link>
                </>
              )}
            </nav>
          </Show>
        </div>

        <div className="flex items-center gap-4">
          <Show when="signed-in">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
                      <AvatarFallback>{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.fullName && <p className="font-medium">{user.fullName}</p>}
                      {user.primaryEmailAddress && (
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.primaryEmailAddress.emailAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer w-full flex items-center" data-testid="menu-dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer w-full flex items-center" data-testid="menu-admin">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
                    onClick={() => signOut(() => setLocation("/"))}
                    data-testid="menu-sign-out"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </Show>
        </div>
      </div>
    </header>
  );
}
