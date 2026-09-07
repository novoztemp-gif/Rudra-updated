// Single source of truth for chart colors so every graph in Reports draws
// from the same palette as the rest of the app (see brand/accent in
// tailwind.config.js) instead of charting-library defaults.
export const CHART_COLORS = [
  "#223a54", // brand-700 (navy)
  "#c9a04a", // accent-400 (brass)
  "#5f7ea0", // brand-400
  "#8fa4bf", // brand-300
  "#93702f", // accent-600
  "#0e1b2c", // brand-900
  "#dbb96b", // accent-300
  "#2e4a68", // brand-600
];

export const CHART_GRID_COLOR = "#e2e8f0";
export const CHART_AXIS_COLOR = "#64748b";
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(14, 27, 44, 0.08)",
    fontSize: 12,
  },
  labelStyle: { fontWeight: 600, color: "#172a3f" },
};
