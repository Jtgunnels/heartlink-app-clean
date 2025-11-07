// Centralized category → color/styles map used across table, badges, dots, and cards.

export const CATEGORY_ORDER = ["Active", "Worsening", "Improved", "Stable"]; 
// Put most-urgent to least-urgent for visual grouping

export const CATEGORY_STYLES = {
  Active:   { bg: "#FDE7E7", text: "#8F1D1D", dot: "#F26868", border: "#F5B1B1" },
  Worsening:{ bg: "#FBEDE6", text: "#7C330D", dot: "#E7906E", border: "#F2C7B3" },
  Improved: { bg: "#E9F7F2", text: "#0E5A47", dot: "#2AA783", border: "#B8E5D6" },
  Stable:   { bg: "#EEF4FA", text: "#103456", dot: "#6CB88F", border: "#C9D9EB" },
};

export function getCategoryStyle(cat = "Stable") {
  return CATEGORY_STYLES[cat] || CATEGORY_STYLES.Stable;
}
