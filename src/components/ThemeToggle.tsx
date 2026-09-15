"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "lovebug-theme";

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#131A29" : "#FFF6F1");
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      setDark(localStorage.getItem(KEY) === "dark");
    } catch {}
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Modo claro" : "Modo nocturno"}
      className="flex h-11 w-11 items-center justify-center rounded-full text-ink-ghost"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
