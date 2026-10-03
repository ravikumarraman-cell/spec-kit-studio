import { SpecAuditResult } from '../types/speckit';

/** Advisory wording must not trap a user in a quality-gate loop. */
export function auditBlockers(audit: SpecAuditResult | undefined) {
  if (!audit) return [];
  const requiredLanguage = /\b(block(?:ing|ed)?|must|required|missing|cannot|failed?|error|conflict|ambigu)/i;
  return [...audit.gaps, ...audit.ambiguities].filter((finding) => requiredLanguage.test(finding));
}

export function auditPassesQualityGate(audit: SpecAuditResult | undefined) {
  return Boolean(audit && audit.overallScore >= 90 && auditBlockers(audit).length === 0);
}
