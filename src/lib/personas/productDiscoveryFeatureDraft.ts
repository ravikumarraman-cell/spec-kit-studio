import { FeatureExtractionPackage } from '../api/imports';
import { FunctionalRequirement, Priority, RequirementCategory, UserStory } from '../../types/speckit';

type RecordValue = Record<string, unknown>;
const priorities = new Set<Priority>(['High', 'Medium', 'Low']);
const categories = new Set<RequirementCategory>(['Core', 'UI/UX', 'API', 'Database', 'Security', 'Performance', 'Integration']);
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value.trim() : fallback;
const list = (value: unknown) => Array.isArray(value) ? value : [];

function jsonObject(output: string): RecordValue | undefined {
  for (let start = 0; start < output.length; start += 1) {
    if (output[start] !== '{') continue;
    let depth = 0; let quoted = false; let escaped = false;
    for (let end = start; end < output.length; end += 1) {
      const char = output[end];
      if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; continue; }
      if (char === '"') { quoted = true; continue; }
      if (char === '{') depth += 1;
      if (char === '}') { depth -= 1; if (depth === 0) { try { const value = JSON.parse(output.slice(start, end + 1)); if (value && typeof value === 'object') return value as RecordValue; } catch { /* try the next JSON object */ } } }
    }
  }
  return undefined;
}

/** Product discovery prompt deliberately knows no repository details. */
export function productDiscoveryFeaturePrompt(title: string, source: string): string {
  return `Prepare a reviewable Product Manager Spec-Kit intake from the supplied source. Use only the source; mark uncertainty as an assumption or open question. Do not invent repository behavior, technical design, customer data, or metrics. Return ONLY one valid JSON object with this exact shape: {"title":"...","summary":"...","userStories":[{"id":"US-001","title":"...","priority":"High|Medium|Low","asA":"...","iWantTo":"...","soThat":"...","acceptanceCriteria":["..."],"requirementIds":["FR-001"]}],"functionalRequirements":[{"id":"FR-001","title":"...","description":"...","category":"Core|UI/UX|API|Database|Security|Performance|Integration","priority":"High|Medium|Low"}]}. Return one to five independently reviewable user stories and at least one testable acceptance criterion per story.\n\nFeature title: ${title}\n\nSource:\n---\n${source}\n---`;
}

/** Bounded parser shared by the Product Manager connector path and future
 * personas that emit the standard FeatureExtractionPackage contract. */
export function parseProductDiscoveryFeatureDraft(output: string, source: string): FeatureExtractionPackage | undefined {
  const value = jsonObject(output);
  if (!value) return undefined;
  const userStories = list(value.userStories).slice(0, 5).flatMap((item, index): UserStory[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as RecordValue;
    const asA = text(record.asA); const iWantTo = text(record.iWantTo); const soThat = text(record.soThat);
    const acceptanceCriteria = list(record.acceptanceCriteria).map((criterion) => text(criterion)).filter(Boolean).slice(0, 12);
    if (!asA || !iWantTo || !soThat || !acceptanceCriteria.length) return [];
    return [{ id: text(record.id, `US-${String(index + 1).padStart(3, '0')}`), title: text(record.title, iWantTo), priority: priorities.has(record.priority as Priority) ? record.priority as Priority : 'Medium', asA, iWantTo, soThat, acceptanceCriteria, requirementIds: list(record.requirementIds).map((id) => text(id)).filter(Boolean).slice(0, 12) }];
  });
  const functionalRequirements = list(value.functionalRequirements).slice(0, 20).flatMap((item, index): FunctionalRequirement[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as RecordValue;
    const description = text(record.description); if (!description) return [];
    return [{ id: text(record.id, `FR-${String(index + 1).padStart(3, '0')}`), title: text(record.title, description.slice(0, 100)), description, category: categories.has(record.category as RequirementCategory) ? record.category as RequirementCategory : 'Core', priority: priorities.has(record.priority as Priority) ? record.priority as Priority : 'Medium' }];
  });
  if (!userStories.length || !functionalRequirements.length) return undefined;
  return { title: text(value.title, 'Product outcome'), summary: text(value.summary, source.slice(0, 2_000)), sourceContent: source, userStories, functionalRequirements };
}
