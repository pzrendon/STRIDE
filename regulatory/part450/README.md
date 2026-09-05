# Regulatory data for STRIDE's Part 450 module
#
# These YAML files are the configuration-controlled copy of citations,
# criteria, and applicability. They are the canonical catalog.
#
# The static site (web/) has no YAML parser (CSP / zero runtime deps), so the
# shipped copy is the CATALOG object in web/js/part450.js. It must mirror the
# ids and placeholder text here.
#
# How to update:
# 1. Paste authoritative CFR text/citations into the YAML.
# 2. Fill source, effective_date, revision, verification_date.
# 3. Put numeric thresholds in criteria.yaml only — never in web/js/part450.js.
# 4. Mirror the same ids/text into the CATALOG in web/js/part450.js.
# 5. Run the tests. tests/web/part450.test.ts checks the catalog ids still
#    appear here and that no numeric threshold has crept in.
#
# Until that happens, STRIDE will print REGULATORY VALUE REQUIRED rather
# than inventing 1e-4 / 1e-6 style limits.

schema_version: 1
files:
  - requirements.yaml
  - criteria.yaml
  - applicability.yaml
