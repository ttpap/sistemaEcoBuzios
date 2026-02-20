export type MonthlyReportSectionKey = "strategy" | "adaptation" | "observation";

export type MonthlyReport = {
  id: string;
  projectId: string;
  teacherId: string;

  /** YYYY-MM */
  month: string;

  strategyHtml: string;
  adaptationHtml: string;
  observationHtml: string;

  reflexiveStudentId?: string;
  positiveStudentId?: string;

  createdAt: string;
  updatedAt: string;
  /** When teacher clicks submit/send */
  submittedAt?: string;
};
