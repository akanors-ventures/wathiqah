import { useLazyQuery } from "@apollo/client/react";
import { Search, UserPlus, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEARCH_WITNESS_QUERY } from "@/lib/apollo/queries/users";
import { cn } from "@/lib/utils";
import {
  SearchType,
  type SearchWitnessQuery,
  type SearchWitnessQueryVariables,
  type WitnessInviteInput,
} from "@/types/__generated__/graphql";

export interface SelectedWitness {
  userId?: string;
  invite?: WitnessInviteInput;
  displayName: string;
}

interface WitnessSelectorProps {
  selectedWitnesses: SelectedWitness[];
  onChange: (witnesses: SelectedWitness[]) => void;
  className?: string;
}

export function WitnessSelector({ selectedWitnesses, onChange, className }: WitnessSelectorProps) {
  const inviteNameId = useId();
  const inviteEmailId = useId();
  const invitePhoneId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    query: string;
    type: SearchType;
  } | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");

  const [searchWitness, { loading: searching }] = useLazyQuery<
    SearchWitnessQuery,
    SearchWitnessQueryVariables
  >(SEARCH_WITNESS_QUERY);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const { data } = await searchWitness({
        variables: {
          input: {
            query: searchQuery,
            type: searchQuery.includes("@") ? SearchType.Email : SearchType.Phone,
          },
        },
      });

      if (data?.searchWitness) {
        setSearchResult({
          ...data.searchWitness,
          query: searchQuery,
          type: searchQuery.includes("@") ? SearchType.Email : SearchType.Phone,
        });
      } else {
        setSearchResult(null);
        setShowInviteForm(true);
        if (searchQuery.includes("@")) {
          setInviteEmail(searchQuery);
        } else {
          setInvitePhone(searchQuery);
        }
      }
    } catch (_error) {
      // Error handled by Apollo or if needed here
    }
  };

  const addExistingUser = () => {
    if (!searchResult) return;

    // Check if already added
    if (selectedWitnesses.some((w) => w.userId === searchResult.id)) {
      setSearchResult(null);
      setSearchQuery("");
      return;
    }

    onChange([
      ...selectedWitnesses,
      {
        userId: searchResult.id,
        displayName: `${searchResult.firstName} ${searchResult.lastName}`,
      },
    ]);
    setSearchResult(null);
    setSearchQuery("");
  };

  const addInvite = () => {
    if (!inviteName || !inviteEmail) return;

    onChange([
      ...selectedWitnesses,
      {
        invite: {
          name: inviteName,
          email: inviteEmail,
          phoneNumber: invitePhone || undefined,
        },
        displayName: inviteName,
      },
    ]);
    setShowInviteForm(false);
    setInviteName("");
    setInviteEmail("");
    setInvitePhone("");
    setSearchQuery("");
  };

  const removeWitness = (index: number) => {
    const newWitnesses = [...selectedWitnesses];
    newWitnesses.splice(index, 1);
    onChange(newWitnesses);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-2">
        {selectedWitnesses.map((witness, index) => (
          <div
            key={witness.userId || witness.invite?.email || index}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-900 text-sm font-medium"
          >
            <span>{witness.displayName}</span>
            <button
              type="button"
              onClick={() => removeWitness(index)}
              className="hover:text-emerald-900 dark:hover:text-emerald-200"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {!showInviteForm && !searchResult && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <Input
              placeholder="Search by email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? "Searching..." : "Search"}
          </Button>
        </div>
      )}

      {searchResult && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <UserPlus size={16} />
            </div>
            <div>
              <p className="text-sm font-medium">
                {searchResult.firstName} {searchResult.lastName}
              </p>
              <p className="text-xs text-neutral-500">Existing User Found</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addExistingUser}>
              Add Witness
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSearchResult(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showInviteForm && (
        <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Invite New Witness</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowInviteForm(false)}
            >
              <X size={16} />
            </Button>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={inviteNameId}>Name</Label>
              <Input
                id={inviteNameId}
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full Name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={inviteEmailId}>Email</Label>
              <Input
                id={inviteEmailId}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={invitePhoneId}>Phone (Optional)</Label>
              <Input
                id={invitePhoneId}
                type="tel"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="+234..."
              />
            </div>
            <Button type="button" onClick={addInvite} disabled={!inviteName || !inviteEmail}>
              Add to List
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
