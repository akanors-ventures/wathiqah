import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { OrgNote } from "@/types/__generated__/graphql";

interface NoteEntryProps {
  note: OrgNote;
  authorName?: string;
  onEdit?: (note: OrgNote) => void;
}

export function NoteEntry({ note, authorName, onEdit }: NoteEntryProps) {
  return (
    <button
      type="button"
      className="w-full text-left p-4 rounded-xl bg-muted/30 border border-border cursor-pointer hover:border-border/80 hover:shadow-sm transition-all duration-150"
      onClick={() => onEdit?.(note)}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-bold text-foreground/70">
          {format(new Date(note.createdAt), "EEE, d MMM yyyy")}
        </p>
        {authorName && <p className="text-[11px] text-muted-foreground">{authorName}</p>}
      </div>
      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{note.body}</p>
      {note.category && (
        <div className="mt-3">
          <Badge variant="secondary" className="text-[10px] font-bold uppercase">
            {note.category}
          </Badge>
        </div>
      )}
    </button>
  );
}
