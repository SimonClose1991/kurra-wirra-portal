import { useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useGetForm, useSubmitForm, useGetMyFormSubmission, useGetCategories } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, ClipboardList, RefreshCw, Upload, Loader2, Image, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function FillForm() {
  const { formId } = useParams();
  const id = Number(formId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: form, isLoading: isLoadingForm } = useGetForm(id);
  const { data: mySubmission, isLoading: isLoadingSub } = useGetMyFormSubmission(id);
  const { data: categories } = useGetCategories();
  const submitForm = useSubmitForm();

  const [values, setValues] = useState<Record<string, string>>({});
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { uploadFile } = useUpload({
    basePath: `${basePath}/api/storage`,
    onSuccess: () => {},
    onError: (err) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFileUpload = async (fieldId: string, file: File) => {
    setUploadingFields(prev => ({ ...prev, [fieldId]: true }));
    try {
      const res = await fetch(`${basePath}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      const serveUrl = `${basePath}/api/storage${objectPath}`;
      setValues(prev => ({ ...prev, [fieldId]: serveUrl }));
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploadingFields(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const isLoading = isLoadingForm || isLoadingSub;

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 text-center py-12">
        <h2 className="text-xl font-bold">Form not found</h2>
        <Link href="/dashboard"><Button className="mt-4">Back to Dashboard</Button></Link>
      </div>
    );
  }

  const category = categories?.find(c => c.id === form.categoryId);
  const isRepeatable = form.isRepeatable;
  const fields = ((form as any).fields ?? []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const handleChange = (fieldId: number, value: string) => {
    setValues(prev => ({ ...prev, [fieldId.toString()]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const field of fields) {
      if (field.required && !values[field.id.toString()]?.trim()) {
        toast({ title: `"${field.label}" is required`, variant: "destructive" });
        return;
      }
    }
    submitForm.mutate({ id, data: { data: values } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/forms/${id}/my-submission`] });
        if (isRepeatable) {
          setJustSubmitted(true);
        } else {
          toast({ title: "Form submitted successfully" });
        }
      },
      onError: (err: any) => {
        toast({ title: "Could not submit form", description: err?.message ?? "Please try again", variant: "destructive" });
      }
    });
  };

  const handleSubmitAnother = () => {
    setValues({});
    setJustSubmitted(false);
  };

  const backLink = category ? (
    <Link href={`/category/${category.id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to {category.name}
    </Link>
  ) : null;

  // Repeatable form — just submitted confirmation
  if (isRepeatable && justSubmitted) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
        {backLink}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-full">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{form.title}</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-1">Logged</Badge>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 pb-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Your report has been submitted and logged successfully. You can submit another one at any time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleSubmitAnother}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Submit Another Report
              </Button>
              {backLink && (
                <Link href={`/category/${category!.id}`}>
                  <Button variant="outline">Back to {category!.name}</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // One-time form — already submitted view
  if (!isRepeatable && mySubmission) {
    const submittedData = mySubmission.data as Record<string, string>;
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
        {backLink}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-full">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{form.title}</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-1">Submitted</Badge>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Submitted Responses</CardTitle>
            <CardDescription>
              Submitted on {new Date(mySubmission.submittedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field: any) => (
              <div key={field.id}>
                <div className="text-sm font-medium text-muted-foreground">{field.label}</div>
                <div className="text-sm mt-0.5">{submittedData[field.id.toString()] || <span className="italic text-muted-foreground">Not answered</span>}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form to fill in
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
      {backLink}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-full">
          <ClipboardList className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{form.title}</h1>
          {form.description && <p className="text-muted-foreground mt-1 text-sm">{form.description}</p>}
          {isRepeatable && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 mt-1">
              <RefreshCw className="mr-1 h-3 w-3" />
              Can be submitted multiple times
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 space-y-5">
            {fields.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">This form has no fields yet.</p>
            )}
            {fields.map((field: any) => {
              const fieldId = field.id.toString();
              const options = field.options ? field.options.split(",").map((o: string) => o.trim()).filter(Boolean) : [];

              return (
                <div key={field.id} className="space-y-2">
                  {field.fieldType !== "checkbox" && (
                    <Label htmlFor={fieldId}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                  )}

                  {field.fieldType === "textarea" && (
                    <Textarea
                      id={fieldId}
                      placeholder={field.placeholder || ""}
                      value={values[fieldId] || ""}
                      onChange={e => handleChange(field.id, e.target.value)}
                      rows={3}
                    />
                  )}

                  {field.fieldType === "select" && (
                    <select
                      id={fieldId}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={values[fieldId] || ""}
                      onChange={e => handleChange(field.id, e.target.value)}
                    >
                      <option value="">Select an option...</option>
                      {options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.fieldType === "checkbox" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={fieldId}
                        checked={values[fieldId] === "true"}
                        onChange={e => handleChange(field.id, e.target.checked ? "true" : "false")}
                        className="h-4 w-4 rounded border border-input"
                      />
                      <Label htmlFor={fieldId} className="font-normal cursor-pointer">{field.placeholder || field.label}</Label>
                    </div>
                  )}

                  {field.fieldType === "file_upload" && (
                    <div>
                      {values[fieldId] ? (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5 border-primary/20">
                          <Image className="h-5 w-5 text-primary shrink-0" />
                          <span className="text-sm text-primary font-medium flex-1 truncate">File uploaded</span>
                          <a href={values[fieldId]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> View
                          </a>
                          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setValues(prev => ({ ...prev, [fieldId]: "" })); if (fileInputRefs.current[fieldId]) fileInputRefs.current[fieldId]!.value = ""; }}>
                            Remove
                          </button>
                        </div>
                      ) : uploadingFields[fieldId] ? (
                        <div className="flex items-center gap-2 p-3 border rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm">Uploading...</span>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRefs.current[fieldId]?.click()}
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                        >
                          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                          <p className="text-sm text-muted-foreground">Click to upload a photo or file</p>
                        </div>
                      )}
                      <input
                        ref={el => { fileInputRefs.current[fieldId] = el; }}
                        type="file"
                        accept="image/*,.pdf"
                        capture="environment"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(fieldId, f); }}
                      />
                    </div>
                  )}

                  {!["textarea", "select", "checkbox", "file_upload"].includes(field.fieldType) && (
                    <Input
                      id={fieldId}
                      type={field.fieldType === "date" ? "date" : field.fieldType === "number" ? "number" : field.fieldType === "email" ? "email" : field.fieldType === "phone" ? "tel" : "text"}
                      placeholder={field.placeholder || ""}
                      value={values[fieldId] || ""}
                      onChange={e => handleChange(field.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}

            {fields.length > 0 && (
              <div className="pt-2">
                <Button type="submit" disabled={submitForm.isPending} className="w-full sm:w-auto">
                  {submitForm.isPending ? "Submitting..." : isRepeatable ? "Submit Report" : "Submit Form"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
