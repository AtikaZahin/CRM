import { useColorScheme } from "react-native";

export const lightColors = {
  bg: "#f7f6fb",
  surface: "#ffffff",
  surface2: "#f2f0fa",
  blush: "#f1edfd",
  sage: "#eef4ff",
  rose: "#7c3aed",
  roseDark: "#6d28d9",
  pink: "#db2777",
  blue: "#2563eb",
  ink: "#1c1a33",
  muted: "#6b6887",
  border: "#e7e4f2",
  border3: "#c4b5fd",
  danger: "#e11d48",
  gradPrimary: ["#7c3aed", "#4f46e5"] as const,
  gradBrand: ["#ec4899", "#8b5cf6", "#3b82f6"] as const,
  statusOpenBg: "#fdf2f8",
  statusOpenColor: "#be185d",
  statusProgressBg: "#f3efff",
  statusProgressColor: "#6d28d9",
  statusResolvedBg: "#ecfdf5",
  statusResolvedColor: "#047857",
  statusCancelledBg: "#f1f5f9",
  statusCancelledColor: "#475569",
};

export const darkColors = {
  bg: "#0e0c1b",
  surface: "#161329",
  surface2: "#1d1935",
  blush: "#231d42",
  sage: "#172241",
  rose: "#a78bfa",
  roseDark: "#c4b5fd",
  pink: "#f472b6",
  blue: "#60a5fa",
  ink: "#ecebf7",
  muted: "#9d98bd",
  border: "#2a2547",
  border3: "#6d5bd0",
  danger: "#fb7185",
  gradPrimary: ["#8b5cf6", "#6366f1"] as const,
  gradBrand: ["#f472b6", "#a78bfa", "#60a5fa"] as const,
  statusOpenBg: "rgba(244, 114, 182, 0.14)",
  statusOpenColor: "#f9a8d4",
  statusProgressBg: "rgba(167, 139, 250, 0.16)",
  statusProgressColor: "#c4b5fd",
  statusResolvedBg: "rgba(52, 211, 153, 0.14)",
  statusResolvedColor: "#6ee7b7",
  statusCancelledBg: "rgba(148, 163, 184, 0.14)",
  statusCancelledColor: "#cbd5e1",
};

export type ThemeColors = typeof lightColors;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? darkColors : lightColors;
  return { colors, isDark, scheme };
}
