"use client";

import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, type Integration } from "@/lib/api-client";
import type { IntegrationType } from "@/lib/types/integration";
import {
  getIntegration,
  getIntegrationLabels,
  getSortedIntegrationTypes,
} from "@/plugins";

type IntegrationFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (integrationId: string) => void;
  integration?: Integration | null;
  mode: "create" | "edit";
  preselectedType?: IntegrationType;
};

type IntegrationFormData = {
  name: string;
  type: IntegrationType | null;
  config: Record<string, string>;
};

// System integrations that don't have plugins
const SYSTEM_INTEGRATION_TYPES: IntegrationType[] = ["database"];
const SYSTEM_INTEGRATION_LABELS: Record<string, string> = {
  database: "Database",
};

// Get all integration types (plugins + system)
const getIntegrationTypes = (): IntegrationType[] => [
  ...getSortedIntegrationTypes(),
  ...SYSTEM_INTEGRATION_TYPES,
];

// Get label for any integration type
const getLabel = (type: IntegrationType): string =>
  getIntegrationLabels()[type] || SYSTEM_INTEGRATION_LABELS[type] || type;

export function IntegrationFormDialog({
  open,
  onClose,
  onSuccess,
  integration,
  mode,
  preselectedType,
}: IntegrationFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<IntegrationFormData>({
    name: "",
    type: preselectedType || null,
    config: {},
  });

  // Step: "select" for type selection list, "configure" for form
  const [step, setStep] = useState<"select" | "configure">(
    preselectedType || mode === "edit" ? "configure" : "select"
  );

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        type: integration.type,
        config: {},
      });
      setStep("configure");
    } else {
      setFormData({
        name: "",
        type: preselectedType || null,
        config: {},
      });
      setStep(preselectedType ? "configure" : "select");
    }
  }, [integration, preselectedType]);

  const handleSelectType = (type: IntegrationType) => {
    setFormData({
      name: "",
      type,
      config: {},
    });
    setStep("configure");
  };

  const handleBack = () => {
    setStep("select");
    setSearchQuery("");
    setFormData({
      name: "",
      type: null,
      config: {},
    });
  };

  const handleSave = async () => {
    if (!formData.type) {
      return;
    }

    try {
      setSaving(true);

      const integrationName = formData.name.trim();

      if (mode === "edit" && integration) {
        await api.integration.update(integration.id, {
          name: integrationName,
          config: formData.config,
        });
        toast.success("Connection updated");
        onSuccess?.(integration.id);
      } else {
        const newIntegration = await api.integration.create({
          name: integrationName,
          type: formData.type,
          config: formData.config,
        });
        onSuccess?.(newIntegration.id);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save integration:", error);
      toast.error("Failed to save integration");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: string, value: string) => {
    setFormData({
      ...formData,
      config: { ...formData.config, [key]: value },
    });
  };

  const renderConfigFields = () => {
    if (!formData.type) {
      return null;
    }

    // Handle system integrations with hardcoded fields
    if (formData.type === "database") {
      return (
        <div className="space-y-2">
          <Label htmlFor="url">Database URL</Label>
          <Input
            id="url"
            onChange={(e) => updateConfig("url", e.target.value)}
            placeholder="postgresql://..."
            type="password"
            value={formData.config.url || ""}
          />
          <p className="text-muted-foreground text-xs">
            Connection string in the format:
            postgresql://user:password@host:port/database
          </p>
        </div>
      );
    }

    // Get plugin form fields from registry
    const plugin = getIntegration(formData.type);
    if (!plugin?.formFields) {
      return null;
    }

    return plugin.formFields.map((field) => (
      <div className="space-y-2" key={field.id}>
        <Label htmlFor={field.id}>{field.label}</Label>
        <Input
          id={field.id}
          onChange={(e) => updateConfig(field.configKey, e.target.value)}
          placeholder={field.placeholder}
          type={field.type}
          value={formData.config[field.configKey] || ""}
        />
        {(field.helpText || field.helpLink) && (
          <p className="text-muted-foreground text-xs">
            {field.helpText}
            {field.helpLink && (
              <a
                className="underline hover:text-foreground"
                href={field.helpLink.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {field.helpLink.text}
              </a>
            )}
          </p>
        )}
      </div>
    ));
  };

  const integrationTypes = getIntegrationTypes();

  const filteredIntegrationTypes = useMemo(() => {
    if (!searchQuery.trim()) {
      return integrationTypes;
    }
    const query = searchQuery.toLowerCase();
    return integrationTypes.filter((type) =>
      getLabel(type).toLowerCase().includes(query)
    );
  }, [integrationTypes, searchQuery]);

  const getDialogTitle = () => {
    if (mode === "edit") {
      return "Edit Connection";
    }
    if (step === "select") {
      return "Add Connection";
    }
    return `Add ${formData.type ? getLabel(formData.type) : ""} Connection`;
  };

  const getDialogDescription = () => {
    if (mode === "edit") {
      return "Update your connection credentials";
    }
    if (step === "select") {
      return "Select a service to connect";
    }
    return "Enter your credentials";
  };

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services..."
                value={searchQuery}
              />
            </div>
            <div className="max-h-[300px] space-y-1 overflow-y-auto">
              {filteredIntegrationTypes.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  No services found
                </p>
              ) : (
                filteredIntegrationTypes.map((type) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                    key={type}
                    onClick={() => handleSelectType(type)}
                    type="button"
                  >
                    <IntegrationIcon
                      className="size-5"
                      integration={type === "ai-gateway" ? "vercel" : type}
                    />
                    <span className="font-medium">{getLabel(type)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {renderConfigFields()}

            <div className="space-y-2">
              <Label htmlFor="name">Label (Optional)</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Production, Personal, Work"
                value={formData.name}
              />
            </div>
          </div>
        )}

        <DialogFooter
          className={step === "configure" ? "sm:justify-between" : ""}
        >
          {step === "configure" && mode === "create" && !preselectedType && (
            <Button disabled={saving} onClick={handleBack} variant="ghost">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          )}
          {step === "select" ? (
            <Button onClick={() => onClose()} variant="outline">
              Cancel
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                disabled={saving}
                onClick={() => onClose()}
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={saving} onClick={handleSave}>
                {saving ? <Spinner className="mr-2 size-4" /> : null}
                {mode === "edit" ? "Update" : "Create"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
