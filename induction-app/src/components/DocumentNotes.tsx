import { useState, useRef, useEffect } from "react";
import {
  useGetDocumentNotes,
  useCreateDocumentNote,
  useDeleteDocumentNote,
  getGetDocumentNotesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DocumentNotesProps {
  documentId: number;
}

export function DocumentNotes({ documentId }: DocumentNotesProps) {
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: notes, isLoading } = useGetDocumentNotes(documentId, {
    query: {
      enabled: me?.role === "admin",
      queryKey: getGetDocumentNotesQueryKey(documentId),
    },
  });

  const createNote = useCreateDocumentNote();
  const deleteNote = useDeleteDocumentNote();

  useEffect(() => {
    if (notes?.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [notes?.length]);

  if (me?.role !== "admin") return null;

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    createNote.mutate(
      { id: documentId, data: { content: trimmed } },
      {
        onSuccess: () => {
          setText("");
          queryClient.invalidateQueries({ queryKey: getGetDocumentNotesQueryKey(documentId) });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to post comment. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = (noteId: number) => {
    deleteNote.mutate(
      { id: documentId, noteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDocumentNotesQueryKey(documentId) });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to delete comment.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          Admin Notes
          <span className="text-xs font-normal text-muted-foreground ml-1">
            — visible to admins only
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {notes.map((note) => {
              const isOwn = note.clerkUserId === me?.clerkUserId;
              return (
                <div
                  key={note.id}
                  className="flex gap-3 group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {(note.authorName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {note.authorName || "Admin"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "d MMM yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed relative">
                      {note.content}
                      {isOwn && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This comment will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(note.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No comments yet. Add notes about staff ability and history for this document.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note about staff history or ability for this document..."
            className="min-h-[72px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || createNote.isPending}
            size="icon"
            className="self-end h-9 w-9 shrink-0"
            aria-label="Post comment"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Press Ctrl+Enter to post</p>
      </CardContent>
    </Card>
  );
}
