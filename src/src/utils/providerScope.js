export function providerPath(subpath = "") {
  const providerId = sessionStorage.getItem("providerId");
  if (!providerId) throw new Error("No providerId in session");
  return `providers/${providerId}${subpath ? `/${subpath}` : ""}`;
}
