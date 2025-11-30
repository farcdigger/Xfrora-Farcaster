"use client";

import { useThemeMode } from "./ThemeProvider";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-300 transition-colors"
        aria-label="Toggle theme"
        disabled
      >
        <span className="inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white transition-transform"></span>
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
        isDark ? "bg-purple-600" : "bg-gray-300"
      }`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      role="switch"
      aria-checked={isDark}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
          isDark ? "translate-x-4" : "translate-x-0.5"
        }`}
      >
        <span className="flex h-full w-full items-center justify-center text-xs">
          {isDark ? "🌙" : "☀️"}
        </span>
      </span>
    </button>
  );
}

