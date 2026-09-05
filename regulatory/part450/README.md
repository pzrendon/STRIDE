# Regulatory data for STRIDE's Part 450 module
#
# These YAML files are the configuration-controlled copy of citations,
# criteria, and applicability. The TypeScript in lib/part450/regulatory.ts
# loads them (and has a bundled fallback for the browser).
#
# How to update:
# 1. Paste authoritative CFR text/citations into the YAML.
# 2. Fill source, effective_date, revision, verification_date.
# 3. Put numeric thresholds in criteria.yaml only — never in risk.ts.
# 4. Run the unit tests. A drift test checks that bundled strings match
#    these files.
#
# Until that happens, STRIDE will print REGULATORY VALUE REQUIRED rather
# than inventing 1e-4 / 1e-6 style limits.

schema_version: 1
files:
  - requirements.yaml
  - criteria.yaml
  - applicability.yaml
