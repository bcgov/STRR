# STRR TEST regression, September 15, 2026

This isolated QA branch verifies deployed TEST applications from main source
`8c05dde179de669d71e3706324ef381dcfdacbd0`. It does not deploy application code.
The shared helpers were recovered from the established qa/nuxt4-test-payments
history and updated to create fresh synthetic applications on every initial run.

Scope: BCSC login and account selection, live Pay API account/fees, fresh Host,
Platform and Strata card checkout, Host cancellation/resume, correct application
return, PDF receipt, and payment/invoice persistence after reload and API read.
Test gateway and explicit test merchant checks precede all stored card entry.
Credentials remain inside the CI test step. Only allowlisted result metadata is
uploaded; no DOM dumps, traces, screenshots, session state or receipt contents.

Do not rerun after an uncertain payment. Inspect the previous run result and its
application/invoice state, then adapt a targeted read-only or resume check. Never
resubmit a completed invoice or reuse historical invoice constants.

The existing interactions-update workflow is made manually dispatchable on this
QA branch so its original functional/load/benchmark checks can also be run.

The QA ref also removes the default renewal-reminders load-test exclusion so
the existing CI workflow can exercise all 32 tests, including 50,000-record
fixtures in runner-local test databases. This test selection is not for merge.
