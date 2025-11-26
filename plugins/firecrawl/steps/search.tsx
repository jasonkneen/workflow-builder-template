import "server-only";

import FirecrawlApp from "@mendable/firecrawl-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessage } from "@/lib/utils";

/**
 * Firecrawl Search Step
 * Searches the web using Firecrawl
 */
export async function firecrawlSearchStep(input: {
  integrationId?: string;
  query: string;
  limit?: number;
  scrapeOptions?: {
    formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
  };
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
    const result = await firecrawl.search(input.query, {
      limit: input.limit ? Number(input.limit) : undefined,
      scrapeOptions: input.scrapeOptions,
    });

    // Return web results directly for easier access
    // e.g., {{Search.web[0].title}}, {{Search.web[0].url}}
    return {
      web: result.web,
    };
  } catch (error) {
    throw new Error(`Failed to search: ${getErrorMessage(error)}`);
  }
}

/**
 * Search Config Fields Component
 * UI for configuring the search action
 */
export function SearchConfigFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="query">Search Query</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="query"
          onChange={(value) => onUpdateConfig("query", value)}
          placeholder="Search query or {{NodeName.query}}"
          value={(config?.query as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="limit">Result Limit</Label>
        <Input
          disabled={disabled}
          id="limit"
          min={1}
          onChange={(e) => onUpdateConfig("limit", e.target.value)}
          placeholder="10"
          type="number"
          value={(config?.limit as string) || ""}
        />
      </div>
    </>
  );
}
