import { CATEGORY_ORDER } from "./categoryStyles";

export function sortPatients(patients = []) {
  const sevIndex = (cat) => {
    const i = CATEGORY_ORDER.indexOf(cat);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };

  return [...patients].sort((a, b) => {
    // 1) Unreviewed first
    if (!!a.reviewed !== !!b.reviewed) return a.reviewed ? 1 : -1;

    // 2) Severity order (Active -> Worsening -> Improved -> Stable)
    const sa = sevIndex(a.aseCategory);
    const sb = sevIndex(b.aseCategory);
    if (sa !== sb) return sa - sb;

    // 3) Most recently updated first
    const da = a.lastUpdated ? Date.parse(a.lastUpdated) : 0;
    const db = b.lastUpdated ? Date.parse(b.lastUpdated) : 0;
    return db - da;
  });
}
