# STRR deployed DEV verification, October 5, 2026

This isolated QA branch verifies deployed DEV assets for pnpm PR #1860,
source `dc10c472b0148f9ae4857402fd75e5eeb1d71d24`. It neither deploys nor
overlays candidate frontend files. The dispatcher supplies each deployed entry
bundle SHA256 from the independently verified deployment; the harness checks it
before and after each app.

Run `read-only` first to verify BCSC login, the existing synthetic account,
authenticated dashboards, registration forms, payment account and live fees.
`checkout` creates one fresh synthetic Host, Platform or Strata application per
selected app, verifies the test merchant before card entry, then checks return,
receipt PDF and persisted payment/invoice state. Host also cancels and resumes
the same invoice. The stored sandbox card is injected only in checkout mode.

Only sanitized status and synthetic transaction metadata are uploaded. Credentials,
headers, response bodies, screenshots, browser state and receipt contents stay
inside the runner. Checkout reruns are refused: after an uncertain submission,
inspect the retained application/invoice checkpoint before adapting any retry.
Never reuse a completed invoice. Examiner authenticated verification is separate.
