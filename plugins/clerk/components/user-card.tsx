import type { ResultComponentProps } from "@/plugins/registry";

type ClerkUserOutput = {
  success: boolean;
  data?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    primaryEmailAddress: string | null;
    createdAt: number;
  };
  error?: { message: string };
};

export function UserCard({ output }: ResultComponentProps) {
  const result = output as ClerkUserOutput;

  if (!result.success || !result.data) {
    return null;
  }

  const { data } = result;
  const initials = [data.firstName?.[0], data.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const createdDate = new Date(data.createdAt).toLocaleDateString();

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 font-semibold text-lg text-white">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-foreground">
          {fullName || "Unknown User"}
        </div>
        {data.primaryEmailAddress && (
          <div className="truncate text-muted-foreground text-sm">
            {data.primaryEmailAddress}
          </div>
        )}
        <div className="mt-0.5 font-mono text-muted-foreground text-xs">
          Created {createdDate}
        </div>
      </div>
    </div>
  );
}



