"use client";

import { Database, Search, Settings, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { cn } from "@/lib/utils";
import { getAllActions } from "@/plugins";

type ActionType = {
  id: string;
  label: string;
  description: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
  integration?: string;
};

// System actions that don't have plugins
const SYSTEM_ACTIONS: ActionType[] = [
  {
    id: "HTTP Request",
    label: "HTTP Request",
    description: "Make an HTTP request to any API",
    category: "System",
    icon: Zap,
  },
  {
    id: "Database Query",
    label: "Database Query",
    description: "Query your database",
    category: "System",
    icon: Database,
  },
  {
    id: "Condition",
    label: "Condition",
    description: "Branch based on a condition",
    category: "System",
    icon: Settings,
  },
];

// Combine System actions with plugin actions
function useAllActions(): ActionType[] {
  return useMemo(() => {
    const pluginActions = getAllActions();

    // Map plugin actions to ActionType format
    const mappedPluginActions: ActionType[] = pluginActions.map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      category: action.category,
      integration: action.integration,
    }));

    return [...SYSTEM_ACTIONS, ...mappedPluginActions];
  }, []);
}

type ActionGridProps = {
  onSelectAction: (actionType: string) => void;
  disabled?: boolean;
  isNewlyCreated?: boolean;
};

function ActionIcon({ action }: { action: ActionType }) {
  if (action.integration) {
    return (
      <IntegrationIcon className="size-5" integration={action.integration} />
    );
  }
  if (action.icon) {
    return <action.icon className="size-5" />;
  }
  return <Zap className="size-5" />;
}

export function ActionGrid({
  onSelectAction,
  disabled,
  isNewlyCreated,
}: ActionGridProps) {
  const [filter, setFilter] = useState("");
  const actions = useAllActions();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNewlyCreated && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNewlyCreated]);

  const filteredActions = actions.filter((action) => {
    const searchTerm = filter.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchTerm) ||
      action.description.toLowerCase().includes(searchTerm) ||
      action.category.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          autoFocus={isNewlyCreated}
          className="pl-9"
          data-testid="action-search-input"
          disabled={disabled}
          id="action-filter"
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search actions..."
          ref={inputRef}
          value={filter}
        />
      </div>

      <div
        className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-4"
        data-testid="action-grid"
      >
        {filteredActions.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No actions found
          </p>
        ) : (
          filteredActions.map((action) => (
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
                disabled && "pointer-events-none opacity-50"
              )}
              data-testid={`action-option-${action.id.toLowerCase().replace(/\s+/g, "-")}`}
              disabled={disabled}
              key={action.id}
              onClick={() => onSelectAction(action.id)}
              type="button"
            >
              <ActionIcon action={action} />
              <span className="font-medium">{action.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
