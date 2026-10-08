import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { curvedHeroCards } from "../content/home";
import * as curvedHeroMotion from "../lib/curved-hero";
import {
  CURVED_HERO_DRAG_RADIANS_PER_PIXEL,
  CURVED_HERO_SLOT_COUNT,
  CURVED_HERO_SLOT_STEP,
  applyFriction,
  curvedHeroViewport,
  dampRotation,
  rotationFromPixels,
  slotAngle,
  wrapSlotIndex
} from "../lib/curved-hero";

describe("curved hero motion contract", () => {
  it("selects the nearest visible slot and safely rejects invalid inputs", () => {
    const activeSlotIndex = (
      curvedHeroMotion as typeof curvedHeroMotion & {
        activeSlotIndex?: (rotation: number, slotCount?: number) => number;
      }
    ).activeSlotIndex;

    expect(activeSlotIndex).toBeTypeOf("function");
    expect(activeSlotIndex!(0)).toBe(0);
    expect(activeSlotIndex!(-Math.PI / 4)).toBe(1);
    expect(activeSlotIndex!(Math.PI / 4)).toBe(7);
    expect(activeSlotIndex!((-9 * Math.PI) / 4)).toBe(1);
    expect(activeSlotIndex!((9 * Math.PI) / 4)).toBe(7);
    expect(activeSlotIndex!(Number.NaN)).toBe(0);
    expect(activeSlotIndex!(Number.POSITIVE_INFINITY)).toBe(0);
    expect(activeSlotIndex!(0, 0)).toBe(0);
    expect(activeSlotIndex!(0, 2.5)).toBe(0);
  });

  it("defines eight evenly spaced slots", () => {
    expect(CURVED_HERO_DRAG_RADIANS_PER_PIXEL).toBe(0.006);
    expect(CURVED_HERO_SLOT_COUNT).toBe(8);
    expect(CURVED_HERO_SLOT_STEP).toBeCloseTo(Math.PI / 4);
    expect(slotAngle(0)).toBe(0);
    expect(slotAngle(7)).toBeCloseTo((7 * Math.PI) / 4);
  });

  it("wraps slot indexes around the eight-slot ring", () => {
    expect(wrapSlotIndex(-1)).toBe(7);
    expect(wrapSlotIndex(8)).toBe(0);
  });

  it("damps rotation toward its target without overshooting", () => {
    expect(dampRotation(0, 1, 0.08)).toBeCloseTo(0.08);
    const dampedRotation = dampRotation(0.9, 1, 0.08);
    const reverseDampedRotation = dampRotation(1, 0, 0.08);

    expect(dampedRotation).toBeGreaterThan(0.9);
    expect(dampedRotation).toBeLessThan(1);
    expect(reverseDampedRotation).toBeCloseTo(0.92);
    expect(reverseDampedRotation).toBeGreaterThan(0);
    expect(reverseDampedRotation).toBeLessThan(1);
  });

  it("converts drag pixels into radians", () => {
    expect(rotationFromPixels(100)).toBeCloseTo(0.6);
    expect(rotationFromPixels(-100)).toBeCloseTo(-0.6);
  });

  it("applies friction to angular velocity", () => {
    expect(applyFriction(1, 0.94)).toBeCloseTo(0.94);
    expect(applyFriction(-1, 0.94)).toBeCloseTo(-0.94);
  });

  it("interpolates the carousel camera without a 767px breakpoint jump", () => {
    expect(curvedHeroViewport(432)).toEqual({
      cameraFov: 42,
      cameraZ: 12,
      ringScale: 0.84
    });
    const belowTablet = curvedHeroViewport(767);
    const tablet = curvedHeroViewport(768);
    expect(Math.abs(belowTablet.cameraFov - tablet.cameraFov)).toBeLessThan(0.02);
    expect(Math.abs(belowTablet.cameraZ - tablet.cameraZ)).toBeLessThan(0.01);
    expect(Math.abs(belowTablet.ringScale - tablet.ringScale)).toBeLessThan(0.002);
    expect(curvedHeroViewport(1024)).toEqual({
      cameraFov: 38,
      cameraZ: 10.5,
      ringScale: 1
    });
    expect(curvedHeroViewport(1440)).toEqual({
      cameraFov: 38,
      cameraZ: 10.5,
      ringScale: 1
    });
  });

  it("provides eight unique image-backed card records", () => {
    const expectedSources = [
      "/images/home/hero-campus.webp",
      "/images/home/hero-bpc.webp",
      "/images/home/hero-campus-courtyard.webp",
      "/images/home/hero-campus-corridor.webp",
      "/images/home/hero-campus-entrance.webp",
      "/images/home/hero-boardroom.webp",
      "/images/home/hero-auditorium.webp",
      "/images/home/hero-compliant-licensing.webp"
    ];
    const sources = curvedHeroCards.map(({ src }) => src);

    expect(curvedHeroCards).toHaveLength(8);
    expect(sources).toEqual(expectedSources);
    expect(new Set(sources)).toHaveProperty("size", 8);

    curvedHeroCards.forEach(({ src, href, alt, aspect }) => {
      expect(src).not.toBeNull();
      expect(src).toMatch(/\.webp$/);
      expect(alt.trim()).not.toBe("");
      expect(href).toBeNull();
      expect(aspect).toBe(1.6);
      expect(
        existsSync(join(process.cwd(), "public", (src as string).slice(1)))
      ).toBe(true);
    });
  });
});
