## 2026-04-22 — accidental feature removal hid inside a small task
- **Mistake**: Treated compound as doc-only and missed a recent commit that replaced service-backed UI state with literals.
- **Correction**: During compound, read commits since `.astack/last-sync`, run the suspicious-commit detector, and write the smallest durable follow-up before moving on.
- **Doc ref**: skills/astack-compound/SKILL.md#default-loop
- **Status**: graduated(2026-04-22)
