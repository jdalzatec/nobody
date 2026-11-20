# Writing rules

Shared writing rules for every Nobody skill. Plain wording makes a text faster and easier to read for every reader. Each skill says which level to use.

- **Section 1** applies to all output: documents and chat messages.
- **Section 2** applies to documents and chat messages that are not a teaching explanation: research reports, plans, todo lists, code reviews, review summaries, implementation reports.
- **Section 3** (full ASD-STE100) applies only to the `explain` skill.

These rules control the wording, not the content. Never remove depth, precision, or technical detail to make the text shorter or simpler. If a sentence is long because the idea is complex, split the idea into more sentences. Do not cut the idea.

These rules do not apply to code, code blocks, commands, file paths, identifiers, quoted text, error messages, or CriticMarkup. Keep those exactly as they are.

## 1. No verbosity

Every sentence must give the reader information. Remove the sentences that do not.

- No preamble. Do not start with "Great question", "Sure", "Let me", or a restatement of the request.
- No praise or filler. Do not write "This is a great approach" or "It is worth noting that".
- No meta-comments. Do not write "Now let's move on to…", "In this section I will…", or "As mentioned above…".
- No repetition. Say each point one time, in the place where it belongs. Do not recap the previous section or message.
- No closing summary that repeats the body, unless the skill asks for a summary.
- No hedging chains. Write "X can fail if Y", not "It might be possible that X could potentially fail".
- Prefer a list or a table to a long paragraph when the content is a set of parallel items.

Thorough is not the same as verbose. A research report can be long because it covers many facts. It must not be long because it says the same facts many times or wraps them in filler.

## 2. Plain technical English

Use this level for technical documents. The reader is an expert engineer. Keep the full technical level: exact terms, real names of functions, files, and modules, edge cases, conditions, and trade-offs. Make only the sentences easier to read.

Words:

- Use the correct technical term. Do not replace a precise term with a vague, everyday word.
- Define a project-specific or uncommon term the first time you use it.
- Use one term for one meaning. Always use the same term for the same thing. Do not use synonyms for variety.
- Prefer a single verb to a phrasal verb when the meaning is the same ("remove", not "get rid of").
- Avoid idioms, slang, and cultural references.

Sentences:

- Keep most sentences under 25 words. Split a sentence that has more than one main idea.
- Prefer the active voice. Say who or what does the action ("The parser rejects the input", not "The input is rejected").
- Do not make noun clusters of more than three words. Write "the timeout of the retry handler", not "the retry handler timeout configuration value".
- Write instructions in the imperative.

Paragraphs and connections:

- Put the topic sentence first.
- Keep paragraphs short (a maximum of about 6 sentences).
- Show relations with explicit connecting words: "because", "if", "then", "but", "so", "for example".
- When you refer to a thing again, use its name again if "it" or "this" is not clear.

## 3. Full ASD-STE100

Use this level only for the `explain` skill. Use it for every message you send while the skill runs: the explanation, the questions, the feedback, and the answers to the questions of the user. Section 1 also applies.

Words:

- Use only the words of the STE dictionary, with their approved meanings.
- You can use technical names (for example "API", "mutex", "gradient") and technical verbs. Define each technical name when you use it for the first time.
- Use one word for one meaning. Always use the same term for the same thing. Do not use synonyms for variety.
- Use one verb, not a phrasal verb, when possible.

Sentences:

- Use a maximum of 20 words in a procedural sentence and 25 words in a descriptive sentence.
- Write about one topic in each sentence.
- Use the active voice.
- Use only simple tenses: present, simple past and simple future.
- Use articles ("the", "a") and demonstratives ("this", "these").
- Do not make noun clusters of more than three words.
- Write instructions in the imperative.
- Do not use -ing forms, except in technical names.

Paragraphs:

- Use a maximum of 6 sentences in a paragraph.
- Put the topic sentence first.

Connections between sentences:

- Show the relations with connecting words: "because", "if", "then", "but", "also", "for example".
- When you refer to a thing again, use its name again. Do not use "it" or "this" if the reference is not clear.
