import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "default" | "amber";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("orbitx_theme");
      if (stored === "amber") return "amber";
    }
    return "default";
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === "default" ? "amber" : "default"));
  };

  useEffect(() => {
    localStorage.setItem("orbitx_theme", theme);
    if (theme === "amber") {
      document.documentElement.classList.add("theme-amber");
    } else {
      document.documentElement.classList.remove("theme-amber");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
