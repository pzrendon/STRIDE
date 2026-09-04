import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_APPLICABILITY_YAML,
  BUNDLED_CRITERIA_YAML,
  BUNDLED_REQUIREMENTS_YAML
} from "@/lib/part450/regulatory/bundledYaml";
import {
  loadPart450Catalog,
  parseCriteriaYaml,
  parseRequirementsYaml,
  REGULATORY_VALUE_REQUIRED
} from "@/lib/part450";

function readRegulatory(name: string): string {
  return readFileSync(resolve(process.cwd(), "regulatory/part450", name), "utf8");
}

describe("regulatory configuration", () => {
  it("keeps the on-disk YAML in lockstep with the bundled copy", () => {
    expect(readRegulatory("requirements.yaml").trim()).toBe(BUNDLED_REQUIREMENTS_YAML.trim());
    expect(readRegulatory("criteria.yaml").trim()).toBe(BUNDLED_CRITERIA_YAML.trim());
    expect(readRegulatory("applicability.yaml").trim()).toBe(BUNDLED_APPLICABILITY_YAML.trim());
  });

  it("loads placeholder requirements with provenance fields", () => {
    const catalog = loadPart450Catalog();
    expect(catalog.regulation).toContain("Part 450");
    expect(catalog.unspecifiedDisplay).toBe(REGULATORY_VALUE_REQUIRED);
    expect(catalog.requirements.length).toBeGreaterThan(3);

    for (const req of catalog.requirements) {
      expect(req.id).toMatch(/^PART450-/);
      expect(req.citation).toContain("PLACEHOLDER");
      expect(req.source).toBe("PLACEHOLDER");
      expect(req.effectiveDate).toBeNull();
      expect(req.revision).toBe("unverified-placeholder");
      expect(req.verificationDate).toBeNull();
      expect(req.requirementText).toContain("PLACEHOLDER");
    }
  });

  it("leaves numeric criteria empty instead of guessing FAA limits", () => {
    const { unspecifiedDisplay, criteria } = parseCriteriaYaml(readRegulatory("criteria.yaml"));
    expect(unspecifiedDisplay).toBe(REGULATORY_VALUE_REQUIRED);
    expect(criteria.every((row) => row.threshold === null)).toBe(true);
  });

  it("parses the disk YAML through the same functions the app uses", () => {
    const fromDisk = parseRequirementsYaml(readRegulatory("requirements.yaml"));
    const bundled = parseRequirementsYaml(BUNDLED_REQUIREMENTS_YAML);
    expect(fromDisk.map((row) => row.id)).toEqual(bundled.map((row) => row.id));
  });
});
