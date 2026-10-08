import { memo } from "react";

type CharacterEyeProps = {
  outlined: boolean;
};

export const CharacterEye = memo(function CharacterEye({ outlined }: CharacterEyeProps) {
  return (
    <span className={outlined ? "contact-eye contact-eye--outlined" : "contact-eye contact-eye--dot"}>
      <span className="contact-eye-pupil" />
    </span>
  );
});
