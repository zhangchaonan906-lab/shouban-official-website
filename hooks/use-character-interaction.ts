"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  characterOrder,
  type CharacterName,
  type CharacterState,
  type ContactFieldName
} from "@/components/contact/character-behavior";

export type {
  CharacterState,
  ContactFieldName
} from "@/components/contact/character-behavior";

export type CharacterStateInput = {
  activeField?: ContactFieldName | null;
  hasValidationError?: boolean;
  submitting?: boolean;
  success?: boolean;
  submitError?: boolean;
};

type UseCharacterInteractionInput = CharacterStateInput & {
  typingSignal?: number;
};

export type EyePosition = {
  x: number;
  y: number;
};

export type EyeMotion = {
  position: EyePosition;
  velocity: EyePosition;
};

export type EyeSpringConfig = {
  stiffness: number;
  damping: number;
};

export type EyeTargetRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const pupilLimits: EyePosition = { x: 4.5, y: 3.4 };
const defaultEyeTargets: Record<CharacterName, EyePosition> = {
  purple: { x: 2.1, y: -0.4 },
  black: { x: 2.8, y: -0.7 },
  orange: { x: 1.6, y: -0.15 },
  yellow: { x: 2.45, y: -0.3 }
};

export const eyeSpringConfigs: Record<CharacterName, EyeSpringConfig> = {
  purple: { stiffness: 170, damping: 19 },
  black: { stiffness: 196, damping: 21 },
  orange: { stiffness: 144, damping: 17.5 },
  yellow: { stiffness: 158, damping: 20 }
};

const stateEyeTargets: Record<Exclude<CharacterState, "idle" | "focused">, Record<CharacterName, EyePosition>> = {
  typing: {
    purple: { x: 3.5, y: -1.3 },
    black: { x: 3.9, y: -1.6 },
    orange: { x: 2.7, y: -0.7 },
    yellow: { x: 3.35, y: -1.05 }
  },
  privacy: {
    purple: { x: -3.6, y: -0.9 },
    black: { x: -2.4, y: -1.5 },
    orange: { x: -2.8, y: 1.15 },
    yellow: { x: -3.75, y: -0.35 }
  },
  error: {
    purple: { x: 0.3, y: -1.25 },
    black: { x: 0.8, y: -1.45 },
    orange: { x: 0.15, y: -0.8 },
    yellow: { x: -0.5, y: -1.0 }
  },
  submitting: {
    purple: { x: 3.7, y: 2.45 },
    black: { x: 4.05, y: 2.7 },
    orange: { x: 3.25, y: 2.15 },
    yellow: { x: 3.8, y: 2.55 }
  },
  success: {
    purple: { x: 2.3, y: -1.45 },
    black: { x: 2.9, y: -1.65 },
    orange: { x: 1.7, y: -0.95 },
    yellow: { x: 2.55, y: -1.2 }
  }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampPupilTarget(target: EyePosition, limits = pupilLimits): EyePosition {
  const normalizedX = target.x / limits.x;
  const normalizedY = target.y / limits.y;
  const normalizedDistance = Math.hypot(normalizedX, normalizedY);

  if (normalizedDistance <= 1) {
    return target;
  }

  return {
    x: target.x / normalizedDistance,
    y: target.y / normalizedDistance
  };
}

export function getLocalPointerTarget(
  pointer: EyePosition,
  rect: EyeTargetRect,
  limits = pupilLimits
): EyePosition {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const deltaX = pointer.x - centerX;
  const deltaY = pointer.y - centerY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance === 0) {
    return { x: 0, y: 0 };
  }

  const reach = Math.min(1, distance / 150);
  const angle = Math.atan2(deltaY, deltaX);

  return clampPupilTarget({
    x: Math.cos(angle) * limits.x * reach,
    y: Math.sin(angle) * limits.y * reach
  }, limits);
}

export function stepEyeSpring(
  current: EyeMotion,
  target: EyePosition,
  deltaSeconds: number,
  config: EyeSpringConfig
): EyeMotion {
  const delta = clamp(deltaSeconds, 0, 0.04);
  const damping = Math.exp(-config.damping * delta);
  const velocity = {
    x: (current.velocity.x + (target.x - current.position.x) * config.stiffness * delta) * damping,
    y: (current.velocity.y + (target.y - current.position.y) * config.stiffness * delta) * damping
  };

  return {
    position: {
      x: current.position.x + velocity.x * delta,
      y: current.position.y + velocity.y * delta
    },
    velocity
  };
}

export function getFieldCharacterState(field: ContactFieldName): CharacterState {
  if (field === "phone" || field === "email") {
    return "privacy";
  }

  if (field === "message") {
    return "typing";
  }

  return "focused";
}

export function resolveCharacterState({
  activeField = null,
  hasValidationError = false,
  submitting = false,
  success = false,
  submitError = false
}: CharacterStateInput): CharacterState {
  if (success) {
    return "success";
  }

  if (submitting) {
    return "submitting";
  }

  if (submitError || hasValidationError) {
    return "error";
  }

  if (activeField) {
    return getFieldCharacterState(activeField);
  }

  return "idle";
}

export function getCharacterEyeTarget(
  name: CharacterName,
  state: CharacterState,
  pointerTarget: EyePosition,
  pointerInside: boolean,
  fieldTarget?: EyePosition
): EyePosition {
  if (state === "typing" && fieldTarget) {
    return clampPupilTarget(fieldTarget);
  }

  if (state === "idle" || state === "focused") {
    return pointerInside ? clampPupilTarget(pointerTarget) : defaultEyeTargets[name];
  }

  return stateEyeTargets[state][name];
}

function createInitialEyeMotion(): Record<CharacterName, EyeMotion> {
  return Object.fromEntries(
    characterOrder.map((name) => [
      name,
      {
        position: { ...defaultEyeTargets[name] },
        velocity: { x: 0, y: 0 }
      }
    ])
  ) as Record<CharacterName, EyeMotion>;
}

export function useCharacterInteraction({
  activeField = null,
  hasValidationError = false,
  submitting = false,
  success = false,
  submitError = false,
  typingSignal = 0
}: UseCharacterInteractionInput) {
  const interactionState = resolveCharacterState({
    activeField,
    hasValidationError,
    submitting,
    success,
    submitError
  });
  const shellRef = useRef<HTMLFormElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const pointerRef = useRef<EyePosition>({ x: 0, y: 0 });
  const eyeMotionRef = useRef<Record<CharacterName, EyeMotion>>(createInitialEyeMotion());
  const lastFrameTimeRef = useRef<number | null>(null);
  const followDeadlineRef = useRef(0);
  const pointerInsideRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const stateRef = useRef<CharacterState>(interactionState);
  const [reducedMotion, setReducedMotion] = useState(false);

  stateRef.current = interactionState;

  const animateEyes = useCallback(function animateEyes(timestamp: number) {
    frameRef.current = null;
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    const previousTime = lastFrameTimeRef.current;
    const deltaSeconds = previousTime === null ? 1 / 60 : Math.min((timestamp - previousTime) / 1000, 0.04);
    const frameAdvanced = previousTime === null || timestamp > previousTime;
    lastFrameTimeRef.current = timestamp;
    let unsettled = false;
    const messageRect = stateRef.current === "typing"
      ? shell.querySelector<HTMLElement>('[name="message"]')?.getBoundingClientRect()
      : undefined;
    const messagePoint = messageRect
      ? {
          x: messageRect.left + Math.min(96, messageRect.width * 0.2),
          y: messageRect.top + Math.min(24, messageRect.height * 0.42)
        }
      : undefined;

    characterOrder.forEach((name) => {
      const face = shell.querySelector<HTMLElement>(`#contact-face-${name}`);
      if (!face) {
        return;
      }

      const faceRect = face.getBoundingClientRect();
      const localPointerTarget = pointerInsideRef.current
        ? getLocalPointerTarget(pointerRef.current, faceRect)
        : defaultEyeTargets[name];
      const fieldTarget = messagePoint
        ? getLocalPointerTarget(messagePoint, faceRect)
        : undefined;
      const target = getCharacterEyeTarget(
        name,
        stateRef.current,
        localPointerTarget,
        pointerInsideRef.current,
        fieldTarget
      );
      const nextMotion = reducedMotionRef.current
        ? { position: target, velocity: { x: 0, y: 0 } }
        : stepEyeSpring(eyeMotionRef.current[name], target, deltaSeconds, eyeSpringConfigs[name]);
      const { position, velocity } = nextMotion;

      eyeMotionRef.current[name] = nextMotion;
      face.style.setProperty("--contact-eye-x", `${position.x.toFixed(2)}px`);
      face.style.setProperty("--contact-eye-y", `${position.y.toFixed(2)}px`);

      const distance = Math.hypot(target.x - position.x, target.y - position.y);
      const speed = Math.hypot(velocity.x, velocity.y);
      unsettled ||= distance > 0.025 || speed > 0.025;
    });

    if (
      !reducedMotionRef.current
      && frameAdvanced
      && (unsettled || timestamp < followDeadlineRef.current)
    ) {
      frameRef.current = window.requestAnimationFrame(animateEyes);
    } else {
      lastFrameTimeRef.current = null;
    }
  }, []);

  const scheduleEyeFrame = useCallback((followFor = 0) => {
    followDeadlineRef.current = Math.max(
      followDeadlineRef.current,
      window.performance.now() + followFor
    );
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(animateEyes);
  }, [animateEyes]);

  const handlePointerEnter = useCallback((event: ReactPointerEvent<HTMLFormElement>) => {
    pointerInsideRef.current = true;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    scheduleEyeFrame(220);
  }, [scheduleEyeFrame]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLFormElement>) => {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    scheduleEyeFrame(180);
  }, [scheduleEyeFrame]);

  const handlePointerLeave = useCallback(() => {
    pointerInsideRef.current = false;
    scheduleEyeFrame(520);
  }, [scheduleEyeFrame]);

  useEffect(() => {
    scheduleEyeFrame(900);
  }, [interactionState, scheduleEyeFrame]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => {
      reducedMotionRef.current = mediaQuery.matches;
      setReducedMotion(mediaQuery.matches);
      scheduleEyeFrame();
    };

    updateReducedMotion();
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", updateReducedMotion);
    } else if (legacyMediaQuery.addListener) {
      legacyMediaQuery.addListener(updateReducedMotion);
    }

    return () => {
      if ("removeEventListener" in mediaQuery) {
        mediaQuery.removeEventListener("change", updateReducedMotion);
      } else if (legacyMediaQuery.removeListener) {
        legacyMediaQuery.removeListener(updateReducedMotion);
      }
    };
  }, [scheduleEyeFrame]);

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell || activeField !== "message" || typingSignal === 0) {
      return;
    }

    shell.style.setProperty("--contact-typing-intensity", "1");
    shell.style.setProperty("--contact-typing-eye-x", "0.25px");

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      shell.style.setProperty("--contact-typing-intensity", "0");
      shell.style.setProperty("--contact-typing-eye-x", "0px");
      typingTimeoutRef.current = null;
    }, 360);
  }, [activeField, typingSignal]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const shellPointerHandlers = useMemo(
    () => ({
      onPointerEnter: handlePointerEnter,
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave
    }),
    [handlePointerEnter, handlePointerLeave, handlePointerMove]
  );

  return {
    shellRef,
    shellPointerHandlers,
    interactionState,
    reducedMotion
  };
}
