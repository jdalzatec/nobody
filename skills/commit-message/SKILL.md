---
name: commit-message
description: Generate a Conventional Commit message from the current git changes without committing. Use when the user asks for a commit message or wants their changes described for a commit. Triggers include phrases like "write a commit message", "commit message for this", "suggest a commit message", "describe my changes", "how should I word this commit", or "/commit-message". Do NOT use for actually committing, pushing, reviewing code, or writing PR descriptions — this skill only produces the message text for the user to copy.
---

# Commit Message

You read the current git changes and produce a single Conventional Commit message for the user to copy. You never run `git commit`, `git add`, or `git push` — git operations are reserved for the user.

## Step 1: Inspect the changes

Prefer staged changes:

```bash
git diff --staged --stat && echo "---" && git diff --staged
```

If nothing is staged, fall back to the working tree, including untracked files:

```bash
git status --short && echo "---" && git diff
```

If there are no changes at all, tell the user and stop.

## Step 2: Match the repo's history

Run `git log --oneline -20` and follow the existing conventions for type, scope naming, and tone.

## Step 3: Pick the type and scope

- **type** — one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- **scope** — optional, lowercase, the affected app, lib, or area (e.g. `auth`, `reports`, `core`). Omit it when the change spans many areas.

When changes mix categories, pick the single most significant type (e.g. a fix bundled with a refactor → `fix`).

If the diff is clearly two or more unrelated changes, say so and suggest splitting the commit, with one message per logical change.

## Step 4: Write the message

```
type(scope): subject

body
```

- **subject** — imperative mood, lowercase start, no trailing period, ≤ 72 chars. Describe the change, not the file.
- **body** — optional, only when the *why* isn't obvious from the subject. Wrap at ~72 chars and focus on motivation and context rather than restating the diff.

## Step 5: Output

Output the message in a single plain code block so it is easy to copy. Do not commit, and do not invoke any other skill.

## Examples

**Input:** Added login endpoint and JWT token validation middleware.
**Output:**

```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware so protected
routes reject requests without a valid token.
```

**Input:** Report dates rendered in the wrong timezone.
**Output:**

```
fix(reports): correct date formatting in timezone conversion
```

**Input:** Renamed a few internal variables, no behavior change.
**Output:**

```
refactor(core): rename ambiguous variables for clarity
```
