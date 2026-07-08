import { Preferences } from "@capacitor/preferences";

const APP_SESSION_KEY = "servicos-marketplace-session";

function isBrowserStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export async function loadSession() {
  try {
    const { value } = await Preferences.get({ key: APP_SESSION_KEY });
    if (value) {
      return JSON.parse(value);
    }
  } catch {
    // Fallback handled below.
  }

  if (!isBrowserStorageAvailable()) {
    return null;
  }

  const localValue = window.localStorage.getItem(APP_SESSION_KEY);
  return localValue ? JSON.parse(localValue) : null;
}

export async function saveSession(session) {
  const serialized = JSON.stringify(session);

  try {
    await Preferences.set({ key: APP_SESSION_KEY, value: serialized });
  } catch {
    // Fallback handled below.
  }

  if (isBrowserStorageAvailable()) {
    window.localStorage.setItem(APP_SESSION_KEY, serialized);
  }
}

export async function clearSession() {
  try {
    await Preferences.remove({ key: APP_SESSION_KEY });
  } catch {
    // Fallback handled below.
  }

  if (isBrowserStorageAvailable()) {
    window.localStorage.removeItem(APP_SESSION_KEY);
  }
}
