function assertValidSlideCount(count: number): void {
  if (count <= 0) {
    throw new RangeError("Slide count must be greater than zero.");
  }

  if (!Number.isSafeInteger(count)) {
    throw new RangeError("Slide count must be a safe integer.");
  }
}

function assertValidSlideIndex(index: number): void {
  if (!Number.isSafeInteger(index)) {
    throw new RangeError("Slide index must be a safe integer.");
  }
}

export function normalizeSlideIndex(index: number, count: number): number {
  assertValidSlideCount(count);
  assertValidSlideIndex(index);
  return ((index % count) + count) % count;
}

export function getNextSlideIndex(
  currentIndex: number,
  count: number
): number {
  const normalizedIndex = normalizeSlideIndex(currentIndex, count);
  return normalizedIndex === count - 1 ? 0 : normalizedIndex + 1;
}

export function getPreviousSlideIndex(
  currentIndex: number,
  count: number
): number {
  const normalizedIndex = normalizeSlideIndex(currentIndex, count);
  return normalizedIndex === 0 ? count - 1 : normalizedIndex - 1;
}
