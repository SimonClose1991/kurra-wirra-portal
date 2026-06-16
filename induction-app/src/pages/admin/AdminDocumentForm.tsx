import { useEffect, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetCategories, useGetDocument, getGetDocumentQueryKey, useCreateDocument, useUpdateDocument } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Upload, FileText, X, Loader2, PenTool, Eye, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  description: z.string().optional(),
  fileUrl: z.string().optional().or(z.literal("")),
  fileName: z.string().optional(),
  content: z.string().optional(),
  requiresSignature: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
  bumpVersion: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminDocumentForm() {
  const { documentId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const isEdit = !!documentId;
  const id = isEdit ? parseInt(documentId, 10) : 0;

  const { data: categories } = useGetCategories();
  const { data: document, isLoading } = useGetDocument(id, {
    query: { enabled: isEdit && id > 0, queryKey: getGetDocumentQueryKey(id) }
  });

  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();

  const { uploadFile, isUploading, progress } = useUpload({
    basePath: `${basePath}/api/storage`,
    onSuccess: (response) => {
      const serveUrl = `${basePath}/api/storage${response.objectPath}`;
      form.setValue("fileUrl", serveUrl);
      form.setValue("fileName", response.metadata?.name || uploadedFileName || "uploaded-file.pdf");
      toast({ title: "PDF uploaded successfully" });
    },
    onError: (err) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      categoryId: 0,
      description: "",
      fileUrl: "",
      fileName: "",
      content: "",
      requiresSignature: true,
      sortOrder: 0,
      bumpVersion: false,
    }
  });

  useEffect(() => {
    if (isEdit && document) {
      form.reset({
        title: document.title,
        categoryId: document.categoryId,
        description: document.description || "",
        fileUrl: document.fileUrl || "",
        fileName: document.fileName || "",
        content: document.content || "",
        requiresSignature: document.requiresSignature,
        sortOrder: document.sortOrder,
      });
      if (document.fileName) setUploadedFileName(document.fileName);
    }
  }, [document, isEdit, form]);

  const handleFileDrop = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Only PDF files are supported", variant: "destructive" });
      return;
    }
    setUploadedFileName(file.name);
    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
  };

  const clearUploadedFile = () => {
    setUploadedFileName(null);
    form.setValue("fileUrl", "");
    form.setValue("fileName", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentFileUrl = form.watch("fileUrl");
  const hasUploadedFile = !!currentFileUrl && currentFileUrl.includes("/api/storage/");

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      description: values.description || null,
      fileUrl: values.fileUrl || null,
      fileName: values.fileName || null,
      content: values.content || null,
    };

    if (isEdit) {
      updateDocument.mutate({ id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
          toast({ title: "Document updated successfully" });
          setLocation("/admin/content");
        }
      });
    } else {
      createDocument.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
          toast({ title: "Document created successfully" });
          setLocation("/admin/content");
        }
      });
    }
  };

  if (isEdit && isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Link href="/admin/content" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Content Management
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Document' : 'Create New Document'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Workplace Safety Policy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          <option value={0} disabled>Select a category</option>
                          {categories?.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief summary of the document" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium text-sm">Document Content</h3>
                <p className="text-xs text-muted-foreground">Upload a PDF file, paste an external URL, or type text content below.</p>

                {/* PDF Upload Zone */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Upload PDF</p>

                  {hasUploadedFile ? (
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-primary/5 border-primary/20">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{form.watch("fileName") || uploadedFileName || "Uploaded PDF"}</p>
                        <p className="text-xs text-muted-foreground">PDF uploaded successfully</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={clearUploadedFile} className="shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className={`
                        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                        ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}
                        ${isUploading ? "cursor-not-allowed opacity-70" : ""}
                      `}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileInput}
                        disabled={isUploading}
                      />

                      {isUploading ? (
                        <div className="space-y-3">
                          <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
                          <p className="text-sm font-medium">Uploading... {progress}%</p>
                          <div className="w-full bg-muted rounded-full h-2 max-w-xs mx-auto">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Drag & drop a PDF here</p>
                            <p className="text-xs text-muted-foreground mt-1">or click to browse your files</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="mt-2">
                            Choose PDF File
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* External URL fallback */}
                {!hasUploadedFile && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Or paste an external URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fileName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>File Name</FormLabel>
                          <FormControl>
                            <Input placeholder="policy.pdf" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Content (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Type document content here..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Requires Signature Toggle */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Requires signature</p>
                    <p className="text-xs text-muted-foreground">
                      Turn off for reference documents like maps and charts that staff just need to view.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.watch("requiresSignature")}
                    onClick={() => form.setValue("requiresSignature", !form.watch("requiresSignature"))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${form.watch("requiresSignature") ? "bg-primary" : "bg-input"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${form.watch("requiresSignature") ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                {form.watch("requiresSignature") ? (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded px-2 py-1.5 border border-primary/20">
                    <PenTool className="h-3 w-3 shrink-0" />
                    Staff must read and digitally sign this document to mark it complete.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 border">
                    <Eye className="h-3 w-3 shrink-0" />
                    View-only — staff can open this document but are not required to sign it.
                  </div>
                )}
              </div>

              {isEdit && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Require staff to re-sign this update</p>
                      <p className="text-xs text-muted-foreground">
                        Turn on if the content has changed and staff need to acknowledge and sign the new version.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.watch("bumpVersion")}
                      onClick={() => form.setValue("bumpVersion", !form.watch("bumpVersion"))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${form.watch("bumpVersion") ? "bg-amber-500" : "bg-input"}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${form.watch("bumpVersion") ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {form.watch("bumpVersion") && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100 rounded px-2 py-1.5 border border-amber-200">
                      <RefreshCw className="h-3 w-3 shrink-0" />
                      All staff will need to re-read and re-sign this document after saving.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Link href="/admin/content">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={createDocument.isPending || updateDocument.isPending || isUploading}>
                  {isEdit ? 'Save Changes' : 'Create Document'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
