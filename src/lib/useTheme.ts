import { useEffect, useState } from "react";

const STORAGE_KEY = "meal-tracker-theme";
type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // No explicit choice yet - default to the OS/browser preference
  // rather than always starting light.
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applies/removes the `dark` class on <html> (which tailwind.config's
 * darkMode: "class" reads) and persists the choice - shared by every
 * component that needs to read or change the current theme, so there's
 * one source of truth rather than each place tracking its own copy. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}