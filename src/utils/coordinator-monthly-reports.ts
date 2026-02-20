import type { CoordinatorMonthlyReport } from "@/types/coordinator-monthly-report";
import { getProjectScopedKey } from "@/utils/projects";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function key(projectId: string) {
  return getProjectScopedKey(projectId, "coordinator_monthly_reports");
}

export function getAllCoordinatorMonthlyReports(projectId: string): CoordinatorMonthlyReport[] {
  return safeParse<CoordinatorMonthlyReport[]>(localStorage.getItem(key(projectId)), []);
}

export function saveAllCoordinatorMonthlyReports(projectId: string, reports: CoordinatorMonthlyReport[]) {
  localStorage.setItem(key(projectId), JSON.stringify(reports));
}

export function upsertCoordinatorMonthlyReport(projectId: string, report: CoordinatorMonthlyReport) {
  const all = getAllCoordinatorMonthlyReports(projectId);
  const idx = all.findIndex((r) => r.id === report.id);
  const next = idx >= 0 ? all.map((r) => (r.id === report.id ? report : r)) : [report, ...all];
  saveAllCoordinatorMonthlyReports(projectId, next);
}

export function deleteCoordinatorMonthlyReport(projectId: string, reportId: string) {
  const all = getAllCoordinatorMonthlyReports(projectId);
  saveAllCoordinatorMonthlyReports(projectId, all.filter((r) => r.id !== reportId));
}

export function getCoordinatorMonthlyReportById(projectId: string, reportId: string) {
  return getAllCoordinatorMonthlyReports(projectId).find((r) => r.id === reportId) || null;
}

export function getCoordinatorMonthlyReportsByCoordinator(projectId: string, coordinatorId: string) {
  return getAllCoordinatorMonthlyReports(projectId).filter((r) => r.coordinatorId === coordinatorId);
}
