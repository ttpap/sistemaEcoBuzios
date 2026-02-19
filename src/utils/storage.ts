import { getActiveProjectId, getProjectScopedKey } from "@/utils/projects";

export type BaseKey = "students" | "classes" | "teachers" | "attendance";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function requireActiveProjectId() {
  const id = getActiveProjectId();
  if (!id) throw new Error("Nenhum projeto selecionado");
  return id;
}

export function scopedKey(baseKey: BaseKey) {
  const pid = requireActiveProjectId();
  return getProjectScopedKey(pid, baseKey);
}

export function readScoped<T>(baseKey: BaseKey, fallback: T): T {
  const key = scopedKey(baseKey);
  return safeParse<T>(localStorage.getItem(key), fallback);
}

export function writeScoped<T>(baseKey: BaseKey, value: T) {
  const key = scopedKey(baseKey);
  localStorage.setItem(key, JSON.stringify(value));
}

export function hasActiveProject() {
  return Boolean(getActiveProjectId());
}
