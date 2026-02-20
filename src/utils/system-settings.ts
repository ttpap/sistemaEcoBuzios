const SYSTEM_LOGO_KEY = "ecobuzios_system_logo";
const SYSTEM_LOGO_EVENT = "ecobuzios_system_logo_changed";

export function getSystemLogo(): string | null {
  return localStorage.getItem(SYSTEM_LOGO_KEY);
}

export function setSystemLogo(dataUrl: string | null) {
  if (!dataUrl) localStorage.removeItem(SYSTEM_LOGO_KEY);
  else localStorage.setItem(SYSTEM_LOGO_KEY, dataUrl);

  window.dispatchEvent(new Event(SYSTEM_LOGO_EVENT));
}

export function onSystemLogoChange(handler: () => void) {
  const on = () => handler();
  window.addEventListener(SYSTEM_LOGO_EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(SYSTEM_LOGO_EVENT, on);
    window.removeEventListener("storage", on);
  };
}
