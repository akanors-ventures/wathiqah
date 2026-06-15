import { useId } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type NoteFormValues = {
  title?: string;
  body: string;
  category: string;
};

export function NoteForm({
  defaultValues,
  onSubmit,
  onDelete,
}: {
  defaultValues?: Partial<NoteFormValues>;
  onSubmit: (values: NoteFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormValues>({
    defaultValues: {
      title: "",
      body: "",
      category: "",
      ...defaultValues,
    },
  });

  const titleId = useId();
  const bodyId = useId();
  const categoryId = useId();

  async function handleFormSubmit(values: NoteFormValues) {
    await onSubmit(values);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label htmlFor={titleId}>Title (optional)</Label>
        <Input id={titleId} placeholder="Note title (optional)" {...register("title")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={bodyId}>Note</Label>
        <Textarea
          id={bodyId}
          rows={5}
          placeholder="Write your note here…"
          {...register("body", { required: "Note body is required" })}
        />
        {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={categoryId}>Category (optional)</Label>
        <Input
          id={categoryId}
          placeholder="e.g. Meeting notes, Decision, Observation"
          {...register("category")}
        />
      </div>
      <DialogFooter className="gap-2 pt-2">
        {onDelete && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive border-destructive hover:bg-destructive/10 mr-auto"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            Delete
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : defaultValues?.body ? "Save changes" : "Save Note"}
        </Button>
      </DialogFooter>
    </form>
  );
}
