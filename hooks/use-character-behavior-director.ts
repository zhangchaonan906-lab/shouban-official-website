"use client";

import { useEffect, useMemo, useState } from "react";
import {
  characterOrder,
  getBehaviorTimeline,
  getBlinkDelay,
  getBlinkDuration,
  getCharacterCue,
  getCharacterScene,
  getIdleConversation,
  type CharacterCue,
  type CharacterCueMap,
  type CharacterName,
  type CharacterPhase,
  type CharacterScene,
  type CharacterState,
  type ContactFieldName,
  type GlancePair
} from "@/components/contact/character-behavior";

type UseCharacterBehaviorDirectorInput = {
  state: CharacterState;
  activeField: ContactFieldName | null;
  reducedMotion: boolean;
};

type PhaseState = {
  scene: CharacterScene;
  phase: CharacterPhase;
};

function getInitialPhase(scene: CharacterScene, reducedMotion: boolean): CharacterPhase {
  const timeline = getBehaviorTimeline(scene);
  return reducedMotion ? timeline[timeline.length - 1].phase : timeline[0].phase;
}

function clearCharacterCue(cues: CharacterCueMap, name: CharacterName): CharacterCueMap {
  if (!(name in cues)) {
    return cues;
  }

  const next = { ...cues };
  delete next[name];
  return next;
}

export function useCharacterBehaviorDirector({
  state,
  activeField,
  reducedMotion
}: UseCharacterBehaviorDirectorInput) {
  const scene = getCharacterScene(state, activeField);
  const [phaseState, setPhaseState] = useState<PhaseState>(() => ({
    scene,
    phase: getInitialPhase(scene, reducedMotion)
  }));
  const [idleCues, setIdleCues] = useState<CharacterCueMap>({});
  const phase = phaseState.scene === scene
    ? phaseState.phase
    : getInitialPhase(scene, reducedMotion);

  useEffect(() => {
    const timeline = getBehaviorTimeline(scene);
    const timeouts = new Set<number>();
    const initialPhase = getInitialPhase(scene, reducedMotion);
    setPhaseState({ scene, phase: initialPhase });

    if (reducedMotion) {
      return undefined;
    }

    let elapsed = 0;
    timeline.slice(0, -1).forEach((step, index) => {
      if (step.duration === null) {
        return;
      }

      elapsed += step.duration;
      const nextPhase = timeline[index + 1].phase;
      const timeout = window.setTimeout(() => {
        timeouts.delete(timeout);
        setPhaseState({ scene, phase: nextPhase });
      }, elapsed);
      timeouts.add(timeout);
    });

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [reducedMotion, scene]);

  useEffect(() => {
    setIdleCues({});

    if (reducedMotion || scene !== "idle") {
      return undefined;
    }

    let cancelled = false;
    let conversationActive = false;
    const timeouts = new Set<number>();
    const scheduleTimeout = (callback: () => void, delay: number) => {
      const timeout = window.setTimeout(() => {
        timeouts.delete(timeout);
        callback();
      }, delay);
      timeouts.add(timeout);
      return timeout;
    };

    const scheduleBlink = (name: CharacterName) => {
      scheduleTimeout(() => {
        if (cancelled) {
          return;
        }

        if (conversationActive) {
          scheduleBlink(name);
          return;
        }

        setIdleCues((current) => ({ ...current, [name]: "blink" }));
        scheduleTimeout(() => {
          if (cancelled) {
            return;
          }

          setIdleCues((current) => clearCharacterCue(current, name));
          scheduleBlink(name);
        }, getBlinkDuration(name));
      }, getBlinkDelay(name));
    };

    const scheduleConversation = () => {
      scheduleTimeout(() => {
        if (cancelled) {
          return;
        }

        conversationActive = true;
        const pair: GlancePair = Math.random() < 0.5 ? "purple-black" : "orange-yellow";
        const sequence = getIdleConversation(pair);

        sequence.forEach((step, index) => {
          if (step.at === 0) {
            setIdleCues(step.cues);
            return;
          }

          scheduleTimeout(() => {
            if (cancelled) {
              return;
            }

            setIdleCues(step.cues);
            if (index === sequence.length - 1) {
              conversationActive = false;
              scheduleConversation();
            }
          }, step.at);
        });
      }, 4800 + Math.round(Math.random() * 3600));
    };

    characterOrder.forEach(scheduleBlink);
    scheduleConversation();

    return () => {
      cancelled = true;
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [reducedMotion, scene]);

  const cues = useMemo<Record<CharacterName, CharacterCue>>(() => {
    return Object.fromEntries(
      characterOrder.map((name) => [
        name,
        scene === "idle" ? idleCues[name] ?? "rest" : getCharacterCue(scene, name)
      ])
    ) as Record<CharacterName, CharacterCue>;
  }, [idleCues, scene]);

  return { scene, phase, cues };
}
