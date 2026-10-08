import type { ContactFormValues } from "@/lib/contact";

export type ContactFieldName = keyof ContactFormValues;

export type CharacterState =
  | "idle"
  | "focused"
  | "typing"
  | "privacy"
  | "error"
  | "submitting"
  | "success";

export type CharacterName = "purple" | "black" | "orange" | "yellow";

export type CharacterPhase = "rest" | "notice" | "act" | "hold" | "settle";

export type CharacterScene =
  | "idle"
  | "name"
  | "general"
  | "privacy"
  | "listening"
  | "error"
  | "submitting"
  | "success";

export type CharacterCue =
  | "rest"
  | "blink"
  | "watch-form"
  | "lean-in"
  | "peek"
  | "guard"
  | "close-eyes"
  | "avert"
  | "listen"
  | "question"
  | "watch-button"
  | "celebrate"
  | "glance-left"
  | "glance-right";

export type GlancePair = "purple-black" | "orange-yellow";

export type BehaviorStep = {
  phase: CharacterPhase;
  duration: number | null;
};

export type CharacterCueMap = Partial<Record<CharacterName, CharacterCue>>;

export type IdleConversationStep = {
  at: number;
  cues: CharacterCueMap;
};

type BlinkTiming = {
  minDelay: number;
  delayRange: number;
  duration: number;
};

export const characterOrder: readonly CharacterName[] = ["purple", "black", "orange", "yellow"];

const behaviorTimelines: Record<CharacterScene, readonly BehaviorStep[]> = {
  idle: [{ phase: "rest", duration: null }],
  name: [
    { phase: "notice", duration: 170 },
    { phase: "act", duration: 300 },
    { phase: "hold", duration: null }
  ],
  general: [
    { phase: "notice", duration: 150 },
    { phase: "act", duration: 280 },
    { phase: "hold", duration: null }
  ],
  privacy: [
    { phase: "notice", duration: 180 },
    { phase: "act", duration: 380 },
    { phase: "hold", duration: null }
  ],
  listening: [
    { phase: "notice", duration: 170 },
    { phase: "act", duration: 380 },
    { phase: "hold", duration: null }
  ],
  error: [
    { phase: "notice", duration: 120 },
    { phase: "act", duration: 330 },
    { phase: "hold", duration: null }
  ],
  submitting: [
    { phase: "notice", duration: 120 },
    { phase: "act", duration: 260 },
    { phase: "hold", duration: null }
  ],
  success: [
    { phase: "notice", duration: 100 },
    { phase: "act", duration: 620 },
    { phase: "settle", duration: 260 },
    { phase: "hold", duration: null }
  ]
};

const blinkTimings: Record<CharacterName, BlinkTiming> = {
  purple: { minDelay: 2500, delayRange: 3100, duration: 112 },
  black: { minDelay: 3150, delayRange: 2700, duration: 132 },
  orange: { minDelay: 3750, delayRange: 3000, duration: 96 },
  yellow: { minDelay: 2850, delayRange: 3500, duration: 124 }
};

const sceneCues: Record<Exclude<CharacterScene, "idle">, Record<CharacterName, CharacterCue>> = {
  name: {
    purple: "lean-in",
    black: "peek",
    orange: "watch-form",
    yellow: "watch-form"
  },
  general: {
    purple: "watch-form",
    black: "peek",
    orange: "rest",
    yellow: "watch-form"
  },
  privacy: {
    purple: "guard",
    black: "close-eyes",
    orange: "close-eyes",
    yellow: "avert"
  },
  listening: {
    purple: "listen",
    black: "peek",
    orange: "watch-form",
    yellow: "listen"
  },
  error: {
    purple: "question",
    black: "question",
    orange: "question",
    yellow: "question"
  },
  submitting: {
    purple: "watch-button",
    black: "watch-button",
    orange: "watch-button",
    yellow: "watch-button"
  },
  success: {
    purple: "celebrate",
    black: "celebrate",
    orange: "celebrate",
    yellow: "celebrate"
  }
};

export function getCharacterScene(
  state: CharacterState,
  activeField: ContactFieldName | null = null
): CharacterScene {
  if (state === "focused") {
    return activeField === "name" ? "name" : "general";
  }

  if (state === "typing") {
    return "listening";
  }

  return state;
}

export function getBehaviorTimeline(scene: CharacterScene): readonly BehaviorStep[] {
  return behaviorTimelines[scene];
}

export function getCharacterCue(scene: CharacterScene, name: CharacterName): CharacterCue {
  return scene === "idle" ? "rest" : sceneCues[scene][name];
}

export function getBlinkDelay(name: CharacterName, random = Math.random): number {
  const timing = blinkTimings[name];
  return Math.round(timing.minDelay + random() * timing.delayRange);
}

export function getBlinkDuration(name: CharacterName): number {
  return blinkTimings[name].duration;
}

export function getIdleConversation(pair: GlancePair): readonly IdleConversationStep[] {
  const [initiator, responder]: readonly [CharacterName, CharacterName] = pair === "purple-black"
    ? ["purple", "black"]
    : ["orange", "yellow"];

  return [
    { at: 0, cues: { [initiator]: "glance-right" } },
    {
      at: 140,
      cues: {
        [initiator]: "glance-right",
        [responder]: "glance-left"
      }
    },
    { at: 560, cues: { [initiator]: "glance-right" } },
    { at: 700, cues: {} }
  ];
}
