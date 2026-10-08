import { describe, expect, it } from "vitest";
import {
  getNextSlideIndex,
  getPreviousSlideIndex,
  normalizeSlideIndex
} from "../lib/carousel";

describe("carousel index helpers", () => {
  it("moves from the first slide to the second slide", () => {
    expect(getNextSlideIndex(0, 3)).toBe(1);
  });

  it("wraps from the final slide to the first slide", () => {
    expect(getNextSlideIndex(2, 3)).toBe(0);
  });

  it("wraps from the first slide to the final slide", () => {
    expect(getPreviousSlideIndex(0, 3)).toBe(2);
  });

  it("moves from the final slide to the previous slide", () => {
    expect(getPreviousSlideIndex(2, 3)).toBe(1);
  });

  it("keeps a valid target index unchanged", () => {
    expect(normalizeSlideIndex(1, 3)).toBe(1);
  });

  it("normalizes target indices outside the slide range", () => {
    expect(normalizeSlideIndex(3, 3)).toBe(0);
    expect(normalizeSlideIndex(-1, 3)).toBe(2);
  });

  it.each([
    ["next", getNextSlideIndex],
    ["previous", getPreviousSlideIndex],
    ["target", normalizeSlideIndex]
  ])("rejects a non-positive slide count for %s indices", (_name, getIndex) => {
    expect(() => getIndex(0, 0)).toThrow(RangeError);
    expect(() => getIndex(0, -1)).toThrow("Slide count must be greater than zero.");
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    1.5,
    2 ** 53
  ])(
    "rejects an unsafe slide count: %s",
    (count) => {
      expect(() => normalizeSlideIndex(0, count)).toThrow(RangeError);
    }
  );

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    1.5,
    2 ** 53
  ])(
    "rejects an unsafe slide index: %s",
    (index) => {
      expect(() => normalizeSlideIndex(index, 3)).toThrow(RangeError);
      expect(() => getNextSlideIndex(index, 3)).toThrow(RangeError);
      expect(() => getPreviousSlideIndex(index, 3)).toThrow(RangeError);
    }
  );
});
