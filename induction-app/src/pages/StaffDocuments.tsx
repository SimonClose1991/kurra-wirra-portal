import { useRef, useState } from "react";
import { Link } from "wouter";
import { useGetStaffDocuments, useCreateStaffDocument, useDeleteStaffDocument } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Upload, FileText, Image, Trash2, Loader2, Plus, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function StaffDocuments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [pendingUpload, setPendingUpload] = useState<{ objectPath: string; fileUrl: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: docs, isLoading } = useGetStaffDocuments({});
  const createDoc = useCreateStaffDocument();
  const deleteDoc = useDeleteStaffDocument();

  const { uploadFile, progress } = useUpload({
    basePath: `${basePath}/api/storage`,
    onSuccess: (response) => {
      setPendingUpload({
        objectPath: response.objectPath,
        fileUrl: `${basePath}/api/storage${response.objectPath}`,
      });
      setIsUploading(false);
    },
    onError: (err) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setIsUploading(false);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!docTitle.trim()) {
      toast({ title: "Please enter a title first", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    await uploadFile(file);
  };

  const handleSave = () => {
    if (!docTitle.trim() || !pendingUpload) return;
    createDoc.mutate({
      data: {
        title: docTitle.trim(),
        objectPath: pendingUpload.objectPath,
        fileUrl: pendingUpload.fileUrl,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Document uploaded successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/staff-documents"] });
        setUploadDialogOpen(false);
        setDocTitle("");
        setPendingUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteDoc.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Document removed" });
        queryClient.invalidateQueries({ queryKey: ["/api/staff-documents"] });
      },
    });
  };

  const openDialog = () => {
    setDocTitle("");
    setPendingUpload(null);
    setUploadDialogOpen(true);
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(url);

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload copies of your licences, certificates, and other personal documents.</p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !docs || docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground">Upload photos of your driver's licence, certificates, and other documents.</p>
            <Button variant="outline" onClick={openDialog} className="mt-2">
              <Upload className="mr-2 h-4 w-4" />
              Upload your first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg border bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
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
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleteDoc.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Document Title</Label>
              <Input
                id="doc-title"
                placeholder="e.g. Driver's Licence, First Aid Certificate"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              {pendingUpload ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5 border-primary/20">
                  <Image className="h-6 w-6 text-primary shrink-0" />
                  <p className="text-sm text-primary font-medium flex-1">File ready to save</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setPendingUpload(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                    Change
                  </Button>
                </div>
              ) : isUploading ? (
                <div className="p-4 border rounded-lg text-center space-y-2">
                  <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                  <p className="text-sm">Uploading... {progress}%</p>
                </div>
              ) : (
                <div
                  onClick={() => docTitle.trim() ? fileInputRef.current?.click() : toast({ title: "Enter a title first", variant: "destructive" })}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to select a file</p>
                  <p className="text-xs text-muted-foreground mt-1">Photos, PDFs, and other documents accepted</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!pendingUpload || !docTitle.trim() || createDoc.isPending}
            >
              {createDoc.isPending ? "Saving..." : "Save Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
