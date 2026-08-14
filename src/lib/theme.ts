export type ThemeMode = "dark" | "light" | "system";

const STORAGE_KEY = "vyro-theme";

export function getStoredTheme(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "dark" || v === "light" ? v : "system";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
