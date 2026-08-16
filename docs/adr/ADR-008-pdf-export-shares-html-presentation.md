# ADR-008: Final PDF Export Shares the Approved HTML's Presentation Contract

**Status:** Accepted
**Date:** 2026-08-15

## Context

The applicant reviews and approves their resume as HTML (`resumeHtml()`, styled by `resumeCss()`) during Career Review, then downloads `final-resume.pdf`. Until this change, the PDF was produced by a separate hand-written byte-level PDF writer (`resumePdf()`): a second layout engine that manually positioned text, wrapped lines, and paginated entries, sharing no code or CSS with the approved HTML. The two artifacts diverged — the PDF could show crude spacing, awkward wrapping, and page composition visibly less professional than the HTML the applicant had just approved, even after fixing unrelated content-fidelity bugs (e.g. word-boundary loss). Milestone 1 treats a visibly unprofessional final PDF as a hard blocker (`docs/agents/pre-beta-quality-scorecard.md`).

## Decision

`resumePdf()` now renders the exact same `resumeHtml()` output used for Career Review through a real browser engine (headless Chromium via `playwright-core`, using the browser toolchain already present in this repo for `browser-e2e` tests) and prints it to PDF (`page.pdf({ preferCSSPageSize: true, printBackground: true })`), governed by `resumeCss()`'s `@media print` rules (`@page { size: Letter; margin: 0 }`).

- `resumePdf()` and `writeApplicantOutputs()` became async; PDF export is allowed to be asynchronous.
- The hand-positioned PDF layout code (manual text wrapping, entry/section positioning, raw PDF object writing) is deleted. It is no longer an authoritative presentation system.
- `playwright-core` (not the full `playwright` package) is added as a **production** dependency — this repo previously had none. It reuses the Chromium binaries already provisioned locally for `@playwright/test`; only `chromium.launch()` is used, which `playwright-core` fully supports.
- A module-level Chromium instance is kept as a lazily-launched singleton (`pdfBrowser()`), closed via `closePdfRenderer()` on server shutdown; a failed launch resets the singleton so the next request retries instead of failing permanently.

## Alternatives Considered

- Keep hand-tuning the byte-level PDF writer (e.g. share spacing/typography constants with the CSS). Rejected: several prior beta cycles already tried this and still left the PDF visibly diverging from the HTML; the layout logic itself, not a specific constant, was the source of drift.
- Generate the PDF from a intermediate document model using a pure-JS PDF library (no browser). Rejected: does not reuse `resumeCss()`, so parity with the approved HTML would again depend on manually re-deriving layout rules in a second engine.

## Consequences

- The final PDF and the approved HTML are guaranteed to show the same content, hierarchy, and wrapping, because they are the same rendering pipeline.
- Export now depends on a headless Chromium runtime being available in production, not just in dev/CI — a real increase in this app's runtime footprint (previously stated as having "no external packages").
- Unit-tier tests that asserted on the old renderer's raw, uncompressed PDF bytes (specific font operators, exact text-positioning coordinates) no longer apply and were removed; PDF content-fidelity is now verified at the `http-contract` tier via real text extraction (`pdftotext -enc UTF-8`, `pdfinfo`) against the actually-rendered PDF.
