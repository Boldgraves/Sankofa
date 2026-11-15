import { createContext, useContext } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "sankofa-theme";

export const ThemeContext = createContext<Theme>("dark");

export const useTheme = () => useContext(ThemeContext);

interface Palette {
  gaugeTrack: string;
  chartGrid: string;
  chartAxis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  mapBg: string;
  mapStroke: string;
  mapLabel: string;
  siteDot: string;
  siteDotStroke: string;
}

const DARK: Palette = {
  gaugeTrack: "#21262d",
  chartGrid: "#21262d",
  chartAxis: "#8b949e",
  tooltipBg: "#161b22",
  tooltipBorder: "#30363d",
  tooltipText: "#e6edf3",
  mapBg: "#0d1117",
  mapStroke: "#0d1117",
  mapLabel: "#8b949e",
  siteDot: "#e6edf3",
  siteDotStroke: "#0d1117",
};

const LIGHT: Palette = {
  gaugeTrack: "#e0e0e0",
  chartGrid: "#e0e0e0",
  chartAxis: "#5a5a5a",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e0e0e0",
  tooltipText: "#1a1a1a",
  mapBg: "#f5f5f5",
  mapStroke: "#f5f5f5",
  mapLabel: "#5a5a5a",
  siteDot: "#1a1a1a",
  siteDotStroke: "#ffffff",
};

export const paletteFor = (theme: Theme): Palette => (theme === "light" ? LIGHT : DARK);
