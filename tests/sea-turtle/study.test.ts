import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, runStudy } from "../../web/js/sim.js";

describe("Sea Turtle selected recovery system", () => {
  it("uses the directly selected shield and chute dimensions", () => {
    const study = runStudy({
      ...DEFAULT_CONFIG,
      shieldDiameterM: 1.8,
      chuteDiameterM: 2.5,
    });

    expect(study.reference.shieldDiameterM).toBe(1.8);
    expect(study.reference.chuteDiameterM).toBe(2.5);
    expect(study.rows.filter((row: { selected: boolean }) => row.selected)).toHaveLength(1);
  });

  it("lets recovery sizing change the selected design screen", () => {
    const baseline = runStudy({ ...DEFAULT_CONFIG });
    const resized = runStudy({
      ...DEFAULT_CONFIG,
      shieldDiameterM: 1.8,
      chuteDiameterM: 3,
    });

    expect(baseline.reference.status).toBe("FAIL");
    expect(baseline.reference.shock).toBeGreaterThan(12);
    expect(resized.reference.status).toBe("PASS");
    expect(resized.reference.shock).toBeLessThan(12);
  });
});
