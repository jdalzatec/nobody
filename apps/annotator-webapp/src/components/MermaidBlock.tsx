import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

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
      <pre className="my-6 overflow-x-auto rounded-md border border-yellow-400 bg-yellow-50 p-4 text-yellow-800">
        <code className="bg-transparent text-sm text-inherit">{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
