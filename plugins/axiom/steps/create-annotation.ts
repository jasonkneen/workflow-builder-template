import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { AxiomCredentials } from "../credentials";

const AXIOM_API_URL = "https://api.axiom.co";

type AxiomAnnotationResponse = {
  id: string;
  datasets: string[];
  type: string;
  title: string;
  description?: string;
  url?: string;
  time: string;
  endTime?: string;
};

type CreateAnnotationResult =
  | {
      success: true;
      id: string;
      time: string;
      datasets: string[];
    }
  | { success: false; error: string };

export type CreateAnnotationCoreInput = {
  datasets: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
};

export type CreateAnnotationInput = StepInput &
  CreateAnnotationCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: CreateAnnotationCoreInput,
  credentials: AxiomCredentials
): Promise<CreateAnnotationResult> {
  const token = credentials.AXIOM_TOKEN;

  if (!token) {
    return {
      success: false,
      error:
        "AXIOM_TOKEN is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    // Parse comma-separated datasets
    const datasets = input.datasets
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    if (datasets.length === 0) {
      return {
        success: false,
        error: "At least one dataset is required",
      };
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (credentials.AXIOM_ORG_ID) {
      headers["X-Axiom-Org-Id"] = credentials.AXIOM_ORG_ID;
    }

    const body: Record<string, unknown> = {
      datasets,
      type: input.type || "deploy",
      title: input.title,
      time: new Date().toISOString(),
    };

    if (input.description) {
      body.description = input.description;
    }

    if (input.url) {
      body.url = input.url;
    }

    const response = await fetch(`${AXIOM_API_URL}/v2/annotations`, {
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
        error: `Failed to create annotation: ${errorMessage}`,
      };
    }

    const result = (await response.json()) as AxiomAnnotationResponse;

    return {
      success: true,
      id: result.id,
      time: result.time,
      datasets: result.datasets,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create annotation: ${getErrorMessage(error)}`,
    };
  }
}

export async function createAnnotationStep(
  input: CreateAnnotationInput
): Promise<CreateAnnotationResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "axiom";
