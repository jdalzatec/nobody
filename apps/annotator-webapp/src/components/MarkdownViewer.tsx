import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { MermaidBlock } from "./MermaidBlock";

interface MarkdownViewerProps {
  content: string;
}

const components: Components = {
  code({ className, children, ...rest }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const lang = match?.[1];
    const text = String(children).replace(/\n$/, "");

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
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
