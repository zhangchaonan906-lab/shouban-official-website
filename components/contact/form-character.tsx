import { memo } from "react";
import { CharacterEye } from "@/components/contact/character-eye";
import type {
  CharacterCue,
  CharacterName
} from "@/components/contact/character-behavior";

export type GlanceDirection = "left" | "right";
export type { CharacterName } from "@/components/contact/character-behavior";

type FormCharacterProps = {
  name: CharacterName;
  cue: CharacterCue;
};

const outlinedEyeCharacters = new Set<CharacterName>(["purple", "black"]);

export const FormCharacter = memo(function FormCharacter({
  name,
  cue
}: FormCharacterProps) {
  const outlinedEyes = outlinedEyeCharacters.has(name);
  const blink = cue === "blink";
  const glanceDirection: GlanceDirection | null = cue === "glance-left"
    ? "left"
    : cue === "glance-right"
      ? "right"
      : null;
  const faceClassName = [
    "contact-character-face",
    blink ? "contact-character-face--blinking" : "",
    glanceDirection ? `contact-character-face--glance-${glanceDirection}` : ""
  ].filter(Boolean).join(" ");

  return (
    <div
      id={`contact-character-${name}`}
      className={`contact-character contact-character--${name}`}
      data-cue={cue}
    >
      <div className="contact-character-breath">
        <div className={`contact-character-body contact-character-body--${name}`}>
          <div id={`contact-face-${name}`} className={faceClassName} data-character={name}>
            <div className="contact-face-eyes">
              <CharacterEye outlined={outlinedEyes} />
              <CharacterEye outlined={outlinedEyes} />
            </div>

            <span className="contact-face--privacy" aria-hidden="true">
              <i />
              <i />
            </span>

            {name === "yellow" ? <span className="contact-mouth contact-mouth--neutral" /> : null}
            <span className="contact-mouth contact-mouth--worried" />
            <span className="contact-mouth contact-mouth--happy" />
          </div>
        </div>
      </div>
    </div>
  );
});
