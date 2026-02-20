import type { MonthlyReport } from "@/types/monthly-report";
import { getProjectScopedKey } from "@/utils/projects";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function key(projectId: string) {
  return getProjectScopedKey(projectId, "monthly_reports");
}

export function getAllMonthlyReports(projectId: string): MonthlyReport[] {
  return safeParse<MonthlyReport[]>(localStorage.getItem(key(projectId)), []);
}

export function saveAllMonthlyReports(projectId: string, reports: MonthlyReport[]) {
  localStorage.setItem(key(projectId), JSON.stringify(reports));
}

export function upsertMonthlyReport(projectId: string, report: MonthlyReport) {
  const all = getAllMonthlyReports(projectId);
  const idx = all.findIndex((r) => r.id === report.id);
  const next = idx >= 0 ? all.map((r) => (r.id === report.id ? report : r)) : [report, ...all];
  saveAllMonthlyReports(projectId, next);
}

export function deleteMonthlyReport(projectId: string, reportId: string) {
  const all = getAllMonthlyReports(projectId);
  saveAllMonthlyReports(projectId, all.filter((r) => r.id !== reportId));
}

export function getMonthlyReportsByTeacher(projectId: string, teacherId: string) {
  return getAllMonthlyReports(projectId).filter((r) => r.teacherId === teacherId);
}

export function getMonthlyReportById(projectId: string, reportId: string) {
  return getAllMonthlyReports(projectId).find((r) => r.id === reportId) || null;
}
