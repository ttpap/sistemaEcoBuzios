const SESSION_KEY = "ecobuzios_admin_session";
const PASSWORD_KEY = "ecobuzios_admin_password";

const ADMIN_LOGIN = "Pap";
const DEFAULT_ADMIN_PASSWORD = "aNtonio4500";

export function getAdminLogin() {
  return ADMIN_LOGIN;
}

export function getDefaultAdminPassword() {
  return DEFAULT_ADMIN_PASSWORD;
}

export function getAdminPassword() {
  return localStorage.getItem(PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
}

export function setAdminPassword(newPassword: string) {
  localStorage.setItem(PASSWORD_KEY, newPassword);
}

export function resetAdminPasswordToDefault() {
  localStorage.removeItem(PASSWORD_KEY);
}

export function isAdminLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === "1";
}

export function loginAdmin(input: { login: string; password: string }) {
  const ok = input.login === ADMIN_LOGIN && input.password === getAdminPassword();
  if (ok) localStorage.setItem(SESSION_KEY, "1");
  return ok;
}

export function logoutAdmin() {
  localStorage.removeItem(SESSION_KEY);
}