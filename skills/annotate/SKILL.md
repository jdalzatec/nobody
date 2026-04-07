---
name: annotate
description: Launch the nobody webapp to view a markdown file in the browser. Use when the user wants to view, read, or annotate a markdown report.
---

## What it does

Runs a Docker container that serves a formatted, readable view of a markdown file in the browser.

## Inputs

The user provides a **markdown file path**, e.g. `/annotate research_20260402_0000.md`

## Workflow

1. Run `skills/annotate/scripts/run-annotator.sh <file>` passing the markdown file path
2. The script starts the container in the background on port 9303
3. Tell the user the URL: **http://localhost:9303**
4. If the user wants to stop it: `docker stop nobody`

## Persistence

The markdown file is mounted read-write. Annotations are stored inline using CriticMarkup syntax (`{==highlighted text==}{>>comment<<}`). Changes are written back to the original file automatically.
