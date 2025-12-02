const AXIOM_API_URL = "https://api.axiom.co";

type AxiomUserResponse = {
  id: string;
  name: string;
  email: string;
};

export async function testAxiom(credentials: Record<string, string>) {
  try {
    const token = credentials.AXIOM_TOKEN;
    const orgId = credentials.AXIOM_ORG_ID;

    if (!token) {
      return {
        success: false,
        error: "AXIOM_TOKEN is required",
      };
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (orgId) {
      headers["X-Axiom-Org-Id"] = orgId;
    }

    const response = await fetch(`${AXIOM_API_URL}/v1/user`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Invalid API token" };
      }
      if (response.status === 403) {
        return {
          success: false,
          error: "Access denied. Check your token permissions.",
        };
      }
      return { success: false, error: `API error: HTTP ${response.status}` };
    }

    const user = (await response.json()) as AxiomUserResponse;

    if (!user.id) {
      return { success: false, error: "Invalid response from Axiom API" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
