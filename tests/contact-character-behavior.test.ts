import { describe, expect, it } from "vitest";
import {
  getBehaviorTimeline,
  getBlinkDelay,
  getBlinkDuration,
  getCharacterCue,
  getCharacterScene,
  getIdleConversation
} from "../components/contact/character-behavior";

describe("contact character behavior model", () => {
  it("maps the seven public states and active field to a specific scene", () => {
    expect(getCharacterScene("idle", null)).toBe("idle");
    expect(getCharacterScene("focused", "name")).toBe("name");
    expect(getCharacterScene("focused", "organization")).toBe("general");
    expect(getCharacterScene("privacy", "email")).toBe("privacy");
    expect(getCharacterScene("typing", "message")).toBe("listening");
    expect(getCharacterScene("error", "name")).toBe("error");
    expect(getCharacterScene("submitting", null)).toBe("submitting");
    expect(getCharacterScene("success", null)).toBe("success");
  });

  it("uses a notice-act-hold arc for reactive scenes", () => {
    expect(getBehaviorTimeline("privacy")).toEqual([
      { phase: "notice", duration: 180 },
      { phase: "act", duration: 380 },
      { phase: "hold", duration: null }
    ]);
    expect(getBehaviorTimeline("name").slice(0, 2)).toEqual([
      { phase: "notice", duration: 170 },
      { phase: "act", duration: 300 }
    ]);
    expect(getBehaviorTimeline("success").map((step) => step.phase)).toEqual([
      "notice",
      "act",
      "settle",
      "hold"
    ]);
    expect(getBehaviorTimeline("idle")).toEqual([{ phase: "rest", duration: null }]);
  });

  it("distributes privacy and listening work instead of cloning one pose", () => {
    expect(getCharacterCue("privacy", "purple")).toBe("guard");
    expect(getCharacterCue("privacy", "black")).toBe("close-eyes");
    expect(getCharacterCue("privacy", "orange")).toBe("close-eyes");
    expect(getCharacterCue("privacy", "yellow")).toBe("avert");

    expect(getCharacterCue("name", "purple")).toBe("lean-in");
    expect(getCharacterCue("name", "black")).toBe("peek");
    expect(getCharacterCue("listening", "purple")).toBe("listen");
    expect(getCharacterCue("listening", "black")).toBe("peek");
  });

  it("stages a mutual glance as a conversation rather than a simultaneous toggle", () => {
    expect(getIdleConversation("purple-black")).toEqual([
      { at: 0, cues: { purple: "glance-right" } },
      { at: 140, cues: { purple: "glance-right", black: "glance-left" } },
      { at: 560, cues: { purple: "glance-right" } },
      { at: 700, cues: {} }
    ]);
    expect(getIdleConversation("orange-yellow")[1].cues).toEqual({
      orange: "glance-right",
      yellow: "glance-left"
    });
  });

  it("keeps blink rhythms distinct without synchronizing the characters", () => {
    const earliest = ["purple", "black", "orange", "yellow"].map((name) =>
      getBlinkDelay(name as "purple" | "black" | "orange" | "yellow", () => 0)
    );
    const durations = ["purple", "black", "orange", "yellow"].map((name) =>
      getBlinkDuration(name as "purple" | "black" | "orange" | "yellow")
    );

    expect(new Set(earliest).size).toBe(4);
    expect(new Set(durations).size).toBe(4);
    expect(getBlinkDelay("purple", () => 1)).toBeGreaterThan(earliest[0]);
  });
});
