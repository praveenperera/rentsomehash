import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem("theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const nextTheme = getPreferredTheme();

    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <SunIcon weight="bold" />
      ) : (
        <MoonIcon weight="bold" />
      )}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
