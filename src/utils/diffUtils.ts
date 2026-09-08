/**
 * Utility for diffing object fields to populate audit record changes.
 * Captures "which field, from what, to what".
 */

export type FieldChange = { from?: any; to?: any };
export type FieldDiffMap = Record<string, FieldChange>;

const DEFAULT_IGNORED_KEYS = new Set([
  "updatedAt",
  "lastActivityDate",
  "latestActivityDate"
]);

/**
 * Compares two objects (before and after) and returns a map of changed fields
 * formatted as `{ [field]: { from: beforeValue, to: afterValue } }`.
 *
 * @param before - The original object prior to modification.
 * @param after - The update payload or modified object.
 * @param ignoredKeys - Optional list of keys to exclude from the diff.
 * @returns A map of changed fields, or undefined if no fields changed.
 */
export function diffFields(
  before: Record<string, any> | undefined | null,
  after: Record<string, any> | undefined | null,
  ignoredKeys?: string[]
): FieldDiffMap | undefined {
  if (!before || !after) return undefined;

  const ignoreSet = ignoredKeys ? new Set(ignoredKeys) : DEFAULT_IGNORED_KEYS;
  const changes: FieldDiffMap = {};

  // Compare every field present in the `after` updates
  for (const key of Object.keys(after)) {
    if (ignoreSet.has(key)) continue;

    const fromVal = before[key];
    const toVal = after[key];

    // Check equality via JSON serialization for deep objects/arrays and primitives
    const fromStr = fromVal !== undefined ? JSON.stringify(fromVal) : undefined;
    const toStr = toVal !== undefined ? JSON.stringify(toVal) : undefined;

    if (fromStr !== toStr) {
      changes[key] = {
        from: fromVal !== undefined ? fromVal : null,
        to: toVal !== undefined ? toVal : null
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}
