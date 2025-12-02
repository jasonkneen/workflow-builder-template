import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { AxiomCredentials } from "../credentials";

const AXIOM_API_URL = "https://api.axiom.co";

type AxiomDataset = {
  id: string;
  name: string;
  description?: string;
  who?: string;
  created: string;
};

type ListDatasetsResult =
  | {
      success: true;
      datasets: Array<{
        id: string;
        name: string;
        description?: string;
        created: string;
      }>;
      count: number;
    }
  | { success: false; error: string };

export type ListDatasetsCoreInput = Record<string, never>;

export type ListDatasetsInput = StepInput &
  ListDatasetsCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  _input: ListDatasetsCoreInput,
  credentials: AxiomCredentials
): Promise<ListDatasetsResult> {
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

    const response = await fetch(`${AXIOM_API_URL}/v1/datasets`, {
      method: "GET",
      headers,
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
        error: `Failed to list datasets: ${errorMessage}`,
      };
    }

    const rawDatasets = (await response.json()) as AxiomDataset[];

    const datasets = rawDatasets.map((ds) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      created: ds.created,
    }));

    return {
      success: true,
      datasets,
      count: datasets.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list datasets: ${getErrorMessage(error)}`,
    };
  }
}

export async function listDatasetsStep(
  input: ListDatasetsInput
): Promise<ListDatasetsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler({}, credentials));
}

export const _integrationType = "axiom";
