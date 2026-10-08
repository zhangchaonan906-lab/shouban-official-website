"use client";

import { memo } from "react";
import { FormCharacter } from "@/components/contact/form-character";
import {
  characterOrder,
  type CharacterName,
  type CharacterState,
  type ContactFieldName,
  type GlancePair
} from "@/components/contact/character-behavior";
import { useCharacterBehaviorDirector } from "@/hooks/use-character-behavior-director";

type AnimatedFormCharactersProps = {
  state: CharacterState;
  activeField: ContactFieldName | null;
  reducedMotion: boolean;
};

export { getBlinkDelay, getBlinkDuration } from "@/components/contact/character-behavior";
export type { GlancePair } from "@/components/contact/character-behavior";

export function getGlanceDirections(pair: GlancePair): Partial<Record<CharacterName, "left" | "right">> {
  if (pair === "purple-black") {
    return { purple: "right", black: "left" };
  }

  return { orange: "right", yellow: "left" };
}

export const AnimatedFormCharacters = memo(function AnimatedFormCharacters({
  state,
  activeField,
  reducedMotion
}: AnimatedFormCharactersProps) {
  const { scene, phase, cues } = useCharacterBehaviorDirector({
    state,
    activeField,
    reducedMotion
  });

  return (
    <div className="contact-characters" data-scene={scene} data-phase={phase}>
      <span className="contact-character-ground" aria-hidden="true" />
      {characterOrder.map((name) => (
        <FormCharacter
          key={name}
          name={name}
          cue={cues[name]}
        />
      ))}
    </div>
  );
});
