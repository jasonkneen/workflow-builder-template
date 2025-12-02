import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { AxiomCredentials } from "../credentials";

const AXIOM_API_URL = "https://api.axiom.co";

type AxiomQueryStatus = {
  elapsedTime: number;
  blocksExamined: number;
  rowsExamined: number;
  rowsMatched: number;
  numGroups: number;
  isPartial: boolean;
  minBlockTime: string;
  maxBlockTime: string;
};

type AxiomQueryResponse = {
  status: AxiomQueryStatus;
  matches: Array<Record<string, unknown>>;
  buckets?: {
    totals?: Array<Record<string, unknown>>;
  };
};

type QueryLogsResult =
  | {
      success: true;
      matches: Array<Record<string, unknown>>;
      count: number;
      status: AxiomQueryStatus;
    }
  | { success: false; error: string };

export type QueryLogsCoreInput = {
  dataset: string;
  apl: string;
  startTime?: string;
  endTime?: string;
};

export type QueryLogsInput = StepInput &
  QueryLogsCoreInput & {
    integrationId?: string;
  };

function parseRelativeTime(time: string): string {
  if (!time || time === "now") {
    return new Date().toISOString();
  }

  // Handle relative time like -1h, -30m, -7d
  const match = time.match(/^-(\d+)([mhdw])$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
      case "m":
        now.setMinutes(now.getMinutes() - value);
        break;
      case "h":
        now.setHours(now.getHours() - value);
        break;
      case "d":
        now.setDate(now.getDate() - value);
        break;
      case "w":
        now.setDate(now.getDate() - value * 7);
        break;
    }

    return now.toISOString();
  }

  // Assume it's already an ISO date string
  return time;
}

async function stepHandler(
  input: QueryLogsCoreInput,
  credentials: AxiomCredentials
): Promise<QueryLogsResult> {
  const token = credentials.AXIOM_TOKEN;

  if (!token) {
    return {
      success: false,
      error:
        "AXIOM_TOKEN is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (credentials.AXIOM_ORG_ID) {
      headers["X-Axiom-Org-Id"] = credentials.AXIOM_ORG_ID;
    }

    const body: Record<string, unknown> = {
      apl: input.apl,
    };

    if (input.startTime) {
      body.startTime = parseRelativeTime(input.startTime);
    }

    if (input.endTime) {
      body.endTime = parseRelativeTime(input.endTime);
    }

    const response = await fetch(`${AXIOM_API_URL}/v1/datasets/_apl`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

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
        error: `Query failed: ${errorMessage}`,
      };
    }

    const result = (await response.json()) as AxiomQueryResponse;

    return {
      success: true,
      matches: result.matches || [],
      count: result.matches?.length || 0,
      status: result.status,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to query logs: ${getErrorMessage(error)}`,
    };
  }
}

export async function queryLogsStep(
  input: QueryLogsInput
): Promise<QueryLogsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "axiom";
