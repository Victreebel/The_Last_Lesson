import { describe, expect, it } from "vitest";
import { getLessonPresentationLines } from "../../src/rendering/lessonPresentation";

describe("lesson presentation", () => {
  it("turns an observed doctrine into a complete teachable battlefield brief", () => {
    expect(
      getLessonPresentationLines({
        status: "observed",
        heirName: "Prince Marcus",
        condition: "Fertile terrain is available",
        action: "Build farms",
        goal: "Sustain the settlement",
        confidence: 22
      })
    ).toEqual([
      "LESSON OBSERVED // PRINCE MARCUS // H: FEEDBACK",
      "WHEN: FERTILE TERRAIN IS AVAILABLE",
      "DOCTRINE: BUILD FARMS // 22%",
      "GOAL: SUSTAIN THE SETTLEMENT",
      "HEIR [H] // REWARD OR PUNISH TO TEACH"
    ]);
  });

  it("keeps long records compact and distinguishes confirmed or questioned feedback", () => {
    const reinforced = getLessonPresentationLines({
      status: "reinforced",
      heirName: "Lady Ilyra",
      condition: "Food reserves and a Town Square are available for sustained remote supply",
      action: "Establish supply caravans",
      goal: "Sustain distant forces",
      confidence: 106
    });
    const disciplined = getLessonPresentationLines({ status: "disciplined", confidence: -4 });

    expect(reinforced[0]).toBe("LESSON REINFORCED // LADY ILYRA // H: FEEDBACK");
    expect(reinforced[1]).toMatch(/[.]{3}$/);
    expect(reinforced[2]).toBe("DOCTRINE: ESTABLISH SUPPLY CARAVANS // 100%");
    expect(reinforced[4]).toContain("REWARD CONFIRMED");
    expect(disciplined[2]).toContain("// 0%");
    expect(disciplined[4]).toContain("PUNISHMENT RECORDED");
  });
});
