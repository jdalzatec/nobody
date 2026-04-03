import { useEffect, useState } from "react";
import { MarkdownViewer } from "./components/MarkdownViewer";
import "./App.css";

export function App() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/file.md")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load file.md (${res.status})`);
        }
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="loading">Loading…</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (content === null) {
    return null;
  }

  return (
    <div className="container">
      <MarkdownViewer content={content} />
    </div>
  );
}
