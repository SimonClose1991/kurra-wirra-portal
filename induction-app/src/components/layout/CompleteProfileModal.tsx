import { useState } from "react";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function CompleteProfileModal() {
  const { data: me, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const needsName = !isLoading && me && !me.firstName;
  const open = !!needsName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    updateMe.mutate(
      { data: { firstName: firstName.trim(), lastName: lastName.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
          toast({ title: "Welcome!", description: "Your name has been saved." });
        },
        onError: () => {
          toast({ title: "Error", description: "Could not save your name. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome — what's your name?</DialogTitle>
          <DialogDescription>
            We need your name so admins can identify your submissions and progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="e.g. Sarah"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="e.g. Jones"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!firstName.trim() || !lastName.trim() || updateMe.isPending}
          >
            {updateMe.isPending ? "Saving..." : "Save and continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
