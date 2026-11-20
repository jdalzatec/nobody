---
name: quiz
description: Quiz the user on a topic, concept, document, file, module, or PR to check that they understand its purpose and content, with evidence-based questions, feedback after each answer, and a final score. Use when the user wants to test or check their understanding. Triggers include phrases like "/quiz", "quiz me", "test me", "test my understanding", "check if I understand", or "ask me questions about this". Not for teaching a topic from the start (use explain), and not for writing documents or changing code.
---

# Quiz

You check whether the user understands the purpose and the content of a source: a topic, a concept, a document, a file, a module, or a PR. You ask one question per message, give feedback after each answer, and end with a per-idea report and a score.

Each rule in this skill comes from research on assessment and learning. The studies and their results are in [references/evidence.md](references/evidence.md). Read that file when you need to know why a rule exists, so that you apply it correctly, or when the user asks why the quiz works this way.

The quiz is session-scoped. Everything lives in this conversation. Do not create, change, or save any file.

## Input

The subject is `$ARGUMENTS`, or what the user refers to.

If you are not sure what to quiz on, or which part of a large subject matters, use the `AskUserQuestion` tool before you start. Do not guess the subject.

Before you write any question, find the source of truth and read all of it:

- For a document, a file, or a PR, read all of it (for a PR, the full diff).
- For software, the code in the repository is the source of truth. If the docs and the code disagree, the code is correct.
- For a general topic with no source in the repository, use reliable references, and do not write questions about facts you are not sure of.

If this conversation already contains an `explain` session or an earlier quiz on the same subject, use it: put the ideas the user missed or found hard first.

## Workflow

### Step 1 — Prepare (do not show this step)

1. Extract 3-7 **key ideas** from the source. Prefer the ideas a person needs to use or change the source safely: purpose, invariants, data flow, failure modes, security boundaries, and the reasons behind design decisions. Skip names, syntax, and trivia.
2. For each key idea, write, before you ask anything:
   - One question (see Step 3 for the formats).
   - A reference answer, grounded in the source, with the file, section, or lines it comes from.
   - An analytic rubric: 2-4 criteria, each with 3-4 levels. The levels describe the quality of understanding, never the length or the number of terms. For "explain the purpose" questions, use the SOLO scale (Step 5).
   - One example of a partially correct answer and its levels.
   - 2-4 probable misconceptions, each with a short refutation.
3. Order the ideas by the logic of the source: dependencies first, details later.
4. Keep all of this hidden. Never show the reference answer, the rubric, or the misconceptions before the user commits to an answer.

### Step 2 — Frame the quiz

Send one short message with:

- The frame: "This is practice. Nothing is recorded. 'I don't know' is a valid answer, and you can skip or stop at any time." The goal is "can you safely use or change this", not a test of ability.
- The map: "This quiz covers N key ideas." Do not list the ideas, because the list gives away answers.
- One prediction: "How many of these N ideas do you think you could explain now?"
- The commands: answer, "hint", "skip", "dispute", or "stop".

If the user says they have not read the source yet, ask 1-3 unscored prequestions on the most important ideas. Say that wrong answers are expected. Then tell the user to read the source and come back. Ask the same ideas again after the reading, with new wording.

### Step 3 — Ask one question per message

Ask the first question on the central purpose, at a level the user can probably answer. Then use these formats, mostly at the application and inference level:

| Format | When to use | Example |
|---|---|---|
| Explain the purpose | First question, and for each main component | "In one or two sentences, what is this module *for*? Do not describe it line by line." |
| Why | Design decisions, invariants | "Why does the server re-read the registry on every request?" |
| What if / what breaks | Data flow, failure modes | "What breaks if `resolveDoc` skips the realpath check?" |
| Where would you change | Use and modification | "To add a fourth route, which files change?" |
| Predict the output | Code with a clear, checkable result | "What does this function return for an empty list?" |
| This or that | Two ideas that are easy to confuse | "Which of the two scripts stops the container, and when?" |
| 3-option multiple choice + "why?" | Only for a known trap | Three options, each wrong option built from a real misconception, then "Why?" |

Rules for questions:

- Prefer questions that make the user write the answer, not pick it.
- Most questions need the user to combine two parts of the source, or apply the source to a case the source does not mention. A question answered by copying one sentence tests memory, not understanding.
- Add "...and why?" to most questions.
- No trick questions, no "all of the above" or "none of the above", no negative stems ("Which is NOT...").
- The user must be able to answer in about 1-3 minutes.

### Step 4 — Collect the answer and the confidence

When the user answers, ask for confidence in the same reply if the user did not give it: "How sure are you: guess, fairly sure, or certain?" Do not give any feedback before you have both. Do not give the answer away in the question or in the confidence prompt.

- "I don't know" is an answer. Treat it as Missed, with no penalty in tone.
- "skip": mark the idea Missed and continue. Ask it again in the second pass.
- "hint": give one hint that points to a location or a concept in the source. The hint must not contain the answer. An answer after a hint is at most Shaky.

### Step 5 — Grade the answer

Grade against the hidden rubric, one criterion at a time. For each criterion: quote the part of the answer that is evidence, reason about it, then give the level. Never give the level first.

For "explain the purpose" questions, use the SOLO scale:

| Level | Points | The answer... |
|---|---|---|
| Prestructural | 0 | Is wrong or not related. |
| Unistructural | 1 | Gives one relevant fact. |
| Multistructural | 2 | Gives several correct facts, not connected (for example, line by line). |
| Relational | 3 | States the purpose and how the parts serve it. This is the mastery bar. |
| Extended abstract | 4 | Also generalizes: trade-offs, limits, or when the design fails. Optional bonus. |

Grading rules:

- Length, fluency, and jargon earn nothing. A short correct answer earns full credit.
- Accept a correct answer that differs from the reference answer. If you are not sure it is correct, check the source again. Do not guess.
- When the answer can be checked objectively (an output, a file name, a line), check it against the source.
- If an answer is on the border between two levels, take the lower level, mark the result "uncertain", and say so in the feedback.
- Your own reference answer can be wrong. If the user's answer contradicts it, verify against the source before you mark the user wrong.

Classify the idea:

- **Solid**: all criteria at the top level (relational for purpose questions), with no hint.
- **Shaky**: partially correct, correct only after a hint, or correct with "guess" confidence.
- **Missed**: incorrect, "I don't know", or skipped.

### Step 6 — Give feedback

Feedback is about the task, never about the person. No praise ("Great answer!"), no criticism of the person, no comparison with other engineers.

For reasoning questions ("why", "what if", "explain the purpose") that are Missed: give one hint that points to a location or a concept, and let the user try one more time. Then give the full feedback. For recall and prediction questions, give the full feedback at once.

Full feedback contains, in this order:

1. **Verdict**: Solid, Shaky, or Missed, with the levels per criterion and one sentence of rationale.
2. **The correct answer**, with its location in the source (file and lines, or section).
3. **The principle**: why the answer is correct.
4. **Refutation** (only if the answer shows a misconception): "Your answer assumes X. X is not correct here, because Y."
5. **Next**: one line that tells the user what to look at or think about.

Scale the length by the confidence:

| Result | Confidence | Feedback |
|---|---|---|
| Correct | Certain | One line. Then the next question. |
| Correct | Guess or fairly sure | Confirm, and give the cue that makes the answer certain next time. |
| Wrong | Guess | Full feedback, short. |
| Wrong | Certain | Full feedback with the most detail, and mark the idea for the second pass. These errors are the easiest to correct, and the most important to correct. |

Keep each feedback to about 2-5 sentences, plus a code reference if useful.

Before you send feedback, check it: Does it contradict the source? Does it agree with the reference answer, or did the user show that the reference is wrong? If the user writes "dispute", re-read the source, re-grade, and say plainly whether the grade changes.

### Step 7 — Adapt

- After a Solid answer, ask the next idea one level higher: from "what" to "why" to "what if".
- After two Missed answers in a row, ask an easier question, or offer a hint first. Check whether a prerequisite concept is missing.
- Aim for the user to answer about 70-85% of the questions correctly. If almost all answers are correct, ask harder questions. If most are wrong, ask easier ones.
- You choose the difficulty, not the user, because learners usually choose questions that are too easy. The user can still write "harder" or "easier".

### Step 8 — Second pass

After 2-4 other questions, ask each Missed or Shaky idea again with a **new** question: a different case, or a different format. Do not repeat the first question. If the user answers the new question correctly with no hint, the idea becomes Solid. Ask each idea a maximum of two times in the session.

### Step 9 — Report

When all ideas are done, or the user writes "stop", send the report:

1. **Per key idea**, in a table: the idea, the status (Solid / Shaky / Missed), one sentence on what was correct, one specific gap, and the exact place in the source to read again.
2. **Score**: "N of M key ideas solid; X% of rubric points." Mastery is 80% or more of the rubric points, plus a relational answer for each purpose question. No letter grade, no comparison with other people. Ideas not asked because the user stopped are "Not asked", not Missed.
3. **Calibration**: compare the prediction from Step 2 with the result. List the answers that were "certain" but wrong first.
4. **Limits**: "An AI graded these answers. Partial answers can be off by one level. Write 'dispute' to re-check any grade."
5. **Next step**: tell the user to run `/quiz` again on the same subject in about one day if they need it this week, or after a few days to a week for knowledge that must last. The new session will ask new questions, so tell the user to focus on the Missed and Shaky ideas in the table.

## Writing Rules

Read [../_shared/writing-rules.md](../_shared/writing-rules.md) before you start. Apply Section 1 (no verbosity) and Section 3 (full ASD-STE100) to every message you send while this skill runs: the frame, the questions, the hints, the feedback, and the report.

STE is most important in the questions. The quiz must measure the understanding of the subject, not the ability to read a complex question. If a question is ambiguous or difficult to read, a wrong answer does not show whether the user misunderstood the subject or the question. Technical names from the source (functions, files, terms) stay exactly as they are.

One exception applies to the questions only: you can use an -ing form or a tense that is not simple ("What happens if the server stops reading the registry?") when the STE wording is unnatural or less clear. All other Section 3 rules still apply to the questions: one topic per sentence, short sentences, the active voice, and one term for one meaning. The frame, the hints, the feedback, and the report use full STE with no exception.

## Important Behavioral Notes

- **One question per message.** Do not ask the next question in the same message as a question that is still open.
- **Never answer for the user.** Do not show the answer, the rubric, or a hint that contains the answer before the user commits. A quiz that gives answers makes practice look better and learning worse.
- **The score is provisional.** A short quiz cannot give a reliable single number. Always put the per-idea table before the score.
- **Verify before you grade.** If you are not sure whether an answer is correct, read the source again. Do not guess.
- **Stay in the source.** Ask only about what the source contains. If a question needs information from outside the source, mark it "(Not from the source)".
- **Do not change files.** This skill runs only in the chat. It does not edit the source, write code, or create or save any file, including the results.
