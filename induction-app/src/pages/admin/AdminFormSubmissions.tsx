import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetForm, useGetFormSubmissions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Users, Eye, RefreshCw } from "lucide-react";

function SubmissionDetailModal({
  open,
  onClose,
  submission,
  fields,
}: {
  open: boolean;
  onClose: () => void;
  submission: any;
  fields: any[];
}) {
  if (!submission) return null;
  const data = submission.data as Record<string, string>;
  const user = submission.user;
  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.clerkUserId
    : submission.clerkUserId;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-full max-h-[90dvh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg">Submission Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2 overflow-y-auto flex-1 pr-1">
          {/* Staff info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Staff Member</div>
            <div className="font-semibold">{displayName}</div>
            {user?.email && user.email !== displayName && (
              <div className="text-sm text-muted-foreground">{user.email}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              Submitted {new Date(submission.submittedAt).toLocaleDateString("en-AU", {
                weekday: "long", day: "numeric", month: "long", year: "numeric"
              })}
              {" "}at{" "}
              {new Date(submission.submittedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {/* Field answers */}
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">This form has no fields.</p>
          ) : (
            <div className="space-y-3">
              {fields.map((f: any) => {
                const val = data[f.id.toString()];
                const isUpload = f.fieldType === "file_upload";
                const isImage = val && /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(val);
                return (
                  <div key={f.id} className="space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground">{f.label}</div>
                    {val ? (
                      isUpload ? (
                        <div>
                          {isImage ? (
                            <a href={val} target="_blank" rel="noopener noreferrer">
                              <img src={val} alt={f.label} className="max-h-32 rounded border object-cover" />
                            </a>
                          ) : (
                            <a href={val} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                              View uploaded file
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm">{val === "true" ? "Yes" : val === "false" ? "No" : val}</div>
                      )
                    ) : (
                      <div className="text-sm italic text-muted-foreground">Not answered</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminFormSubmissions() {
  const { formId } = useParams();
  const id = Number(formId);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  const { data: form, isLoading: isLoadingForm } = useGetForm(id);
  const { data: submissions, isLoading: isLoadingSubs } = useGetFormSubmissions(id);

  const isLoading = isLoadingForm || isLoadingSubs;

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 text-center py-12">
        <h2 className="text-xl font-bold">Form not found</h2>
        <Link href="/admin/content"><Button className="mt-4">Back</Button></Link>
      </div>
    );
  }

  const fields = ((form as any).fields ?? []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const subs = (submissions ?? []).slice().sort((a: any, b: any) =>
    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      <Link href="/admin/content" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Content
      </Link>

      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-full">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-primary">{form.title}</h1>
            {form.isRepeatable && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <RefreshCw className="mr-1 h-3 w-3" />
                Repeatable
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {subs.length} {subs.length === 1 ? "submission" : "submissions"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Responses</CardTitle>
          {subs.length === 0 && (
            <CardDescription>No one has submitted this form yet.</CardDescription>
          )}
        </CardHeader>
        {subs.length > 0 && (
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Submitted</TableHead>
                    {/* Show first 2 fields as a preview column */}
                    {fields.slice(0, 2).map((f: any) => (
                      <TableHead key={f.id} className="hidden sm:table-cell">{f.label}</TableHead>
                    ))}
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map((sub: any) => {
                    const data = sub.data as Record<string, string>;
                    const user = sub.user;
                    const displayName = user
                      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.clerkUserId
                      : sub.clerkUserId;

                    return (
                      <TableRow
                        key={sub.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedSub(sub)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{displayName}</div>
                            {user?.email && user.email !== displayName && (
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(sub.submittedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </TableCell>
                        {fields.slice(0, 2).map((f: any) => (
                          <TableCell key={f.id} className="text-sm max-w-48 truncate hidden sm:table-cell">
                            {data[f.id.toString()] || <span className="italic text-muted-foreground">—</span>}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={e => { e.stopPropagation(); setSelectedSub(sub); }}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex gap-3">
        <Link href={`/admin/form/${id}/edit`}>
          <Button variant="outline">Edit Form</Button>
        </Link>
      </div>

      <SubmissionDetailModal
        open={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        submission={selectedSub}
        fields={fields}
      />
    </div>
  );
}
