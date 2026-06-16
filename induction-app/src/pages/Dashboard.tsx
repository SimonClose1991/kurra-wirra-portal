import { useGetSections, useGetCategories, useGetMe } from "@workspace/api-client-react";
import { WelcomeModal } from "@/components/layout/WelcomeModal";
import { CompleteProfileModal } from "@/components/layout/CompleteProfileModal";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookOpen, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/react";

export default function Dashboard() {
  const { user } = useUser();
  const { data: me } = useGetMe();
  const { data: sections, isLoading: isLoadingSections } = useGetSections();
  const { data: categories, isLoading: isLoadingCategories } = useGetCategories();

  const firstName = user?.firstName || me?.firstName || null;

  const isLoading = isLoadingSections || isLoadingCategories;

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName || 'there'}</h1>
        <p className="text-muted-foreground mt-1">Select a module below to get started.</p>
      </div>

      <CompleteProfileModal />
      <WelcomeModal />

      <div className="flex items-center justify-between border rounded-lg bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-sm">My Documents</p>
            <p className="text-xs text-muted-foreground">Upload your licences, certificates, and personal documents.</p>
          </div>
        </div>
        <Link href="/my-documents">
          <Button variant="outline" size="sm">View</Button>
        </Link>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Your Modules</h2>

        {sections?.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/50">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No modules available</h3>
            <p className="text-muted-foreground">There are no modules assigned yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sections?.map(section => {
              const sectionCategories = categories?.filter(c => c.sectionId === section.id) || [];

              return (
                <Card key={section.id} className="flex flex-col">
                  <CardHeader className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary shrink-0" />
                      {section.name}
                    </CardTitle>
                    {section.description && (
                      <CardDescription className="line-clamp-2 mt-2">{section.description}</CardDescription>
                    )}
                    {sectionCategories.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {sectionCategories.length} {sectionCategories.length === 1 ? "category" : "categories"}
                      </p>
                    )}
                  </CardHeader>
                  <CardFooter className="pt-4 border-t">
                    <Link href={`/section/${section.id}`} className="w-full">
                      <Button className="w-full" data-testid={`btn-section-${section.id}`}>
                        Open Module
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
