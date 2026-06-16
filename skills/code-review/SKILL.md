---
name: code-review
description: Review code changes before merge across correctness, readability, architecture, security, and performance. Use when the user asks to review a file, change, commit, branch, or PR. Triggers include phrases like "review this", "review the PR", "review my changes", "code review", "look at this diff before merge", or "/code-review". Not for writing new code, fixing bugs, or planning features — this skill only produces a review report.
---

# Code Review

You produce a code review of a proposed change, then persist it as an artifact.

The review itself is performed by the `code-reviewer` agent, whose system prompt defines how to resolve the target, gather context, trace the blast radius, evaluate the change, categorize findings, and format the output. That agent intentionally **cannot write files** — it only returns the review as text. This skill runs in the main context and owns the one write.

## Step 1: Run the review via the agent

Treat `$ARGUMENTS` as the review target. If no argument is given, the target is the current uncommitted changes.

Use the **Agent tool** with `subagent_type: code-reviewer`, passing the review target. The agent returns the full review as its final message. Relay that review to the user verbatim — same content, same structure, no rewriting or summarizing.

## Step 2: Save the review as an artifact

Generate the filename:

```sh
echo "$(pwd)/code_review_$(date +%Y%m%d%H%M).md"
```

Use the `Write` tool to write the **exact review the agent returned** to that path — same content, same structure, no rewriting or summarizing.

## Step 3: Report the saved path

End your response with the saved path and a one-line pointer so the user knows they can read or annotate the saved review:

```
Saved review: <path>
Run `/annotate <path>` to view and annotate it.
```
