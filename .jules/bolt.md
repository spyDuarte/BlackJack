## 2026-02-16 - [Switch vs Object Lookup for String Keys]
**Learning:** For small sets of fixed string keys (like card values), `switch` statements consistently outperformed object map lookups in V8 by ~40% (vs ~10% for map). The overhead of object property access and potential prototype chain checks (even with plain objects) can be non-negligible in extremely hot paths compared to compiled jump tables.
**Action:** Prefer `switch` statements over object maps for high-frequency lookups of small, static string sets where performance is critical.
