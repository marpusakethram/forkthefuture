// Locating quoted evidence inside page text, tolerant to whitespace and unicode-form differences
// but never to changed words: a span either occurs in the page or it is rejected.

function normChar(ch: string): string {
  return ch.normalize("NFKC").toLowerCase();
}

interface Normalized {
  text: string;
  map: number[]; // normalized index -> original index
}

function normalize(src: string): Normalized {
  let text = "";
  const map: number[] = [];
  let lastWasSpace = true;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      if (!lastWasSpace) {
        text += " ";
        map.push(i);
        lastWasSpace = true;
      }
      continue;
    }
    // Ignore soft hyphens / zero-width characters that PDF extraction often inserts.
    if (/[­​-‍﻿]/.test(ch)) continue;
    const n = normChar(ch);
    for (const c of n) {
      text += c;
      map.push(i);
    }
    lastWasSpace = false;
  }
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    map.pop();
  }
  return { text, map };
}

export interface SpanLocation {
  start: number;
  end: number; // exclusive, in original page text
}

export function findSpan(pageText: string, span: string): SpanLocation | null {
  const needle = normalize(span).text;
  if (needle.length < 2) return null;
  const hay = normalize(pageText);
  const idx = hay.text.indexOf(needle);
  if (idx < 0) return null;
  const start = hay.map[idx];
  const end = hay.map[idx + needle.length - 1] + 1;
  return { start, end };
}
