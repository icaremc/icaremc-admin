export function compareVersions(a: string, b: string): number {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const maxLen = Math.max(pa.length, pb.length);
  for (let i = 0; i < maxLen; i++) {
    const va = i < pa.length ? pa[i] : 0;
    const vb = i < pb.length ? pb[i] : 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

function parseVersionParts(version: string): number[] {
  return version
    .split(".")
    .map((part) => Number.parseInt(part.replace(/[^0-9]/g, ""), 10) || 0);
}

export function isBelowMinVersion(
  installedVersion: string,
  minVersion: string,
): boolean {
  const min = minVersion.trim();
  if (!min) return false;
  return compareVersions(installedVersion.trim(), min) < 0;
}
