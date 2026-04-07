import { extractAnnotationsFromMarkdown } from "./remark-critic-markup";

/** Escape closing CriticMarkup delimiters inside a comment string. */
function escapeComment(comment: string): string {
  return comment.replace(/<<\}/g, "\\<<}").replace(/==\}/g, "\\==}");
}

/**
 * Expand start/end past formatting markers so that {== and ==} don't
 * split paired markers like **, *, `, __, ~~ etc.
 */
function expandPastFormatting(
  source: string,
  start: number,
  end: number,
): { start: number; end: number } {
  const markers = ["**", "__", "~~", "`", "*", "_"];

  for (const m of markers) {
    const len = m.length;
    const hasOpenBefore = start >= len && source.slice(start - len, start) === m;
    const hasCloseAfter = end + len <= source.length && source.slice(end, end + len) === m;
    const textBetween = source.slice(start, end);

    // Case 1: start is right after an opening marker, and either
    // the text contains the closing marker or the closing marker is right after end.
    if (hasOpenBefore && (textBetween.includes(m) || hasCloseAfter)) {
      start -= len;
    }

    // Case 2: end is right before a closing marker, and either
    // the text contains the opening marker or start was already expanded.
    if (
      hasCloseAfter &&
      (source.slice(start, end).includes(m) ||
        (start >= 0 && source.slice(start, start + len) === m))
    ) {
      end += len;
    }
  }

  return { start, end };
}

/**
 * Insert a CriticMarkup annotation around the text between `start` and `end`.
 * Trims whitespace from boundaries and expands past formatting markers
 * (e.g. `**`, backticks) to avoid splitting them.
 */
export function insertAnnotation(
  markdown: string,
  start: number,
  end: number,
  comment: string,
): string {
  let s = start;
  let e = end;
  while (s < e && markdown[s] === " ") s++;
  while (e > s && markdown[e - 1] === " ") e--;

  const expanded = expandPastFormatting(markdown, s, e);
  s = expanded.start;
  e = expanded.end;

  const before = markdown.slice(0, s);
  const selected = markdown.slice(s, e);
  const after = markdown.slice(e);
  return `${before}{==${selected}==}{>>${escapeComment(comment)}<<}${after}`;
}

/** Remove the annotation at `annotationIndex`, restoring its original text. */
export function deleteAnnotation(markdown: string, annotationIndex: number): string {
  const annotations = extractAnnotationsFromMarkdown(markdown);
  if (annotationIndex < 0 || annotationIndex >= annotations.length) return markdown;
  const ann = annotations[annotationIndex];
  const before = markdown.slice(0, ann.sourceStart);
  const after = markdown.slice(ann.sourceEnd);
  return `${before}${ann.text}${after}`;
}

/** Replace the comment of the annotation at `annotationIndex` with `newComment`. */
export function editAnnotation(
  markdown: string,
  annotationIndex: number,
  newComment: string,
): string {
  const annotations = extractAnnotationsFromMarkdown(markdown);
  if (annotationIndex < 0 || annotationIndex >= annotations.length) return markdown;
  const ann = annotations[annotationIndex];
  const before = markdown.slice(0, ann.sourceStart);
  const after = markdown.slice(ann.sourceEnd);
  return `${before}{==${ann.text}==}{>>${escapeComment(newComment)}<<}${after}`;
}
