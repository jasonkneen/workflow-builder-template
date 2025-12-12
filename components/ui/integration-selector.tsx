"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { AlertTriangle, Check, Circle, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, type Integration } from "@/lib/api-client";
import {
  integrationsAtom,
  integrationsVersionAtom,
} from "@/lib/integrations-store";
import type { IntegrationType } from "@/lib/types/integration";
import { cn } from "@/lib/utils";
import { getIntegration } from "@/plugins";
import { IntegrationFormDialog } from "@/components/settings/integration-form-dialog";

type IntegrationSelectorProps = {
  integrationType: IntegrationType;
  value?: string;
  onChange: (integrationId: string) => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
  onAddConnection?: () => void;
};

export function IntegrationSelector({
  integrationType,
  value,
  onChange,
  disabled,
  onAddConnection,
}: IntegrationSelectorProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<Integration | null>(null);
  const integrationsVersion = useAtomValue(integrationsVersionAtom);
  const setGlobalIntegrations = useSetAtom(integrationsAtom);
  const setIntegrationsVersion = useSetAtom(integrationsVersionAtom);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const all = await api.integration.getAll();
      // Update global store so other components can access it
      setGlobalIntegrations(all);
      const filtered = all.filter((i) => i.type === integrationType);
      setIntegrations(filtered);

      // Auto-select if only one option and nothing selected yet
      if (filtered.length === 1 && !value) {
        onChange(filtered[0].id);
      }
    } catch (error) {
      console.error("Failed to load integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationType, integrationsVersion]);

  const handleNewIntegrationCreated = async (integrationId: string) => {
    await loadIntegrations();
    onChange(integrationId);
    setShowNewDialog(false);
    // Increment version to trigger auto-fix for other nodes that need this integration type
    setIntegrationsVersion((v) => v + 1);
  };

  const handleEditSuccess = async () => {
    await loadIntegrations();
    setEditingIntegration(null);
    setIntegrationsVersion((v) => v + 1);
  };

  const handleAddConnection = () => {
    if (onAddConnection) {
      onAddConnection();
    } else {
      setShowNewDialog(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <div className="h-8 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  const plugin = getIntegration(integrationType);
  const integrationLabel = plugin?.label || integrationType;

  // No integrations - show error button to add one
  if (integrations.length === 0) {
    return (
      <>
        <Button
          className="w-full justify-start gap-2 border-orange-500/50 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400"
          disabled={disabled}
          onClick={handleAddConnection}
          variant="outline"
        >
          <AlertTriangle className="size-4" />
          <span className="flex-1 text-left">
            Add {integrationLabel} connection
          </span>
          <Plus className="size-4" />
        </Button>

        <IntegrationFormDialog
          mode="create"
          onClose={() => setShowNewDialog(false)}
          onSuccess={handleNewIntegrationCreated}
          open={showNewDialog}
          preselectedType={integrationType}
        />
      </>
    );
  }

  // Show radio-style selection list
  return (
    <>
      <div className="flex flex-col gap-1">
        {integrations.map((integration) => {
          const isSelected = value === integration.id;
          const displayName =
            integration.name || `${integrationLabel} API Key`;
          return (
            <div
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-50"
              )}
              key={integration.id}
            >
              <button
                className="flex flex-1 items-center gap-2 text-left"
                disabled={disabled}
                onClick={() => onChange(integration.id)}
                type="button"
              >
                {isSelected ? (
                  <Check className="size-4 shrink-0" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{displayName}</span>
              </button>
              <Button
                className="size-6 shrink-0"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingIntegration(integration);
                }}
                size="icon"
                variant="ghost"
              >
                <Pencil className="size-3" />
              </Button>
            </div>
          );
        })}
      </div>

      <IntegrationFormDialog
        mode="create"
        onClose={() => setShowNewDialog(false)}
        onSuccess={handleNewIntegrationCreated}
        open={showNewDialog}
        preselectedType={integrationType}
      />

      {editingIntegration && (
        <IntegrationFormDialog
          integration={editingIntegration}
          mode="edit"
          onClose={() => setEditingIntegration(null)}
          onDelete={async () => {
            await loadIntegrations();
            setEditingIntegration(null);
            setIntegrationsVersion((v) => v + 1);
          }}
          onSuccess={handleEditSuccess}
          open
        />
      )}
    </>
  );
}

