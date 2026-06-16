import { useEffect, useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function storageKey(clerkUserId: string) {
  return `kw_welcome_dismissed_${clerkUserId}`;
}

export function WelcomeModal() {
  const { data: me } = useGetMe();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!me?.clerkUserId) return;
    const dismissed = localStorage.getItem(storageKey(me.clerkUserId));
    if (!dismissed) setOpen(true);
  }, [me?.clerkUserId]);

  const dismiss = (permanent: boolean) => {
    if (permanent && me?.clerkUserId) {
      localStorage.setItem(storageKey(me.clerkUserId), "true");
    }
    setOpen(false);
  };

  if (!me) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(false); }}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">Welcome to Kurra-Wirra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed text-foreground">
          <p>
            We are thrilled to welcome you to our team at Kurra-Wirra. We are excited to have you
            as part of our organisation and believe that your skills, knowledge and experience will
            be valuable assets to our farming business.
          </p>
          <p>
            Our vision is to maintain an intergenerational farming business that looks after its
            people, animals and the environment. We pride ourselves on our commitment to family,
            community, integrity, purpose and meaningful work, health, and happiness. Our culture is
            built on collaboration, respect and teamwork.
          </p>
          <p>
            Please review the training modules below. In the coming days, you will be meeting with
            your team members and receiving training on our policies and procedures. Please do not
            hesitate to reach out to any member of our management team if you have any questions or
            concerns.
          </p>
          <p>
            Once again, welcome. We look forward to working with you.
          </p>
          <p className="font-medium text-primary">
            Sincerely,<br />
            KW Management
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            variant="ghost"
            className="text-muted-foreground text-sm"
            onClick={() => dismiss(true)}
          >
            Do not show this again
          </Button>
          <Button className="flex-1" onClick={() => dismiss(false)}>
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
