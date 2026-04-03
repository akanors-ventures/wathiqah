import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LIMIT_CONTENT = {
  witnesses: {
    title: "Witness limit reached",
    description:
      "You've used all your witness requests for this month. Upgrade to Wathīqah Pro for unlimited witnesses, contact SMS notifications, and more.",
  },
} as const;

interface UpgradePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: keyof typeof LIMIT_CONTENT;
}

export function UpgradePromptDialog({ open, onOpenChange, limitType }: UpgradePromptDialogProps) {
  const content = LIMIT_CONTENT[limitType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <DialogTitle>{content.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-1">{content.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="sm:order-first">
            Not now
          </Button>
          <Button asChild onClick={() => onOpenChange(false)}>
            <Link to="/pricing">
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
