import { describe, expect, it } from "vitest";
import {
  clampPupilTarget,
  eyeSpringConfigs,
  getCharacterEyeTarget,
  getLocalPointerTarget,
  stepEyeSpring
} from "../hooks/use-character-interaction";
import {
  getBlinkDelay,
  getBlinkDuration,
  getGlanceDirections
} from "../components/contact/animated-form-characters";

describe("contact character eye motion", () => {
  it("clamps a pointer target to the pupil movement ellipse", () => {
    const clamped = clampPupilTarget({ x: 20, y: 20 }, { x: 4.5, y: 3.4 });
    const normalizedDistance = (clamped.x / 4.5) ** 2 + (clamped.y / 3.4) ** 2;

    expect(normalizedDistance).toBeLessThanOrEqual(1.0001);
    expect(clamped.x).toBeGreaterThan(0);
    expect(clamped.x).toBeLessThanOrEqual(4.5);
    expect(clamped.y).toBeGreaterThan(0);
    expect(clamped.y).toBeLessThanOrEqual(3.4);
  });

  it("preserves targets already inside the movement ellipse", () => {
    expect(clampPupilTarget({ x: 2, y: -1 }, { x: 4.5, y: 3.4 })).toEqual({ x: 2, y: -1 });
  });

  it("calculates each character's pointer vector from its own face center", () => {
    const pointer = { x: 500, y: 200 };
    const purple = getLocalPointerTarget(pointer, { left: 100, top: 100, width: 40, height: 40 });
    const yellow = getLocalPointerTarget(pointer, { left: 300, top: 100, width: 40, height: 40 });

    expect(purple).not.toEqual(yellow);
    expect(purple.x).toBeGreaterThan(0);
    expect(yellow.x).toBeGreaterThan(0);
    expect((purple.x / 4.5) ** 2 + (purple.y / 3.4) ** 2).toBeLessThanOrEqual(1.0001);
    expect(getLocalPointerTarget({ x: 120, y: 120 }, { left: 100, top: 100, width: 40, height: 40 }))
      .toEqual({ x: 0, y: 0 });
  });

  it("moves each eye with its own spring instead of snapping", () => {
    const next = stepEyeSpring(
      { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
      { x: 4, y: 2 },
      1 / 60,
      eyeSpringConfigs.purple
    );

    expect(next.position.x).toBeGreaterThan(0);
    expect(next.position.x).toBeLessThan(4);
    expect(next.velocity.x).toBeGreaterThan(0);
    expect(new Set(Object.values(eyeSpringConfigs).map((config) => config.stiffness)).size).toBe(4);
  });

  it("uses character-specific contextual targets while keeping idle pointed toward the form", () => {
    const pointer = { x: -3, y: 1 };

    expect(getCharacterEyeTarget("purple", "idle", pointer, false).x).toBeGreaterThan(0);
    expect(getCharacterEyeTarget("purple", "idle", pointer, true)).toEqual(pointer);
    expect(getCharacterEyeTarget("purple", "idle", pointer, false))
      .not.toEqual(getCharacterEyeTarget("yellow", "idle", pointer, false));
    expect(getCharacterEyeTarget("purple", "privacy", { x: 4, y: 2 }, true).x).toBeLessThan(0);
    expect(getCharacterEyeTarget("orange", "privacy", { x: 4, y: 2 }, true).y).toBeGreaterThan(0);
    expect(getCharacterEyeTarget("black", "typing", { x: -4, y: 2 }, true).x).toBeGreaterThan(0);
    expect(getCharacterEyeTarget("yellow", "submitting", { x: -4, y: -2 }, true).y).toBeGreaterThan(0);
  });

  it("aims each listening character from its own face toward the message field", () => {
    const messagePoint = { x: 900, y: 360 };
    const purpleTarget = getLocalPointerTarget(messagePoint, {
      left: 200,
      top: 180,
      width: 100,
      height: 80
    });
    const orangeTarget = getLocalPointerTarget(messagePoint, {
      left: 120,
      top: 370,
      width: 100,
      height: 80
    });

    expect(purpleTarget.x).toBeGreaterThan(0);
    expect(purpleTarget.y).toBeGreaterThan(0);
    expect(orangeTarget.x).toBeGreaterThan(0);
    expect(orangeTarget.y).toBeLessThan(0);
    expect(getCharacterEyeTarget("purple", "typing", { x: 0, y: 0 }, false, purpleTarget))
      .toEqual(purpleTarget);
    expect(getCharacterEyeTarget("orange", "typing", { x: 0, y: 0 }, false, orangeTarget))
      .toEqual(orangeTarget);
  });
});

describe("contact character idle scheduling", () => {
  it("gives every character a distinct blink rhythm", () => {
    const earliest = {
      purple: getBlinkDelay("purple", () => 0),
      black: getBlinkDelay("black", () => 0),
      orange: getBlinkDelay("orange", () => 0),
      yellow: getBlinkDelay("yellow", () => 0)
    };

    expect(new Set(Object.values(earliest)).size).toBe(4);
    expect(getBlinkDelay("orange", () => 1)).toBeGreaterThan(earliest.orange);
    expect(new Set([
      getBlinkDuration("purple"),
      getBlinkDuration("black"),
      getBlinkDuration("orange"),
      getBlinkDuration("yellow")
    ]).size).toBe(4);
  });

  it("maps mutual glances to opposite directions within each pair", () => {
    expect(getGlanceDirections("purple-black")).toEqual({
      purple: "right",
      black: "left"
    });
    expect(getGlanceDirections("orange-yellow")).toEqual({
      orange: "right",
      yellow: "left"
    });
  });
});
