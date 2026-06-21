"use client";

import katex from "katex";

type Segment =
  | { type: "text"; value: string }
  | { display?: boolean; type: "math"; value: string };

export default function MathText({
  className,
  text
}: {
  className?: string;
  text: string | number;
}) {
  const segments = parseMathSegments(String(text));

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") return <span key={index}>{segment.value}</span>;

        return (
          <span
            className={segment.display ? "math-display" : "math-inline"}
            dangerouslySetInnerHTML={{ __html: renderLatex(segment.value, segment.display) }}
            key={index}
          />
        );
      })}
    </span>
  );
}

function parseMathSegments(value: string): Segment[] {
  const explicit = parseExplicitLatex(value);
  return explicit.flatMap((segment) => {
    if (segment.type === "math") return [segment];
    return autoMathSegments(segment.value);
  });
}

function parseExplicitLatex(value: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([^)]+?\\\))/g;

  for (const match of value.matchAll(pattern)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ type: "text", value: value.slice(cursor, index) });

    const display = raw.startsWith("$$") || raw.startsWith("\\[");
    const latex = raw
      .replace(/^\$\$|\$\$$/g, "")
      .replace(/^\$|\$$/g, "")
      .replace(/^\\\[|\\\]$/g, "")
      .replace(/^\\\(|\\\)$/g, "");
    segments.push({ type: "math", value: latex, display });
    cursor = index + raw.length;
  }

  if (cursor < value.length) segments.push({ type: "text", value: value.slice(cursor) });
  return segments.length > 0 ? segments : [{ type: "text", value }];
}

function autoMathSegments(value: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /(\d+\s*\/\s*\d+|[A-Za-z]\^\d+|[A-Za-z]_\d+|\d+(?:\.\d+)?\s*(?:x|\*)\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*%|[A-Za-z]\s*=\s*-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?(?:\s*(?:x|\*)\s*-?\d+(?:\.\d+)?(?:\s*\+\s*-?\d+(?:\.\d+)?)?)?)/g;
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ type: "text", value: value.slice(cursor, index) });
    segments.push({ type: "math", value: toLatex(raw) });
    cursor = index + raw.length;
  }

  if (cursor < value.length) segments.push({ type: "text", value: value.slice(cursor) });
  return segments.length > 0 ? segments : [{ type: "text", value }];
}

function toLatex(value: string) {
  const compact = value.trim();
  const fraction = compact.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) return `\\frac{${fraction[1]}}{${fraction[2]}}`;

  return compact
    .replace(/\s*x\s/g, " \\times ")
    .replace(/\s*\*\s*/g, " \\times ")
    .replace(/%/g, "\\%")
    .replace(/\s+/g, " ");
}

function renderLatex(value: string, displayMode = false) {
  try {
    return katex.renderToString(value, {
      displayMode,
      output: "html",
      strict: false,
      throwOnError: false
    });
  } catch {
    return escapeHtml(value);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
