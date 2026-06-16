import { useState } from "react";
import { Link } from "wouter";
import { useGetSections, useGetCategories, useGetDocuments, useCreateSection, useUpdateSection, useDeleteSection, useCreateCategory, useUpdateCategory, useDeleteCategory, useDeleteDocument, useGetForms, useDeleteForm } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function AdminContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sections } = useGetSections();
  const { data: categories } = useGetCategories();
  const { data: documents } = useGetDocuments();
  const { data: forms } = useGetForms();

  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const deleteDocument = useDeleteDocument();
  const deleteForm = useDeleteForm();

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [sectionFormData, setSectionFormData] = useState({ name: "", description: "", sortOrder: "0" });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: "", description: "", sectionId: "", sortOrder: "0" });

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [documentFilter, setDocumentFilter] = useState<string>("all");

  const handleSectionSave = () => {
    const data = {
      name: sectionFormData.name,
      description: sectionFormData.description,
      sortOrder: parseInt(sectionFormData.sortOrder)
    };
    if (editingSection) {
      updateSection.mutate({ id: editingSection.id, data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/sections"] }); setSectionDialogOpen(false); toast({ title: "Module updated" }); }
      });
    } else {
      createSection.mutate({ data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/sections"] }); setSectionDialogOpen(false); toast({ title: "Module created" }); }
      });
    }
  };

  const handleCategorySave = () => {
    const data = {
      name: categoryFormData.name,
      description: categoryFormData.description,
      sectionId: parseInt(categoryFormData.sectionId),
      sortOrder: parseInt(categoryFormData.sortOrder)
    };
    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setCategoryDialogOpen(false); toast({ title: "Category updated" }); }
      });
    } else {
      createCategory.mutate({ data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setCategoryDialogOpen(false); toast({ title: "Category created" }); }
      });
    }
  };

  const filteredCategories = categoryFilter === "all"
    ? (categories ?? [])
    : (categories ?? []).filter(c => c.sectionId === parseInt(categoryFilter));

  const filteredDocuments = documentFilter === "all"
    ? (documents ?? [])
    : (documents ?? []).filter(doc => {
        const cat = categories?.find(c => c.id === doc.categoryId);
        return cat?.sectionId === parseInt(documentFilter);
      });

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Manage Content</h1>
        <p className="text-muted-foreground mt-2">Organise modules, categories, and induction documents.</p>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sections">Modules</TabsTrigger>
        </TabsList>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>All reading materials and forms.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {/* Module filter */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={documentFilter}
                    onChange={e => setDocumentFilter(e.target.value)}
                  >
                    <option value="all">All Modules</option>
                    {sections?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <Link href="/admin/document/new">
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Document</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sort</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.sort((a, b) => a.sortOrder - b.sortOrder).map(doc => {
                    const cat = categories?.find(c => c.id === doc.categoryId);
                    const sec = sections?.find(s => s.id === cat?.sectionId);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>
                          {sec && <Badge variant="outline" className="text-xs">{sec.name}</Badge>}
                        </TableCell>
                        <TableCell>{cat?.name}</TableCell>
                        <TableCell>{doc.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/document/${doc.id}/edit`}>
                              <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                            </Link>
                            <Button variant="destructive" size="icon" onClick={() => {
                              if (confirm('Delete this document?')) {
                                deleteDocument.mutate({ id: doc.id }, {
                                  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/documents"] }); toast({ title: "Deleted" }); }
                                });
                              }
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredDocuments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No documents found{documentFilter !== "all" ? " in this module" : ""}. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FORMS TAB */}
        <TabsContent value="forms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Forms</CardTitle>
                <CardDescription>Fillable forms that staff complete within a category.</CardDescription>
              </div>
              <Link href="/admin/form/new">
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Form</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(forms ?? []).map(form => {
                    const cat = categories?.find(c => c.id === form.categoryId);
                    const sec = sections?.find(s => s.id === cat?.sectionId);
                    return (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{form.title}</TableCell>
                        <TableCell>{cat?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {sec && <Badge variant="outline" className="text-xs">{sec.name}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/form/${form.id}/submissions`}>
                              <Button variant="outline" size="sm" className="text-xs">Submissions</Button>
                            </Link>
                            <Link href={`/admin/form/${form.id}/edit`}>
                              <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                            </Link>
                            <Button variant="destructive" size="icon" onClick={() => {
                              if (confirm('Delete this form and all its submissions?')) {
                                deleteForm.mutate({ id: form.id }, {
                                  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/forms"] }); toast({ title: "Deleted" }); }
                                });
                              }
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(forms ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No forms yet. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Folders within modules — filter by module to see what belongs where.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Modules</option>
                    {sections?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <Button size="sm" onClick={() => {
                  setEditingCategory(null);
                  setCategoryFormData({ name: "", description: "", sectionId: sections?.[0]?.id.toString() || "", sortOrder: "0" });
                  setCategoryDialogOpen(true);
                }}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Group by module when showing all */}
              {categoryFilter === "all" ? (
                <div className="space-y-6">
                  {sections?.map(sec => {
                    const sectionCats = (categories ?? []).filter(c => c.sectionId === sec.id);
                    return (
                      <div key={sec.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="text-xs font-semibold">{sec.name}</Badge>
                          <span className="text-xs text-muted-foreground">{sectionCats.length} {sectionCats.length === 1 ? "category" : "categories"}</span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Documents</TableHead>
                              <TableHead>Sort</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sectionCats.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-muted-foreground text-sm py-4 text-center">No categories in this module yet.</TableCell>
                              </TableRow>
                            )}
                            {sectionCats.map(cat => {
                              const docCount = (documents ?? []).filter(d => d.categoryId === cat.id).length;
                              return (
                                <TableRow key={cat.id}>
                                  <TableCell className="font-medium">{cat.name}</TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">{docCount} {docCount === 1 ? "doc" : "docs"}</span>
                                  </TableCell>
                                  <TableCell>{cat.sortOrder}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" size="icon" onClick={() => {
                                        setEditingCategory(cat);
                                        setCategoryFormData({ name: cat.name, description: cat.description || "", sectionId: cat.sectionId.toString(), sortOrder: cat.sortOrder.toString() });
                                        setCategoryDialogOpen(true);
                                      }}><Edit className="h-4 w-4" /></Button>
                                      <Button variant="destructive" size="icon" onClick={() => {
                                        if (confirm('Delete this category?')) {
                                          deleteCategory.mutate({ id: cat.id }, {
                                            onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); toast({ title: "Deleted" }); }
                                          });
                                        }
                                      }}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Sort</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map(cat => {
                      const docCount = (documents ?? []).filter(d => d.categoryId === cat.id).length;
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{docCount} {docCount === 1 ? "doc" : "docs"}</span>
                          </TableCell>
                          <TableCell>{cat.sortOrder}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="icon" onClick={() => {
                                setEditingCategory(cat);
                                setCategoryFormData({ name: cat.name, description: cat.description || "", sectionId: cat.sectionId.toString(), sortOrder: cat.sortOrder.toString() });
                                setCategoryDialogOpen(true);
                              }}><Edit className="h-4 w-4" /></Button>
                              <Button variant="destructive" size="icon" onClick={() => {
                                if (confirm('Delete this category?')) {
                                  deleteCategory.mutate({ id: cat.id }, {
                                    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); toast({ title: "Deleted" }); }
                                  });
                                }
                              }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredCategories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No categories in this module.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODULES TAB */}
        <TabsContent value="sections">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Modules</CardTitle>
                <CardDescription>Top-level organisation — e.g. Induction Forms, SOPs.</CardDescription>
              </div>
              <Button size="sm" onClick={() => {
                setEditingSection(null);
                setSectionFormData({ name: "", description: "", sortOrder: "0" });
                setSectionDialogOpen(true);
              }}><Plus className="mr-2 h-4 w-4" /> Add Module</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Sort</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections?.map(sec => {
                    const catCount = (categories ?? []).filter(c => c.sectionId === sec.id).length;
                    return (
                      <TableRow key={sec.id}>
                        <TableCell className="font-medium">{sec.name}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{catCount} {catCount === 1 ? "category" : "categories"}</span>
                        </TableCell>
                        <TableCell>{sec.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => {
                              setEditingSection(sec);
                              setSectionFormData({ name: sec.name, description: sec.description || "", sortOrder: sec.sortOrder.toString() });
                              setSectionDialogOpen(true);
                            }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="destructive" size="icon" onClick={() => {
                              if (confirm('Delete this module?')) {
                                deleteSection.mutate({ id: sec.id }, {
                                  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/sections"] }); toast({ title: "Deleted" }); }
                                });
                              }
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit Module' : 'Add Module'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={sectionFormData.name} onChange={e => setSectionFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={sectionFormData.description} onChange={e => setSectionFormData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={sectionFormData.sortOrder} onChange={e => setSectionFormData(prev => ({ ...prev, sortOrder: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSectionSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={categoryFormData.name} onChange={e => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={categoryFormData.description} onChange={e => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Module</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={categoryFormData.sectionId}
                onChange={e => setCategoryFormData(prev => ({ ...prev, sectionId: e.target.value }))}
              >
                <option value="" disabled>Select a module</option>
                {sections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={categoryFormData.sortOrder} onChange={e => setCategoryFormData(prev => ({ ...prev, sortOrder: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCategorySave} disabled={!categoryFormData.name || !categoryFormData.sectionId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
