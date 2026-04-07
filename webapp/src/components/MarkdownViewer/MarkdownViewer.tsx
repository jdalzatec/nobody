import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import rehypeSourcePositions from "../../lib/rehype-source-positions";
import { stripCriticMarkup } from "../../lib/remark-critic-markup";
import { MermaidBlock } from "../MermaidBlock";

import type { ReactNode } from "react";
import type { Components } from "react-markdown";

interface MarkdownViewerProps {
  content: string;
}

function codeChildrenToPlainText(children: ReactNode): string {
  if (typeof children === "string") {
    return children.replace(/\n$/, "");
  }
  if (Array.isArray(children)) {
    return children
      .filter((part): part is string => typeof part === "string")
      .join("")
      .replace(/\n$/, "");
  }
  return "";
}

const components: Components = {
  code({ className, children, ...rest }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const lang = match?.[1];
    const text = codeChildrenToPlainText(children);

    if (lang === "mermaid") {
      return <MermaidBlock code={text} />;
    }

    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  },
};

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const stripped = useMemo(() => stripCriticMarkup(content), [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSourcePositions]}
      components={components}
    >
      {stripped}
    </ReactMarkdown>
  );
}
