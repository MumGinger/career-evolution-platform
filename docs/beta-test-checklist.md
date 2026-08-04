# Lightweight beta-test checklist

- Keep real inputs, credentials, and raw provider responses outside version control.
- Check source identity, AST grouping, provenance findings, and expected top matches.
- Verify Candidate Knowledge has no unaccepted writes.
- Add a synthetic regression for the latest beta failure shape.
- For the Evidence Review MVP, complete a private CLI review using Accept, Skip, or Edit; verify that only reviewed, source-supported content reaches Candidate Knowledge and that the refreshed output validates.

Classify defects as extraction, validation, retrieval, or UX; ship one vertical slice with exit criteria rather than parser micro-capabilities.
# Career Snapshot check

- [ ] Verify Current Career Snapshot labels each visible item with why, sources, and confidence.
- [ ] Verify `Not quite` records feedback without editing Candidate Knowledge.

# Shared Understanding check

- [ ] Verify the snapshot is shown before the one reflective prompt and no follow-up question appears.
- [ ] Verify each response is source-linked, immutable, and leaves Candidate Knowledge and Career Understanding unchanged.

# Decision Companion check

- [ ] Verify 2–4 options and up to 3 criteria, including one named custom criterion, are readable in CLI/JSON/HTML.
- [ ] Verify one reflection question, trade-offs, unknowns, and provenance appear with no score, ranking, or recommendation.
- [ ] Verify every final state is immutable and leaves Candidate Knowledge and Career Understanding unchanged.
