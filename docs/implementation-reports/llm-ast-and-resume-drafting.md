# Version 1 Beta blocker repair: LLM AST and Resume Draft

Issue #62 repairs the real-provider path without changing Candidate Knowledge authority. The OpenAI-compatible Resume AST request now declares the complete canonical nested leaf/provenance contract enforced by the source-span validator. Output remains blocked when text is paraphrased, spans are missing, or extraction state is invalid.

The Resume Draft provider receives only included committed fact selections, mapped target requirements, and presentation strategy. It returns structured sections whose statements cite candidate fact IDs and requirement IDs. Artifact validation blocks missing or mismatched citations, provider/parse failure, unbounded wording, and existing provenance violations.

No Candidate Knowledge writer was added: Evidence Review still submits accepted or bounded-edited evidence through 003.6 alone. Career Review remains mandatory before export.
