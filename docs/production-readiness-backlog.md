# Production-readiness backlog

Severity: P0 critical/exploitable release stop; P1 required before real production data; P2 important follow-up; P3 improvement. Status reflects 11 September 2026.

| ID     | Sev | Finding / acceptance criterion                                                                                             | Status                                            | Owner                     |
| ------ | --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| PR-001 | P0  | Remove default `PUBLIC` execution from private/security-definer functions; verify intended role grants                     | Fixed and live                                    | Engineering               |
| PR-002 | P1  | Production dependency vulnerability in CSV parser                                                                          | Fixed (`csv-parse` 7.0.2; prod audit clean)       | Engineering               |
| PR-003 | P1  | Browser security headers absent                                                                                            | Fixed in `vercel.json`; verify on deployed domain | Engineering               |
| PR-004 | P1  | Production messages could fall back to localhost origin                                                                    | Fixed; HTTPS configuration now fails closed       | Engineering               |
| PR-101 | P1  | Enable leaked-password protection; enforce MFA for tenant/platform admins and test recovery                                | Open                                              | Security/Product          |
| PR-102 | P1  | Configure DB and Storage backups; approve RPO/RTO; complete and record restore drill                                       | Open                                              | Operations                |
| PR-103 | P1  | Add malware scanning, quarantine and safe reviewer release for compliance PDFs                                             | Open                                              | Security/Engineering      |
| PR-104 | P1  | Add central error/availability/worker monitoring and exercised alerts                                                      | Open                                              | Operations                |
| PR-105 | P1  | Approve POPIA/privacy/terms, retention, subprocessors, cross-border and incident contacts                                  | Open                                              | Legal/Information Officer |
| PR-106 | P1  | Link/deploy existing `fsp` Vercel project; verify production environment, domain, redirects, secrets and staging rehearsal | Open                                              | Operations                |
| PR-107 | P1  | Approve AI provider/privacy controls or explicitly launch with `AI_REVIEW_ADAPTER=disabled` and human mode only            | Open                                              | Product/Security          |
| PR-108 | P1  | Document FSCA dataset authority, acquisition and first-snapshot reconciliation                                             | Open                                              | Compliance/Product        |
| PR-201 | P2  | Add API/user/IP rate limiting for invitation, upload and expensive endpoints                                               | Open                                              | Engineering               |
| PR-202 | P2  | Install Docker/Podman in CI and make the full pgTAP suite mandatory                                                        | Open                                              | Engineering               |
| PR-203 | P2  | Resolve 5 dev-only transitive audit findings when `@vercel/node` publishes a safe path                                     | Open/monitor                                      | Engineering               |
| PR-204 | P2  | Code-split the 957 kB application chunk and define performance budgets                                                     | Open                                              | Frontend                  |
| PR-205 | P2  | Add structured request IDs and redacted logs; define log retention/access                                                  | Open                                              | Engineering/Operations    |
| PR-206 | P2  | Add load/concurrency tests for submissions, imports and worker claiming                                                    | Open                                              | Engineering               |
| PR-207 | P2  | Exercise complete registration, confirmation and recovery against an isolated resettable Auth project                      | Open                                              | QA                        |
| PR-208 | P2  | Add a fixture that explicitly tests different roles across multiple FSP memberships                                        | Open                                              | QA                        |
| PR-209 | P2  | Define notification/email delivery SLOs and dead-letter operating thresholds                                               | Open                                              | Product/Operations        |
| PR-301 | P3  | Reassess unused indexes after representative production-like traffic                                                       | Open                                              | Database                  |

Closed findings remain in this table for auditability. A finding may close only with a link to durable evidence (configuration export, test output, drill record or approved policy), not a verbal confirmation.
