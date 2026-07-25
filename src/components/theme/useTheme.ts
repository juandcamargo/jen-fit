"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", pref);
  }
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem("jenfit-theme") as ThemePreference | null;
    setPreference(stored ?? "system");
  }, []);

  const setTheme = useCallback((pref: ThemePreference) => {
    setPreference(pref);
    if (pref === "system") {
      localStorage.removeItem("jenfit-theme");
    } else {
      localStorage.setItem("jenfit-theme", pref);
    }
    applyTheme(pref);
  }, []);

  return { preference, setTheme };
}
