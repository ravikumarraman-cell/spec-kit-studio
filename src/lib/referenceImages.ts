import type { ReferenceImage } from '../types/speckit';

/** Browser-safe image evidence: HTTPS references only, never embedded binary data. */
export function referenceImagesFromMarkdown(markdown: string): ReferenceImage[] {
  const images: ReferenceImage[] = [];
  const seen = new Set<string>();
  const pattern = /!\[([^\]]*)\]\((https:\/\/[^\s)]+)(?:\s+[^)]*)?\)/g;
  for (const match of markdown.matchAll(pattern)) {
    try {
      const url = new URL(match[2]);
      if (url.protocol !== 'https:' || seen.has(url.href)) continue;
      seen.add(url.href);
      images.push({ alt: match[1].slice(0, 240) || 'Reference image', url: url.href });
      if (images.length === 12) break;
    } catch { /* Ignore malformed or non-HTTPS markdown images. */ }
  }
  return images;
}
