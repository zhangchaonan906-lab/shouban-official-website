export const CURVED_HERO_SLOT_COUNT = 8;
export const CURVED_HERO_SLOT_STEP =
  (Math.PI * 2) / CURVED_HERO_SLOT_COUNT;
export const CURVED_HERO_DRAG_RADIANS_PER_PIXEL = 0.006;

export function slotAngle(index: number) {
  return index * CURVED_HERO_SLOT_STEP;
}

export function wrapSlotIndex(index: number) {
  return (
    ((index % CURVED_HERO_SLOT_COUNT) + CURVED_HERO_SLOT_COUNT) %
    CURVED_HERO_SLOT_COUNT
  );
}

export function activeSlotIndex(
  rotation: number,
  slotCount = CURVED_HERO_SLOT_COUNT
) {
  if (
    !Number.isFinite(rotation) ||
    !Number.isInteger(slotCount) ||
    slotCount <= 0
  ) {
    return 0;
  }

  const slotStep = (Math.PI * 2) / slotCount;
  const nearestSlot = Math.round(-rotation / slotStep);

  return ((nearestSlot % slotCount) + slotCount) % slotCount;
}

export function dampRotation(
  current: number,
  target: number,
  amount: number
) {
  return current + (target - current) * amount;
}

export function rotationFromPixels(deltaX: number) {
  return deltaX * CURVED_HERO_DRAG_RADIANS_PER_PIXEL;
}

export function applyFriction(velocity: number, friction: number) {
  return velocity * friction;
}

export function curvedHeroViewport(width: number) {
  const progress = Math.min(Math.max((width - 640) / 384, 0), 1);

  return {
    cameraFov: 42 - 4 * progress,
    cameraZ: 12 - 1.5 * progress,
    ringScale: 0.84 + 0.16 * progress
  } as const;
}
