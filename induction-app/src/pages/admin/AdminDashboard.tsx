import { useGetAdminUsers, useGetProgressSummary, useUpdateUserRole, useGetMe, useGetAdminNotifications } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, CheckCircle, Search, Shield, ShieldOff, Bell } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading: isLoadingUsers } = useGetAdminUsers();
  const { data: summary, isLoading: isLoadingSummary } = useGetProgressSummary();
  const { data: me } = useGetMe();
  const { data: notifications } = useGetAdminNotifications();
  const { user: clerkUser } = useUser();
  const updateUserRole = useUpdateUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isLoading = isLoadingUsers || isLoadingSummary;

  const filteredUsers = users?.filter(user => 
    (user.firstName?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (user.lastName?.toLowerCase() || "").includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "staff" : "admin";
    updateUserRole.mutate({ clerkUserId: userId, data: { role: newRole } }, {
      onSuccess: () => {
        toast({ title: "Role Updated", description: `User role changed to ${newRole}` });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
      }
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of staff induction progress and compliance.</p>
        </div>
        {clerkUser && (
          <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Signed in as</p>
            <p className="font-semibold text-primary">
              {clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "—"}
            </p>
            <p className="text-muted-foreground text-xs">
              {clerkUser.primaryEmailAddress?.emailAddress ?? "No email on record"}
            </p>
          </div>
        )}
      </div>

      {(notifications?.unseenCount ?? 0) > 0 && (
        <Link href="/admin/notifications">
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors">
            <div className="relative shrink-0">
              <Bell className="h-5 w-5 text-amber-600" />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {notifications!.unseenCount}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {notifications!.unseenCount} new form{notifications!.unseenCount === 1 ? "" : "s"} submitted
              </p>
              <p className="text-xs text-amber-700">
                Tap to review submissions that need your attention.
              </p>
            </div>
            <span className="text-sm font-medium text-amber-700 shrink-0">Review →</span>
          </div>
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{summary?.totalUsers || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{summary?.totalDocuments || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fully Completed Staff</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-emerald-600">{summary?.fullyCompletedUsers || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Progress</CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2 pt-4">
            <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
            <Input
              type="text"
              placeholder="Search staff by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-staff"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No staff found matching search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers?.map((user) => {
                      const progress = user.totalDocuments > 0 
                        ? Math.round((user.completedCount / user.totalDocuments) * 100) 
                        : 0;
                      const isMe = user.clerkUserId === me?.clerkUserId;
                      const displayEmail = user.email || (isMe ? clerkUser?.primaryEmailAddress?.emailAddress : null);

                      return (
                        <TableRow key={user.clerkUserId} className={isMe ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{user.firstName} {user.lastName}</span>
                              {isMe && <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">You</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {displayEmail || <span className="text-muted-foreground italic text-xs">No email on record</span>}
                          </TableCell>
                          <TableCell>
                            {user.role === 'admin' ? (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">Admin</Badge>
                            ) : (
                              <Badge variant="outline">Staff</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="w-[60px]" />
                              <span className="text-sm font-medium">{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isMe && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleRole(user.clerkUserId, user.role)}
                                  disabled={updateUserRole.isPending}
                                  className={user.role === "admin" ? "text-destructive border-destructive/40 hover:bg-destructive/10" : "text-primary border-primary/40 hover:bg-primary/10"}
                                  data-testid={`btn-toggle-role-${user.clerkUserId}`}
                                >
                                  {user.role === "admin" ? (
                                    <><ShieldOff className="mr-1.5 h-3.5 w-3.5" />Remove Admin</>
                                  ) : (
                                    <><Shield className="mr-1.5 h-3.5 w-3.5" />Make Admin</>
                                  )}
                                </Button>
                              )}
                              <Link href={`/admin/users/${user.clerkUserId}`}>
                                <Button variant="ghost" size="sm" data-testid={`btn-view-user-${user.clerkUserId}`}>
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
