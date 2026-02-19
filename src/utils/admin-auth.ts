const SESSION_KEY = "ecobuzios_admin_session";

const ADMIN_LOGIN = "Pap";
const ADMIN_PASSWORD = "aNtonio4500";

export function isAdminLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === "1";
}

export function loginAdmin(input: { login: string; password: string }) {
  const ok = input.login === ADMIN_LOGIN && input.password === ADMIN_PASSWORD;
  if (ok) localStorage.setItem(SESSION_KEY, "1");
  return ok;
}

export function logoutAdmin() {
  localStorage.removeItem(SESSION_KEY);
}
