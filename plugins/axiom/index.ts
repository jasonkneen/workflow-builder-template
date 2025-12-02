import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { AxiomIcon } from "./icon";

const axiomPlugin: IntegrationPlugin = {
  type: "axiom",
  label: "Axiom",
  description: "Query logs, ingest events, and create annotations in Axiom",

  icon: AxiomIcon,

  formFields: [
    {
      id: "token",
      label: "API Token",
      type: "password",
      placeholder: "xaat-...",
      configKey: "token",
      envVar: "AXIOM_TOKEN",
      helpText: "Get your API token from ",
      helpLink: {
        text: "app.axiom.co/settings/api-tokens",
        url: "https://app.axiom.co/settings/api-tokens",
      },
    },
    {
      id: "orgId",
      label: "Organization ID",
      type: "text",
      placeholder: "my-org-123",
      configKey: "orgId",
      envVar: "AXIOM_ORG_ID",
      helpText: "Required for personal tokens. Find it in your org settings.",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testAxiom } = await import("./test");
      return testAxiom;
    },
  },

  actions: [
    {
      slug: "query-logs",
      label: "Query Logs",
      description: "Run an APL query against an Axiom dataset",
      category: "Axiom",
      stepFunction: "queryLogsStep",
      stepImportPath: "query-logs",
      outputFields: [
        { field: "matches", description: "Array of matching log entries" },
        { field: "count", description: "Number of results returned" },
        { field: "status.elapsedTime", description: "Query execution time" },
      ],
      configFields: [
        {
          key: "dataset",
          label: "Dataset",
          type: "template-input",
          placeholder: "my-dataset",
          example: "vercel",
          required: true,
        },
        {
          key: "apl",
          label: "APL Query",
          type: "template-textarea",
          placeholder:
            "['my-dataset'] | where level == 'error' | limit 100",
          example: "['vercel'] | where level == 'error' | limit 10",
          rows: 4,
          required: true,
        },
        {
          key: "startTime",
          label: "Start Time",
          type: "template-input",
          placeholder: "2024-01-01T00:00:00Z or -1h",
          example: "-1h",
        },
        {
          key: "endTime",
          label: "End Time",
          type: "template-input",
          placeholder: "2024-01-01T23:59:59Z or now",
          example: "now",
        },
      ],
    },
    {
      slug: "ingest-events",
      label: "Ingest Events",
      description: "Send log events to an Axiom dataset",
      category: "Axiom",
      stepFunction: "ingestEventsStep",
      stepImportPath: "ingest-events",
      outputFields: [
        { field: "ingested", description: "Number of events ingested" },
        { field: "processedBytes", description: "Bytes processed" },
      ],
      configFields: [
        {
          key: "dataset",
          label: "Dataset",
          type: "template-input",
          placeholder: "my-dataset",
          example: "workflow-logs",
          required: true,
        },
        {
          key: "events",
          label: "Events (JSON)",
          type: "template-textarea",
          placeholder:
            '[{"level": "info", "message": "Hello"}] or {{NodeName.data}}',
          example: '[{"level": "info", "message": "Workflow executed"}]',
          rows: 6,
          required: true,
        },
      ],
    },
    {
      slug: "create-annotation",
      label: "Create Annotation",
      description:
        "Create an annotation to mark deployments, incidents, or events",
      category: "Axiom",
      stepFunction: "createAnnotationStep",
      stepImportPath: "create-annotation",
      outputFields: [
        { field: "id", description: "Annotation ID" },
        { field: "time", description: "Annotation timestamp" },
      ],
      configFields: [
        {
          key: "datasets",
          label: "Datasets",
          type: "template-input",
          placeholder: "dataset1,dataset2",
          example: "vercel,api-logs",
          required: true,
        },
        {
          key: "type",
          label: "Type",
          type: "select",
          options: [
            { value: "deploy", label: "Deployment" },
            { value: "incident", label: "Incident" },
            { value: "config-change", label: "Config Change" },
            { value: "alert", label: "Alert" },
            { value: "other", label: "Other" },
          ],
          defaultValue: "deploy",
        },
        {
          key: "title",
          label: "Title",
          type: "template-input",
          placeholder: "Production deployment v1.2.3",
          example: "Deployed v1.2.3",
          required: true,
        },
        {
          key: "description",
          label: "Description",
          type: "template-textarea",
          placeholder: "Additional details about this annotation",
          example: "Deployed new feature: user authentication",
          rows: 3,
        },
        {
          key: "url",
          label: "URL",
          type: "template-input",
          placeholder: "https://github.com/org/repo/releases/tag/v1.2.3",
          example: "https://github.com/myorg/myrepo/releases",
        },
      ],
    },
    {
      slug: "list-datasets",
      label: "List Datasets",
      description: "Get all available datasets in your Axiom organization",
      category: "Axiom",
      stepFunction: "listDatasetsStep",
      stepImportPath: "list-datasets",
      outputFields: [
        { field: "datasets", description: "Array of dataset objects" },
        { field: "count", description: "Number of datasets" },
      ],
      configFields: [],
    },
  ],
};

registerIntegration(axiomPlugin);

export default axiomPlugin;
