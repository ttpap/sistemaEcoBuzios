import { getActiveProjectId, getProjectScopedKey } from "@/utils/projects";

export type ProjectKey = "classes" | "teachers" | "attendance";

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

export function scopedKey(baseKey: ProjectKey) {
  const pid = requireActiveProjectId();
  return getProjectScopedKey(pid, baseKey);
}

export function readScoped<T>(baseKey: ProjectKey, fallback: T): T {
  const key = scopedKey(baseKey);
  return safeParse<T>(localStorage.getItem(key), fallback);
}

function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // Quota exceeded — drop cache and try once more without it
    try {
      localStorage.removeItem(key);
      localStorage.setItem(key, value);
    } catch {
      // Give up silently — cache is best-effort
      console.warn(`[storage] não foi possível salvar ${key}: cota excedida`);
    }
  }
}

export function writeScoped<T>(baseKey: ProjectKey, value: T) {
  const key = scopedKey(baseKey);
  safeSetItem(key, JSON.stringify(value));
}

// Students are global
export function readGlobalStudents<T>(fallback: T): T {
  return safeParse<T>(localStorage.getItem("ecobuzios_students"), fallback);
}

export function writeGlobalStudents<T>(value: T) {
  safeSetItem("ecobuzios_students", JSON.stringify(value));
}

export function hasActiveProject() {
  return Boolean(getActiveProjectId());
}