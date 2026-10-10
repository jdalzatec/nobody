import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useCallback, useState } from "react";

import type { Doc } from "../../types";

const COLLAPSED_KEY = "nobody:rail-collapsed";

interface DocRailProps {
  docs: Doc[];
  activeDocId: string | null;
  onSelect: (docId: string) => void;
}

function groupByDir(docs: Doc[]): [string, Doc[]][] {
  const groups = new Map<string, Doc[]>();
  for (const doc of docs) {
    const existing = groups.get(doc.dirLabel);
    if (existing) {
      existing.push(doc);
    } else {
      groups.set(doc.dirLabel, [doc]);
    }
  }
  return [...groups.entries()];
}

export function DocRail({ docs, activeDocId, onSelect }: DocRailProps) {
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSED_KEY) === "true",
  );

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <nav className={`doc-rail${collapsed ? " collapsed" : ""}`} aria-label="Open documents">
      <div className="doc-rail-header">
        {!collapsed && <span className="doc-rail-title">Documents</span>}
        <Tooltip title={collapsed ? "Expand" : "Collapse"}>
          <Button
            type="text"
            size="small"
            aria-label={collapsed ? "Expand document rail" : "Collapse document rail"}
            icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
            onClick={toggle}
          />
        </Tooltip>
      </div>

      {!collapsed &&
        (docs.length === 0 ? (
          <p className="doc-rail-empty">No documents open</p>
        ) : (
          groupByDir(docs).map(([dirLabel, groupDocs]) => (
            <div className="doc-rail-group" key={dirLabel}>
              <p className="doc-rail-group-label">{dirLabel}</p>
              <ul className="doc-rail-list">
                {groupDocs.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      className={`doc-rail-item${doc.id === activeDocId ? " active" : ""}`}
                      aria-current={doc.id === activeDocId ? "page" : undefined}
                      onClick={() => {
                        onSelect(doc.id);
                      }}
                    >
                      <span className="doc-rail-item-title">{doc.title}</span>
                      <span className="doc-rail-item-filename">{doc.filename}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ))}
    </nav>
  );
}
