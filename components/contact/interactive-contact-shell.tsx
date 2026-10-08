"use client";

import {
  type FormEventHandler,
  type MutableRefObject,
  type PointerEventHandler,
  type ReactNode
} from "react";
import { AnimatedFormCharacters } from "@/components/contact/animated-form-characters";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import type {
  CharacterState,
  ContactFieldName
} from "@/components/contact/character-behavior";

type InteractiveContactShellProps = {
  shellRef: MutableRefObject<HTMLFormElement | null>;
  state: CharacterState;
  activeField: ContactFieldName | null;
  reducedMotion: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onPointerEnter: PointerEventHandler<HTMLFormElement>;
  onPointerMove: PointerEventHandler<HTMLFormElement>;
  onPointerLeave: PointerEventHandler<HTMLFormElement>;
  onPointerDownCapture: PointerEventHandler<HTMLFormElement>;
  children: ReactNode;
};

export function InteractiveContactShell({
  shellRef,
  state,
  activeField,
  reducedMotion,
  onSubmit,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDownCapture,
  children
}: InteractiveContactShellProps) {
  return (
    <form
      ref={shellRef}
      noValidate
      onSubmit={onSubmit}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDownCapture={onPointerDownCapture}
      className={`contact-interactive-shell ${surfaceStyles.elevated}`}
      data-fluent-surface="elevated"
      data-state={state}
      data-reduced-motion={reducedMotion ? "true" : undefined}
    >
      <section className="contact-character-stage" data-state={state} aria-hidden="true">
        <AnimatedFormCharacters
          state={state}
          activeField={activeField}
          reducedMotion={reducedMotion}
        />
      </section>
      <section className="contact-form-panel" aria-labelledby="contact-title">
        {children}
      </section>
    </form>
  );
}
