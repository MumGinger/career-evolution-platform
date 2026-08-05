# Lightweight beta-test checklist

- [ ] Start `node src/beta-ui.js`; verify the local page shows provider/model, keeps the key blank after submission, and does not require command-by-command workflow entry.
- [ ] In the UI, complete every Evidence Review candidate, confirm the regenerated draft contains only committed facts, then explicitly approve or edit all four Career Review sections before final-output links appear.

- Keep real inputs, credentials, and raw provider responses outside version control.
- Check source identity, AST grouping, provenance findings, and expected top matches.
- Verify Candidate Knowledge has no unaccepted writes.
- Add a synthetic regression for the latest beta failure shape.
- In the primary demo, supply `--evidence-review-fixture` or complete the interactive Accept, Skip, or Edit review. Verify that only reviewed, source-supported content reaches Candidate Knowledge, the refreshed draft has populated sections, and export is blocked when it does not.

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
