import { useParams, Link } from "wouter";
import { useGetSections, useGetCategories } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FolderOpen } from "lucide-react";

export default function Section() {
  const { sectionId } = useParams();
  const id = parseInt(sectionId || "0", 10);

  const { data: sections, isLoading: isLoadingSections } = useGetSections();
  const { data: categories, isLoading: isLoadingCategories } = useGetCategories({ sectionId: id });

  const isLoading = isLoadingSections || isLoadingCategories;

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-6 w-96 mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const section = sections?.find(s => s.id === id);

  if (!section) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Module not found</h2>
          <p className="text-muted-foreground mt-2">The module you are looking for does not exist.</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sectionCategories = categories || [];

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{section.name}</h1>
        {section.description && <p className="text-muted-foreground mt-2">{section.description}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        {sectionCategories.length === 0 ? (
          <div className="col-span-full text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No categories defined for this module yet.</p>
          </div>
        ) : (
          sectionCategories.map(category => (
            <Card key={category.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                  {category.name}
                </CardTitle>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{category.description}</p>
                )}
              </CardHeader>
              <CardFooter className="pt-4 border-t">
                <Link href={`/category/${category.id}`} className="w-full">
                  <Button className="w-full" data-testid={`btn-category-${category.id}`}>
                    Open
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
