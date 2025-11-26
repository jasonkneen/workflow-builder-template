import "server-only";

import FirecrawlApp from "@mendable/firecrawl-js";
import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

/**
 * Firecrawl Scrape Step
 * Scrapes content from a URL using Firecrawl
 */
export async function firecrawlScrapeStep(input: {
  integrationId?: string;
  url: string;
  formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
}) {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.FIRECRAWL_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Firecrawl API Key is not configured.",
    };
  }

  try {
    const firecrawl = new FirecrawlApp({ apiKey });
    const result = await firecrawl.scrape(input.url, {
      formats: input.formats || ["markdown"],
    });

    // Return markdown and metadata directly for easier access
    // e.g., {{Scrape.markdown}}, {{Scrape.metadata.title}}
    return {
      markdown: result.markdown,
      metadata: result.metadata,
    };
  } catch (error) {
    throw new Error(`Failed to scrape: ${getErrorMessage(error)}`);
  }
}

/**
 * Scrape Config Fields Component
 * UI for configuring the scrape action
 */
export function ScrapeConfigFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="url">URL</Label>
      <TemplateBadgeInput
        disabled={disabled}
        id="url"
        onChange={(value) => onUpdateConfig("url", value)}
        placeholder="https://example.com or {{NodeName.url}}"
        value={(config?.url as string) || ""}
      />
    </div>
  );
}
