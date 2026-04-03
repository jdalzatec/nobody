import mermaid from "mermaid";
import { useEffect, useId, useState } from "react";

mermaid.initialize({ startOnLoad: false });

interface MermaidBlockProps {
  code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  const id = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const renderId = `mermaid-${id.replace(/:/g, "")}`;

    mermaid
      .render(renderId, code)
      .then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(rendered);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setSvg(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error || svg === null) {
    return (
      <pre className="mermaid-error">
        <code>{code}</code>
      </pre>
    );
  }

  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
