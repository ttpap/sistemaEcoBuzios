export type CoordinatorMonthlyReportSectionKey = "strategy" | "adaptation" | "observation";

export type CoordinatorMonthlyReport = {
  id: string;
  projectId: string;
  coordinatorId: string;

  /** YYYY-MM */
  month: string;

  strategyHtml: string;
  adaptationHtml: string;
  observationHtml: string;

  createdAt: string;
  updatedAt: string;
  /** When coordinator clicks submit/send */
  submittedAt?: string;
};
