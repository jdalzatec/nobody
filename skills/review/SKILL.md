---
name: review
description: Review and address CriticMarkup comments left on documents. Use when the user has annotated a research or a plan file (typically research_*.md or plan_*.md) with CriticMarkup highlights, and wants those notes addressed. Triggers include phrases like "review my comments", "address the notes", "process the feedback", "review the document", "handle the highlights", "go through my annotations", "I added a few notes to the document, address all the notes", "I added some notes, update the document accordingly", or when the user references a document that contains CriticMarkup syntax like {==...==}{>>...<<}. Also triggers when the user says "review" in the context of a previously created research or plan document, or when the user says they added notes/comments to a document and wants them addressed. Do NOT use for creating new research, new plan, writing code, or implementing fixes — this skill only reads comments, addresses them in the document, and reports back.
---

# Review

You review documents that have been annotated with CriticMarkup highlights and comments. Your job is to read every annotation, address it thoroughly in the document, and remove the CriticMarkup syntax once addressed. You do not implement code changes — you only improve the document itself.

# Input

The user should talk about a document (usually a research or a plan file previously created using `/research` or `/plan`).

## CriticMarkup Syntax Reference

The user leaves feedback using CriticMarkup highlight + comment pairs:

```
{==highlighted text==}{>>comment about it<<}
```

- `{==...==}` marks the highlighted passage the user is commenting on
- `{>>...<<}` contains the user's note or question about that passage

## Workflow

### Step 1 — Find and Parse All Annotations

Read the document and extract every CriticMarkup annotation. Build a list of all comments before making any changes. Each annotation has:

- **Location**: the section and surrounding context where it appears
- **Highlighted text**: the passage the user marked (if any)
- **Comment**: what the user wrote

### Step 2 — Address Each Annotation

Go through each annotation one by one. For each one, understand what the user is asking for and do the appropriate thing:

- **"expand on this"** / **"more detail"** — add depth to the highlighted section, drawing from the codebase if needed. Re-read relevant source files to provide the missing detail.
- **"unclear"** / **"confusing"** / **"what does this mean?"** — rewrite the passage for clarity. Don't just add a sentence — restructure if needed.
- **"is this accurate?"** / **"verify"** — go back to the code, verify the claim, and either confirm with evidence or correct it.
- **"missing X"** / **"what about Y?"** — research the missing topic and add it to the appropriate section.
- **"wrong"** / **"incorrect"** — investigate, find the correct information, and fix the passage.
- **"remove"** / **"not relevant"** — remove the highlighted content or section.
- **"move this to..."** — relocate the content as requested.
- **Questions** (anything ending in `?`) — answer the question by incorporating the answer into the document text naturally. Don't leave a Q&A — weave the answer into the prose.
- **General observations** — use your judgment. If the comment points out a problem, fix it. If it's a suggestion, incorporate it.

When addressing a comment requires going back to the codebase, do it. Read the files, trace the flows, verify the facts. The document you are reviewing should be more accurate and complete after your review, not less.

### Step 3 — Remove CriticMarkup Syntax

After addressing each annotation, remove the CriticMarkup syntax entirely. The addressed content should read as clean markdown — no `{== ==}`, `{>> <<}`, or any other CriticMarkup tags should remain.

### Step 4 — Save the Updated Document

Write the cleaned document back to the same file, overwriting the annotated version. The document should have zero CriticMarkup syntax remaining.

### Step 5 — Executive Summary

After saving, present a short executive summary to the user. This is your final output — keep it concise.

Format:

```
## Review Complete

Addressed N annotations in [filename].

1. **[Section or topic]** — [one sentence: what the comment asked for and what you did]
2. **[Section or topic]** — [one sentence]
3. ...

The updated document has been saved.
```

Rules for the summary:
- One line per annotation, numbered
- Each line states what the user commented and how you addressed it
- No filler — every line should be informative
- If you went back to the codebase to verify or expand something, mention it briefly
- Keep the entire summary short enough to scan in under 30 seconds

## Important Behavioral Notes

- **Address every single annotation.** Don't skip any. If you're unsure what a comment means, make your best interpretation and note it in the summary.
- **Don't implement code.** If a comment says "this should be fixed" about a bug described in the document, improve the document's description of the bug — don't go write a code fix.
- **Preserve the document's structure and voice.** You're editing, not rewriting. Keep the original document style and organization unless a comment specifically asks for restructuring.
- **Verify before you write.** If addressing a comment requires checking the codebase, check the codebase. Don't guess.
- **Clean output only.** The final document must have zero CriticMarkup syntax. Run a grep for `{==`, `{>>`, `{--`, `{++`, `{~~` to confirm before saving.

## After review

After addressing all of the comments, the user may want to annotate the new document version. So, use the /annotate given-document.md skill to serve the new document to the user and they can add more notes.
