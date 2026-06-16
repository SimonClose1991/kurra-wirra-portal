import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetDocument, getGetDocumentQueryKey, useGetCompletions, getGetCompletionsQueryKey, useCreateCompletion } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, FileText, Download, PenTool, Eye, RefreshCw, AlertTriangle } from "lucide-react";
import { DocumentNotes } from "@/components/DocumentNotes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Document() {
  const { documentId } = useParams();
  const id = parseInt(documentId || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const { data: document, isLoading: isLoadingDoc } = useGetDocument(id, { query: { enabled: !!id, queryKey: getGetDocumentQueryKey(id) } });
  const { data: completions, isLoading: isLoadingCompletions } = useGetCompletions();
  
  const createCompletion = useCreateCompletion();

  const isLoading = isLoadingDoc || isLoadingCompletions;

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Document not found</h2>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Find the most recent completion for this document
  const allDocCompletions = completions?.filter(c => c.documentId === id) ?? [];
  const latestCompletion = allDocCompletions.sort((a, b) => b.documentVersion - a.documentVersion)[0];
  const docVersion = (document as any)?.version ?? 1;
  const isSignedAtCurrentVersion = !!latestCompletion && latestCompletion.documentVersion >= docVersion;
  const isSignedAtOldVersion = !!latestCompletion && latestCompletion.documentVersion < docVersion;
  const isSigned = isSignedAtCurrentVersion;
  const requiresSignature = document?.requiresSignature ?? true;

  const handleSign = () => {
    if (!signatureName.trim()) {
      toast({ title: "Name required", description: "Please type your name to sign.", variant: "destructive" });
      return;
    }

    createCompletion.mutate({ data: { documentId: id, signatureName } }, {
      onSuccess: () => {
        toast({ title: "Document Signed", description: "You have successfully signed this document." });
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetCompletionsQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to sign document. Please try again.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <Link href={`/category/${document.categoryId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Category
      </Link>
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{document.title}</h1>
          {document.description && <p className="text-muted-foreground mt-2">{document.description}</p>}
        </div>
        
        {!requiresSignature ? (
          <div className="inline-flex items-center gap-2 bg-muted/60 border rounded-lg px-4 py-3 shrink-0 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            View-only document
          </div>
        ) : isSignedAtCurrentVersion ? (
          <div className="inline-flex flex-col items-end bg-emerald-50 border border-emerald-200 rounded-lg p-4 shrink-0">
            <div className="flex items-center text-emerald-700 font-semibold mb-1">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Signed & Completed
            </div>
            <div className="text-sm text-emerald-600">
              by <span className="font-medium">{latestCompletion!.signatureName}</span>
            </div>
            <div className="text-xs text-emerald-600/80 mt-1">
              on {format(new Date(latestCompletion!.signedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        ) : (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shrink-0" data-testid="btn-mark-read">
                <PenTool className="mr-2 h-5 w-5" />
                {isSignedAtOldVersion ? "Re-sign Updated Document" : "Mark as Read & Sign"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{isSignedAtOldVersion ? "Re-sign Document" : "Sign Document"}</DialogTitle>
                <DialogDescription>
                  {isSignedAtOldVersion
                    ? `This document has been updated. Please re-read and sign the new version (v${docVersion}).`
                    : "I confirm I have read and understood this document."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="name">Type your full name as your signature</Label>
                  <Input
                    id="name"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="John Doe"
                    autoComplete="off"
                    data-testid="input-signature"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSign} disabled={createCompletion.isPending} data-testid="btn-submit-sign">
                  {createCompletion.isPending ? "Signing..." : isSignedAtOldVersion ? "Re-sign & Complete" : "Sign & Complete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isSignedAtOldVersion && requiresSignature && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-medium text-sm">This document has been updated</p>
            <p className="text-xs mt-0.5 text-amber-700">
              You signed version {latestCompletion!.documentVersion} on {format(new Date(latestCompletion!.signedAt), "MMM d, yyyy")}.
              Please read the updated content and re-sign version {docVersion}.
            </p>
          </div>
        </div>
      )}

      <Card className="min-h-[500px] border-muted bg-card overflow-hidden">
        <CardContent className="p-0 h-full flex flex-col">
          {document.content ? (
            <div className="p-8 prose prose-slate dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: document.content.replace(/\n/g, '<br/>') }} />
            </div>
          ) : document.fileUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-muted/10">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-medium mb-2">External Document</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                This document is provided as a file. Please open it to read the contents before signing.
              </p>
              <Button asChild size="lg" variant="secondary">
                <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-5 w-5" />
                  Open {document.fileName || "File"}
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-muted-foreground">
              No content available for this document.
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentNotes documentId={id} />
    </div>
  );
}
