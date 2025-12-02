import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { AxiomCredentials } from "../credentials";

const AXIOM_API_URL = "https://api.axiom.co";

type AxiomIngestResponse = {
  ingested: number;
  failed: number;
  failures?: Array<{ timestamp: string; error: string }>;
  processedBytes: number;
  blocksCreated: number;
  walLength: number;
};

type IngestEventsResult =
  | {
      success: true;
      ingested: number;
      failed: number;
      processedBytes: number;
    }
  | { success: false; error: string };

export type IngestEventsCoreInput = {
  dataset: string;
  events: string;
};

export type IngestEventsInput = StepInput &
  IngestEventsCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: IngestEventsCoreInput,
  credentials: AxiomCredentials
): Promise<IngestEventsResult> {
  const token = credentials.AXIOM_TOKEN;

  if (!token) {
    return {
      success: false,
      error:
        "AXIOM_TOKEN is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    // Parse the events JSON string
    let events: Array<Record<string, unknown>>;
    try {
      const parsed = JSON.parse(input.events) as unknown;
      // Support both single object and array
      events = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return {
        success: false,
        error:
          "Invalid JSON in events field. Expected an array of objects or a single object.",
      };
    }

    if (events.length === 0) {
      return {
        success: false,
        error: "No events to ingest. Events array is empty.",
      };
    }

    // Add timestamp to events that don't have one
    const eventsWithTimestamp = events.map((event) => {
      if (!event._time && !event.timestamp) {
        return { ...event, _time: new Date().toISOString() };
      }
      return event;
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (credentials.AXIOM_ORG_ID) {
      headers["X-Axiom-Org-Id"] = credentials.AXIOM_ORG_ID;
    }

    const response = await fetch(
      `${AXIOM_API_URL}/v1/datasets/${encodeURIComponent(input.dataset)}/ingest`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(eventsWithTimestamp),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText) as { message?: string };
        errorMessage = errorJson.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }
      return {
        success: false,
        error: `Ingest failed: ${errorMessage}`,
      };
    }

    const result = (await response.json()) as AxiomIngestResponse;

    if (result.failed > 0 && result.failures?.length) {
      return {
        success: false,
        error: `Ingest partially failed: ${result.failures[0].error}`,
      };
    }

    return {
      success: true,
      ingested: result.ingested,
      failed: result.failed,
      processedBytes: result.processedBytes,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to ingest events: ${getErrorMessage(error)}`,
    };
  }
}

export async function ingestEventsStep(
  input: IngestEventsInput
): Promise<IngestEventsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "axiom";
