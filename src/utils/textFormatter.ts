/**
 * Cleans raw technical extraction coordinates (like [x=77.8]) for human-readable display.
 */
export function cleanExtractedText(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => {
      // Remove [x=123.4] tokens
      const cleaned = line.replace(/\[x=\d+(\.\d+)?\]\s*/g, "").trim();
      return cleaned;
    })
    .filter((line) => line.length > 0)
    .join("\n");
}
