"use client";

import { useAtomValue, useSetAtom } from "jotai";
import {
  AlertTriangle,
  Check,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api, type Integration } from "@/lib/api-client";
import {
  integrationsAtom,
  integrationsVersionAtom,
} from "@/lib/integrations-store";
import type { IntegrationType } from "@/lib/types/integration";
import { getIntegration } from "@/plugins";
import { IntegrationFormDialog } from "@/components/settings/integration-form-dialog";

type IntegrationSelectorProps = {
  integrationType: IntegrationType;
  value?: string;
  onChange: (integrationId: string) => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
};

export function IntegrationSelector({
  integrationType,
  value,
  onChange,
  onOpenSettings,
  disabled,
}: IntegrationSelectorProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
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

  const handleValueChange = (newValue: string) => {
    if (newValue === "__new__") {
      setShowNewDialog(true);
    } else if (newValue === "__manage__") {
      onOpenSettings?.();
    } else {
      onChange(newValue);
    }
  };

  const handleNewIntegrationCreated = async (integrationId: string) => {
    await loadIntegrations();
    onChange(integrationId);
    setShowNewDialog(false);
    // Increment version to trigger auto-fix for other nodes that need this integration type
    setIntegrationsVersion((v) => v + 1);
  };

  if (loading) {
    return (
      <Select disabled value="">
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
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
          onClick={() => setShowNewDialog(true)}
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

  // Single integration - show connected state with manage button
  if (integrations.length === 1) {
    const integration = integrations[0];

    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            className="flex-1 justify-start gap-2 border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400"
            disabled={disabled}
            onClick={onOpenSettings}
            variant="outline"
          >
            <Check className="size-4" />
            <span className="flex-1 truncate text-left">{integration.name}</span>
            <Settings className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={disabled} size="icon" variant="ghost">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenSettings}>
                <Trash2 className="mr-2 size-4" />
                Remove Connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNewDialog(true)}>
                <Plus className="mr-2 size-4" />
                Add Another Connection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

  // Multiple integrations - show dropdown selector
  return (
    <>
      <Select
        disabled={disabled}
        onValueChange={handleValueChange}
        value={value}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select connection..." />
        </SelectTrigger>
        <SelectContent>
          {integrations.map((integration) => (
            <SelectItem key={integration.id} value={integration.id}>
              {integration.name}
            </SelectItem>
          ))}
          <Separator className="my-1" />
          <SelectItem value="__new__">Add Connection</SelectItem>
          <SelectItem value="__manage__">Manage Connections</SelectItem>
        </SelectContent>
      </Select>

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

