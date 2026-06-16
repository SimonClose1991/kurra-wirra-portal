import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetAdminUsers, useGetDocuments, useGetCategories, useGetSections, useGetStaffDocuments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, XCircle, Clock, FileText, ExternalLink, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

export default function AdminUser() {
  const { clerkUserId } = useParams();
  const [activeTab, setActiveTab] = useState<"progress" | "staff-docs">("progress");
  const [previewDoc, setPreviewDoc] = useState<{ title: string; fileUrl: string } | null>(null);

  const { data: users, isLoading: isLoadingUsers } = useGetAdminUsers();
  const { data: documents, isLoading: isLoadingDocs } = useGetDocuments();
  const { data: categories, isLoading: isLoadingCats } = useGetCategories();
  const { data: sections, isLoading: isLoadingSections } = useGetSections();
  const { data: staffDocs, isLoading: isLoadingStaffDocs } = useGetStaffDocuments({ clerkUserId: clerkUserId! });

  const isLoading = isLoadingUsers || isLoadingDocs || isLoadingCats || isLoadingSections;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const user = users?.find(u => u.clerkUserId === clerkUserId);

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h2 className="text-2xl font-bold">User not found</h2>
        <Link href="/admin"><span className="text-primary hover:underline mt-4 inline-block">Back to Admin</span></Link>
      </div>
    );
  }

  const overallProgress = user.totalDocuments > 0
    ? Math.round((user.completedCount / user.totalDocuments) * 100)
    : 0;

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(url);
  const isPdf = (url: string) => /\.pdf$/i.test(url);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Link href="/admin" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Link>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <CardTitle className="text-2xl">{user.firstName} {user.lastName}</CardTitle>
              <p className="text-muted-foreground mt-1">{user.email}</p>
              <div className="mt-2">
                <Badge variant={user.role === 'admin' ? "default" : "secondary"}>
                  {user.role === 'admin' ? 'Admin' : 'Staff'}
                </Badge>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Completion</span>
                <span className="font-bold">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2 text-right">
                {user.completedCount} of {user.totalDocuments} docs signed (current version)
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("progress")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "progress" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Document Progress
        </button>
        <button
          onClick={() => setActiveTab("staff-docs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "staff-docs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Personal Documents
          {staffDocs && staffDocs.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">{staffDocs.length}</Badge>
          )}
        </button>
      </div>

      {activeTab === "progress" && (
        <div className="space-y-8">
          {sections?.map(section => {
            const sectionCats = categories?.filter(c => c.sectionId === section.id) || [];
            const sectionDocs = documents?.filter(d => sectionCats.some(c => c.id === d.categoryId)) || [];
            if (sectionDocs.length === 0) return null;

            return (
              <div key={section.id} className="space-y-4">
                <h4 className="text-lg font-medium text-primary">{section.name}</h4>
                <div className="grid gap-3">
                  {sectionDocs.map(doc => {
                    const docVersion = (doc as any).version ?? 1;
                    // All completions for this doc (sorted by version desc)
                    const docCompletions = user.completions
                      .filter(c => c.documentId === doc.id)
                      .sort((a, b) => (b as any).documentVersion - (a as any).documentVersion);
                    const latestCompletion = docCompletions[0];
                    const signedVersion = latestCompletion ? (latestCompletion as any).documentVersion : null;
                    const isUpToDate = !!latestCompletion && signedVersion >= docVersion;
                    const isOutdated = !!latestCompletion && signedVersion < docVersion;
                    const isPending = !latestCompletion;

                    return (
                      <Card key={doc.id} className={isUpToDate ? "bg-emerald-50/30 border-emerald-100" : isOutdated ? "bg-amber-50/30 border-amber-100" : ""}>
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            {isUpToDate ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                            ) : isOutdated ? (
                              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground/50 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {categories?.find(c => c.id === doc.categoryId)?.name}
                                {docVersion > 1 && <span className="ml-2 text-xs text-muted-foreground/70">v{docVersion}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm sm:text-right shrink-0 space-y-0.5">
                            {isUpToDate ? (
                              <>
                                <div className="font-medium text-emerald-700">Signed v{signedVersion}</div>
                                <div className="text-muted-foreground text-xs">{format(new Date(latestCompletion.signedAt), "MMM d, yyyy")}</div>
                              </>
                            ) : isOutdated ? (
                              <>
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Needs Re-sign</Badge>
                                <div className="text-muted-foreground text-xs mt-1">Signed v{signedVersion}, current v{docVersion}</div>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "staff-docs" && (
        <div className="space-y-4">
          {isLoadingStaffDocs ? (
            <Skeleton className="h-24 w-full" />
          ) : !staffDocs || staffDocs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No personal documents uploaded yet.</p>
              </CardContent>
            </Card>
          ) : (
            staffDocs.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-lg border bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setPreviewDoc({ title: doc.title, fileUrl: doc.fileUrl })}
                  >
                    {isImage(doc.fileUrl) ? (
                      <img src={doc.fileUrl} alt={doc.title} className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {format(new Date(doc.uploadedAt), "d MMM yyyy")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPreviewDoc({ title: doc.title, fileUrl: doc.fileUrl })}>
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    View
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* File preview modal */}
      <Dialog open={!!previewDoc} onOpenChange={v => { if (!v) setPreviewDoc(null); }}>
        <DialogContent className="max-w-2xl w-full max-h-[90dvh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="truncate pr-8">{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto flex flex-col items-center gap-4 min-h-0">
            {previewDoc && isImage(previewDoc.fileUrl) ? (
              <img
                src={previewDoc.fileUrl}
                alt={previewDoc.title}
                className="max-w-full rounded-lg border object-contain"
              />
            ) : previewDoc && isPdf(previewDoc.fileUrl) ? (
              <iframe
                src={previewDoc.fileUrl}
                title={previewDoc.title}
                className="w-full rounded border"
                style={{ height: "60vh" }}
              />
            ) : previewDoc ? (
              <div className="py-8 text-center space-y-3">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">Preview not available for this file type.</p>
              </div>
            ) : null}
            {previewDoc && (
              <a
                href={previewDoc.fileUrl}
                download
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Download file
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
