import { useParams, Link } from "wouter";
import { useGetCategories, useGetDocuments, useGetCompletions, useGetForms, useGetMyFormSubmission, useGetCategoryNotes, useUpsertCategoryNote, useUpdateCategoryNote, useDeleteCategoryNote, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, CheckCircle2, ChevronRight, ClipboardList, ClipboardCheck, MessageSquare, Eye, EyeOff, Save, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function FormCard({ formId, categoryId }: { formId: number; categoryId: number }) {
  const { data: forms } = useGetForms({ categoryId });
  const form = forms?.find(f => f.id === formId);
  const { data: mySubmission } = useGetMyFormSubmission(formId);

  if (!form) return null;

  const isRepeatable = form.isRepeatable;
  // For repeatable forms, never show as "completed" — always ready to submit again
  const submitted = !isRepeatable && !!mySubmission;

  return (
    <Card className={`transition-colors hover:bg-muted/50 ${submitted ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center p-4 gap-4">
        <div className={`p-3 rounded-full shrink-0 self-start sm:self-center ${submitted ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700'}`}>
          {submitted ? <ClipboardCheck className="h-6 w-6" /> : isRepeatable ? <RefreshCw className="h-6 w-6" /> : <ClipboardList className="h-6 w-6" />}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg">{form.title}</h3>
            {submitted ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Submitted</Badge>
            ) : isRepeatable ? (
              <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200">
                <RefreshCw className="mr-1 h-3 w-3" />
                Repeatable Report
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200">Form to Fill</Badge>
            )}
          </div>
          {form.description && <p className="text-sm text-muted-foreground line-clamp-1">{form.description}</p>}
          {isRepeatable && mySubmission && (
            <p className="text-xs text-muted-foreground">
              Last submitted {new Date(mySubmission.submittedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="shrink-0 pt-2 sm:pt-0">
          <Link href={`/form/${form.id}`}>
            <Button variant={submitted ? "outline" : "default"} className={!submitted ? "bg-amber-600 hover:bg-amber-700" : ""}>
              {submitted ? "View Response" : isRepeatable ? "Submit Report" : "Fill In Form"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function CategoryNotes({ categoryId, isAdmin, myClerkUserId }: { categoryId: number; isAdmin: boolean; myClerkUserId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useGetCategoryNotes(categoryId);

  const upsert = useUpsertCategoryNote();
  const updateNote = useUpdateCategoryNote();
  const deleteNote = useDeleteCategoryNote();

  const myStaffNote = notes?.find(n => n.clerkUserId === myClerkUserId && !n.isAdminNote);
  const myAdminNote = notes?.find(n => n.clerkUserId === myClerkUserId && n.isAdminNote);
  const otherStaffNotes = notes?.filter(n => n.clerkUserId !== myClerkUserId && !n.isAdminNote) ?? [];
  const visibleAdminNotes = notes?.filter(n => n.isAdminNote && n.clerkUserId !== myClerkUserId) ?? [];

  const [staffDraft, setStaffDraft] = useState("");
  const [adminDraft, setAdminDraft] = useState("");
  const [adminVisible, setAdminVisible] = useState(true);

  useEffect(() => {
    if (myStaffNote) setStaffDraft(myStaffNote.content);
  }, [myStaffNote?.id]);

  useEffect(() => {
    if (myAdminNote) {
      setAdminDraft(myAdminNote.content);
      setAdminVisible(myAdminNote.isVisibleToStaff);
    }
  }, [myAdminNote?.id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}/notes`] });

  const saveStaffNote = () => {
    if (!staffDraft.trim()) return;
    upsert.mutate({ id: categoryId, data: { content: staffDraft.trim(), isAdminNote: false } }, {
      onSuccess: () => { invalidate(); toast({ title: "Note saved" }); },
      onError: () => toast({ title: "Failed to save note", variant: "destructive" }),
    });
  };

  const saveAdminNote = () => {
    if (!adminDraft.trim()) return;
    upsert.mutate({ id: categoryId, data: { content: adminDraft.trim(), isAdminNote: true, isVisibleToStaff: adminVisible } }, {
      onSuccess: () => { invalidate(); toast({ title: "Admin note saved" }); },
      onError: () => toast({ title: "Failed to save admin note", variant: "destructive" }),
    });
  };

  const toggleVisibility = (noteId: number, current: boolean) => {
    updateNote.mutate({ id: categoryId, noteId, data: { isVisibleToStaff: !current } }, {
      onSuccess: () => { invalidate(); toast({ title: `Note ${!current ? "visible to" : "hidden from"} staff` }); },
    });
  };

  const handleDelete = (noteId: number) => {
    if (!confirm("Delete this note?")) return;
    deleteNote.mutate({ id: categoryId, noteId }, {
      onSuccess: () => { invalidate(); toast({ title: "Note deleted" }); },
    });
  };

  if (isLoading) return null;

  return (
    <div className="space-y-4 mt-8 pt-8 border-t">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-primary">Notes</h2>
      </div>

      {/* Staff personal note — every user gets their own */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Your Notes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Record your experience, observations, or anything relevant to this category.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={staffDraft}
            onChange={e => setStaffDraft(e.target.value)}
            placeholder="e.g. I have operated chainsaws for 5 years, completed basic safety training in 2022..."
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveStaffNote} disabled={upsert.isPending || !staffDraft.trim()}>
              <Save className="mr-2 h-3.5 w-3.5" />
              Save Note
            </Button>
            {myStaffNote && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(myStaffNote.id)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visible admin notes for staff */}
      {!isAdmin && visibleAdminNotes.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">From Management</p>
          {visibleAdminNotes.map(note => (
            <Card key={note.id} className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {note.authorName && `— ${note.authorName} · `}
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admin-only section: admin note + all staff notes */}
      {isAdmin && (
        <div className="space-y-4">
          {/* Admin's own admin note */}
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Admin Note for This Category
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setAdminVisible(v => !v)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    adminVisible
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  {adminVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {adminVisible ? "Visible to staff" : "Hidden from staff"}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your admin note on this category. Toggle whether staff can see it.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={adminDraft}
                onChange={e => setAdminDraft(e.target.value)}
                placeholder="e.g. All staff must complete chainsaw training before unsupervised use..."
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveAdminNote} disabled={upsert.isPending || !adminDraft.trim()}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  Save Admin Note
                </Button>
                {myAdminNote && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleVisibility(myAdminNote.id, myAdminNote.isVisibleToStaff)}
                      disabled={updateNote.isPending}
                      className="text-xs"
                    >
                      {myAdminNote.isVisibleToStaff ? <><EyeOff className="mr-1.5 h-3 w-3" />Hide from staff</> : <><Eye className="mr-1.5 h-3 w-3" />Show to staff</>}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(myAdminNote.id)}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Staff notes visible to admin */}
          {otherStaffNotes.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Staff Notes</p>
              {otherStaffNotes.map(note => (
                <Card key={note.id} className="bg-muted/20">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">{note.authorName ?? "Staff member"}</p>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => handleDelete(note.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Other admin notes */}
          {notes?.filter(n => n.isAdminNote && n.clerkUserId !== myClerkUserId).map(note => (
            <Card key={note.id} className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{note.authorName ?? "Admin"}</p>
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Admin Note</Badge>
                        {note.isVisibleToStaff
                          ? <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"><Eye className="mr-1 h-2.5 w-2.5" />Visible</Badge>
                          : <Badge variant="outline" className="text-xs bg-muted text-muted-foreground"><EyeOff className="mr-1 h-2.5 w-2.5" />Hidden</Badge>
                        }
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(note.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => handleDelete(note.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Category() {
  const { categoryId } = useParams();
  const id = parseInt(categoryId || "0", 10);

  const { data: categories, isLoading: isLoadingCategories } = useGetCategories();
  const { data: documents, isLoading: isLoadingDocuments } = useGetDocuments({ categoryId: id });
  const { data: completions, isLoading: isLoadingCompletions } = useGetCompletions();
  const { data: forms, isLoading: isLoadingForms } = useGetForms({ categoryId: id });
  const { data: me } = useGetMe();

  const isAdmin = me?.role === "admin";
  const myClerkUserId = me?.clerkUserId ?? "";

  const isLoading = isLoadingCategories || isLoadingDocuments || isLoadingCompletions || isLoadingForms;

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const category = categories?.find(c => c.id === id);

  if (!category) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Category not found</h2>
          <p className="text-muted-foreground mt-2">The category you are looking for does not exist.</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryDocs = (documents || []).sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryForms = (forms || []).sort((a, b) => a.sortOrder - b.sortOrder);
  const hasContent = categoryDocs.length > 0 || categoryForms.length > 0;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <Link href={`/section/${category.sectionId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Module
      </Link>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        {category.description && <p className="text-muted-foreground mt-2">{category.description}</p>}
      </div>

      <div className="mt-8 space-y-4">
        {!hasContent ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No content in this category yet.</p>
          </div>
        ) : (
          <>
            {/* Forms first */}
            {categoryForms.map(form => (
              <FormCard key={`form-${form.id}`} formId={form.id} categoryId={id} />
            ))}

            {/* Documents */}
            {categoryDocs.map(doc => {
              const completion = completions?.find(c => c.documentId === doc.id);
              const isSigned = !!completion;
              const viewOnly = !doc.requiresSignature;

              const borderColor = viewOnly
                ? 'border-l-4 border-l-muted-foreground/30'
                : isSigned
                  ? 'border-l-4 border-l-emerald-500'
                  : 'border-l-4 border-l-primary';

              return (
                <Card key={`doc-${doc.id}`} className={`transition-colors hover:bg-muted/50 ${borderColor}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center p-4 gap-4">
                    <div className={`p-3 rounded-full shrink-0 self-start sm:self-center ${viewOnly ? 'bg-muted text-muted-foreground' : isSigned ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                      {isSigned && !viewOnly ? <CheckCircle2 className="h-6 w-6" /> : viewOnly ? <Eye className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{doc.title}</h3>
                        {viewOnly ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            <Eye className="mr-1 h-3 w-3" />
                            View only
                          </Badge>
                        ) : isSigned ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Signed</Badge>
                        ) : (
                          <Badge variant="secondary">Required</Badge>
                        )}
                      </div>
                      {doc.description && <p className="text-sm text-muted-foreground line-clamp-1">{doc.description}</p>}
                    </div>
                    <div className="shrink-0 pt-2 sm:pt-0">
                      <Link href={`/document/${doc.id}`}>
                        <Button variant={viewOnly || isSigned ? "outline" : "default"} data-testid={`btn-doc-${doc.id}`}>
                          {viewOnly ? "Open Document" : isSigned ? "View Again" : "Read & Sign"}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {/* Notes section — always shown */}
      {myClerkUserId && (
        <CategoryNotes categoryId={id} isAdmin={isAdmin} myClerkUserId={myClerkUserId} />
      )}
    </div>
  );
}
