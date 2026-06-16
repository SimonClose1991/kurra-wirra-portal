import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetForm, useCreateForm, useUpdateForm, useCreateFormField, useUpdateFormField, useDeleteFormField, useGetCategories } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Edit, GripVertical, Save, RefreshCw, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const FIELD_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Number" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown (select)" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file_upload", label: "Photo / File Upload" },
];

export default function AdminFormBuilder() {
  const { formId } = useParams();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isNew = !formId;
  const params = new URLSearchParams(window.location.search);
  const categoryIdFromQuery = params.get("categoryId");

  const { data: form, isLoading } = useGetForm(formId ? Number(formId) : 0, {
    query: { enabled: !isNew, queryKey: [`/api/forms/${formId}`] },
  });

  const createForm = useCreateForm();
  const updateForm = useUpdateForm();
  const createField = useCreateFormField();
  const updateField = useUpdateFormField();
  const deleteField = useDeleteFormField();
  const { data: categories } = useGetCategories();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categoryIdFromQuery || "");
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [notifyAdmins, setNotifyAdmins] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedFormId, setSavedFormId] = useState<number | null>(formId ? Number(formId) : null);

  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [fieldData, setFieldData] = useState({
    label: "",
    fieldType: "text",
    required: false,
    placeholder: "",
    options: "",
  });

  useEffect(() => {
    if (form) {
      setTitle(form.title);
      setDescription(form.description || "");
      setCategoryId(form.categoryId.toString());
      setIsRepeatable(form.isRepeatable);
      setNotifyAdmins(form.notifyAdmins);
      setSaved(true);
      setSavedFormId(form.id);
    }
  }, [form]);

  const handleSaveForm = () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!categoryId) {
      toast({ title: "Category ID is required", variant: "destructive" });
      return;
    }
    if (isNew || !savedFormId) {
      createForm.mutate({
        data: { title, description: description || null, categoryId: Number(categoryId), sortOrder: 0, isRepeatable, notifyAdmins }
      }, {
        onSuccess: (created) => {
          setSavedFormId(created.id);
          setSaved(true);
          navigate(`/admin/form/${created.id}/edit`);
          toast({ title: "Form saved — now add fields below" });
        }
      });
    } else {
      updateForm.mutate({ id: savedFormId, data: { title, description: description || null, categoryId: Number(categoryId), sortOrder: 0, isRepeatable, notifyAdmins } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/forms/${savedFormId}`] });
          toast({ title: "Form updated" });
        }
      });
    }
  };

  const openAddField = () => {
    setEditingField(null);
    setFieldData({ label: "", fieldType: "text", required: false, placeholder: "", options: "" });
    setFieldDialogOpen(true);
  };

  const openEditField = (field: any) => {
    setEditingField(field);
    setFieldData({
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      placeholder: field.placeholder || "",
      options: field.options || "",
    });
    setFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldData.label.trim()) {
      toast({ title: "Field label is required", variant: "destructive" });
      return;
    }
    if (!savedFormId) return;

    const payload = {
      label: fieldData.label,
      fieldType: fieldData.fieldType as any,
      required: fieldData.required,
      placeholder: fieldData.placeholder || null,
      options: fieldData.options || null,
      sortOrder: editingField ? editingField.sortOrder : (form?.fields?.length ?? 0),
    };

    if (editingField) {
      updateField.mutate({ id: savedFormId, fieldId: editingField.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/forms/${savedFormId}`] });
          setFieldDialogOpen(false);
          toast({ title: "Field updated" });
        }
      });
    } else {
      createField.mutate({ id: savedFormId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/forms/${savedFormId}`] });
          setFieldDialogOpen(false);
          toast({ title: "Field added" });
        }
      });
    }
  };

  const handleDeleteField = (fieldId: number) => {
    if (!savedFormId) return;
    if (!confirm("Remove this field?")) return;
    deleteField.mutate({ id: savedFormId, fieldId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/forms/${savedFormId}`] });
        toast({ title: "Field removed" });
      }
    });
  };

  if (!isNew && isLoading) {
    return <div className="container max-w-3xl mx-auto py-8 px-4">Loading...</div>;
  }

  const fields = form?.fields ?? [];

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
      <Link href="/admin/content" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Content
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {isNew ? "New Form" : "Edit Form"}
        </h1>
        <p className="text-muted-foreground mt-1">Build a fillable form that staff complete within a category.</p>
      </div>

      {/* Form Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Form Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Staff Induction Details" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Instructions for staff filling in this form..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catid">Category</Label>
            <select
              id="catid"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={!!savedFormId && !isNew}
            >
              <option value="">— Select a category —</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {!!savedFormId && !isNew && (
              <p className="text-xs text-muted-foreground">To move this form to a different category, delete it and create a new one.</p>
            )}
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Repeatable submissions</p>
                <p className="text-xs text-muted-foreground">
                  Enable for forms like Near Miss Reports that staff can submit multiple times. Disable for one-off forms like induction sign-offs.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isRepeatable}
                onClick={() => setIsRepeatable(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isRepeatable ? "bg-primary" : "bg-input"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${isRepeatable ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            {isRepeatable && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 border border-amber-200">
                <RefreshCw className="h-3 w-3 shrink-0" />
                Staff can submit this form as many times as needed — each response is logged separately.
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Notify admins on submission</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, all admins receive an email whenever someone submits this form. Useful for incident reports and other time-sensitive forms.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyAdmins}
                onClick={() => setNotifyAdmins(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${notifyAdmins ? "bg-primary" : "bg-input"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${notifyAdmins ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            {notifyAdmins && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded px-2 py-1.5 border border-primary/20">
                <Bell className="h-3 w-3 shrink-0" />
                All admins will receive an email notification each time this form is submitted.
              </div>
            )}
          </div>
          <Button onClick={handleSaveForm} disabled={createForm.isPending || updateForm.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saved ? "Update Form" : "Save & Continue"}
          </Button>
        </CardContent>
      </Card>

      {/* Fields */}
      {savedFormId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Form Fields</CardTitle>
              <CardDescription>The questions or fields staff will fill in.</CardDescription>
            </div>
            <Button size="sm" onClick={openAddField}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-10 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-sm">No fields yet. Add the first one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...fields].sort((a, b) => a.sortOrder - b.sortOrder).map(field => {
                  const typeLabel = FIELD_TYPES.find(t => t.value === field.fieldType)?.label ?? field.fieldType;
                  return (
                    <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{field.label}</span>
                          {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">Required</Badge>}
                          <Badge variant="outline" className="text-xs px-1 py-0">{typeLabel}</Badge>
                        </div>
                        {field.placeholder && (
                          <p className="text-xs text-muted-foreground mt-0.5">Placeholder: {field.placeholder}</p>
                        )}
                        {field.options && (
                          <p className="text-xs text-muted-foreground mt-0.5">Options: {field.options}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditField(field)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteField(field.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Field Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : "Add Field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={fieldData.label} onChange={e => setFieldData(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Full Name" />
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={fieldData.fieldType}
                onChange={e => setFieldData(p => ({ ...p, fieldType: e.target.value }))}
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {(fieldData.fieldType !== "checkbox") && (
              <div className="space-y-2">
                <Label>Placeholder (optional)</Label>
                <Input value={fieldData.placeholder} onChange={e => setFieldData(p => ({ ...p, placeholder: e.target.value }))} placeholder="e.g. Enter your full legal name" />
              </div>
            )}
            {fieldData.fieldType === "select" && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Input value={fieldData.options} onChange={e => setFieldData(p => ({ ...p, options: e.target.value }))} placeholder="e.g. Full-time, Part-time, Casual" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="req"
                checked={fieldData.required}
                onChange={e => setFieldData(p => ({ ...p, required: e.target.checked }))}
                className="h-4 w-4 rounded border border-input"
              />
              <Label htmlFor="req">Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveField} disabled={createField.isPending || updateField.isPending}>
              {editingField ? "Update Field" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
