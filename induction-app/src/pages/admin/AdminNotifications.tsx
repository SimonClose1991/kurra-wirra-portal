import { useEffect } from "react";
import { Link } from "wouter";
import {
  useGetAdminNotifications,
  useMarkNotificationsSeen,
  type AdminNotificationSubmission,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, FileText } from "lucide-react";

function submitterName(s: AdminNotificationSubmission): string {
  if (s.user) {
    const name = [s.user.firstName, s.user.lastName].filter(Boolean).join(" ");
    return name || s.user.email || "Staff member";
  }
  return "Staff member";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function AdminNotifications() {
  const { data, isLoading } = useGetAdminNotifications();
  const markSeen = useMarkNotificationsSeen();

  // Mark everything seen once when the admin opens this page.
  useEffect(() => {
    if (data && data.submissions.length > 0) {
      markSeen.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.submissions.length]);

  const seenAtCutoffCount = data?.unseenCount ?? 0;
  const submissions = data?.submissions ?? [];

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Bell className="h-7 w-7" /> Notifications
        </h1>
        <p className="text-muted-foreground mt-2">
          Form submissions flagged to notify admins. Newest first.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No notifications yet.</p>
            <p className="text-sm mt-1">
              When staff submit a form that has "Notify admins" turned on, it appears here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((s, idx) => {
            const isNew = idx < seenAtCutoffCount;
            return (
              <Card key={s.id} className={isNew ? "border-primary/40 bg-primary/5" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {s.formTitle}
                        {isNew && <Badge className="ml-1">New</Badge>}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {submitterName(s)} — {formatWhen(s.submittedAt)}
                      </CardDescription>
                    </div>
                    <Link href={`/admin/form/${s.formId}/submissions`}>
                      <Button variant="outline" size="sm">View all</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-md bg-muted/40 p-3 space-y-1 text-sm">
                    {Object.entries(s.data).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">{k}:</span>
                        <span className="break-words">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
