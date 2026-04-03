import { Card, CardContent } from "./ui/card";
import type { Annotation } from "../types";

interface AnnotationSidebarProps {
  annotations: Annotation[];
}

export function AnnotationSidebar({ annotations }: AnnotationSidebarProps) {
  if (annotations.length === 0) return null;

  return (
    <aside className="flex flex-col gap-3 pt-10">
      {annotations.map((annotation) => (
        <Card key={annotation.id} className="border-l-3 border-l-indigo-500 text-sm">
          <CardContent className="p-3">
            <div className="mb-1 text-xs font-semibold text-gray-500">User</div>
            <blockquote className="mb-1.5 border-l-2 border-gray-300 pl-2 text-xs italic text-gray-500">
              {annotation.text}
            </blockquote>
            <p className="leading-snug text-gray-800">{annotation.comment}</p>
          </CardContent>
        </Card>
      ))}
    </aside>
  );
}
