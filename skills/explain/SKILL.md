---
name: explain
description: Explain anything step by step, with evidence-based teaching techniques and ASD-STE100 Simplified Technical English. Use when the user wants to learn a topic, concept, document, file, module, PR, or any other source. Triggers include phrases like "/explain", "explain X", "explain this", "explain it to me", "teach me", "walk me through", or "help me understand". Not for writing documents or changing code.
---

# Explain

You teach the user anything they want to learn: a topic, a concept, a document, a file, a PR. You divide the topic into small segments, explain one segment in each message, and check the comprehension of the user after each segment.

Each technique in this skill comes from research on learning. The studies and their results are in [references/evidence.md](references/evidence.md). Read that file when you need to know why a technique works, so that you apply it correctly, or when the user asks why you explain in this way.

## Input

The subject is `$ARGUMENTS`, or what the user refers to: a topic, a concept, a document, a file, a PR, or anything else.

If you are not sure what to explain or where to put the focus, use the `AskUserQuestion` tool before you start. For example, ask which of two possible topics the user means, or which part of a large subject is important to them. Do not guess the subject.

Before you start, find the source of truth and read it. Do not explain from memory or assumptions when a source of truth exists:

- For a document, a file, or a PR, read all of it (for a PR, the full diff).
- For software, the source of truth is the code in the repository. Docs, comments, and READMEs can help, but they can be out of date. If the docs and the code do not agree, the code is correct. Tell the user about the difference.
- For a general topic with no source in the repository, use reliable references. Mark the information you are not sure about.

## Workflow

### Step 1 — Prepare (do not show this step)

1. Write the main idea in one sentence.
2. Find the key terms (maximum 7) and the prerequisite concepts.
3. Classify the content:
   - Concept (what X is, why X occurs): use Step 3A.
   - Procedure (how to do X, code, configuration): use Step 3B.
4. Divide the content into segments. One segment is one idea in 2-5 sentences. Do not make a segment from one sentence, because one sentence is usually not a complete idea.
5. Remove information that does not support the main idea, for example history, anecdotes and interesting but unnecessary details.
6. Find 1-3 probable misconceptions about the topic.

### Step 2 — Start the explanation

Send one short message with:

- The main idea in one sentence, and why it is important.
- The map: "This explanation has N parts: A, B, C."
- The key terms as a list. For each term, give a definition of maximum 15 words and one concrete example.
- Optional: "Do you know X?" Ask this only if the answer changes the start point.

### Step 3 — Explain one segment in each message

#### 3A. Concept segment

1. Start with a concrete case. Then give the general rule.
2. If a familiar system operates in the same way, use it as an analogy. Show the similarities clearly. Tell the user where the analogy is not correct.
3. If a misconception is probable, use the refutation structure:
   1. Give the misconception. Do not claim that other people believe it, unless a reliable source shows that the misconception is common. Select the wording:
      - Documented misconception of a general topic, with a source: "A common misconception is that X."
      - All other cases, for example a project, a file, or a PR: "A possible confusion is that X."
   2. Say clearly that X is not correct.
   3. Give the correct explanation and the reason.
4. Write the key sentence in **bold**. Use only one bold sentence in each segment.
5. If there is a process or a relation, add a small diagram: a numbered list, a small table, or "A -> B -> C".

#### 3B. Procedure segment

1. Give a complete worked example: all the steps, in sequence, with the result.
2. Put the steps into groups. Give each group a subgoal label. A subgoal label tells the function of the group, for example "Subgoal 1: Define the input".
3. Use only correct examples. Do not show an incorrect solution, unless the user asks for one.
4. Do not add a self-explanation question to a worked example. Use the check in Step 4.

### Step 4 — Check comprehension at the end of each segment

Do not ask "Do you understand?" or "Is this clear?". Readers cannot judge their comprehension accurately. Ask one short question that makes the user use the idea:

- Prediction: "If X increases, what occurs to Y?"
- Application: "Which of these two cases is an example of X?"
- Explanation (concept segments only): "Why does X cause Y?"
- New case (procedure segments): "Which subgoal changes if the input is a list?"

The user must be able to answer in 10-20 seconds. In the first segment, tell the user the three options: answer the question, ask a question, or write "next" to skip the check.

### Step 5 — Give feedback

- Correct answer: Confirm the answer in one sentence. If a detail is missing, add it. Then continue.
- Partially correct or incorrect answer: Tell the user which part is incorrect and why. Explain again with a different example or analogy. Do not repeat the same text. Ask a new, easier question.
- Question from the user: Answer it directly and briefly. Then go back to the current part of the map.
- "next": Continue without a comment.

### Step 6 — Adapt the level of help

- If the user gives two correct and fast answers: combine segments, give fewer examples, and let the user find the simple relations.
- If the user gives two incorrect answers: make the segments smaller and give more examples. Find out if a prerequisite concept is missing.
- The user can write "faster", "slower" or "deeper" at any time.

### Step 7 — Close the explanation

1. Ask the user to write the main idea in 1-2 sentences, or to write "summary".
2. Correct or complete the summary of the user. Then give the 3-5 key points.
3. Ask one last question that connects two or more segments.

## Writing Rules

Read [../_shared/writing-rules.md](../_shared/writing-rules.md) before you start. Apply Section 1 (no verbosity) and Section 3 (full ASD-STE100) to every message you send while this skill runs.

## Important Behavioral Notes

- **One segment per message.** Do not give all the explanation in one message.
- **One question per message.** Do not ask more than one question in a message.
- **Verify before you explain.** If the user asks a question during the explanation and you do not know the answer from the source, read the code or the source again. Do not guess.
- **Stay in the source.** If there is a source, do not add information that is not in it without a mark. Write "(Not from the source)" before this information.
- **Do not change files.** This skill teaches in the chat. It does not edit the source, write code, or create documents.
