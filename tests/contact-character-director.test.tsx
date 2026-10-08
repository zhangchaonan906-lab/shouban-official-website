// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedFormCharacters } from "../components/contact/animated-form-characters";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function getCharacter(name: string) {
  const character = document.querySelector(`#contact-character-${name}`);
  expect(character).toBeTruthy();
  return character as HTMLElement;
}

describe("contact character behavior director", () => {
  it("moves a name interaction through notice, act, and hold", () => {
    render(
      <AnimatedFormCharacters
        state="focused"
        activeField="name"
        reducedMotion={false}
      />
    );

    const group = document.querySelector(".contact-characters");
    expect(group?.getAttribute("data-scene")).toBe("name");
    expect(group?.getAttribute("data-phase")).toBe("notice");
    expect(getCharacter("purple").getAttribute("data-cue")).toBe("lean-in");
    expect(getCharacter("black").getAttribute("data-cue")).toBe("peek");

    act(() => vi.advanceTimersByTime(170));
    expect(group?.getAttribute("data-phase")).toBe("act");

    act(() => vi.advanceTimersByTime(300));
    expect(group?.getAttribute("data-phase")).toBe("hold");
  });

  it("jumps to the final privacy pose when reduced motion is requested", () => {
    render(
      <AnimatedFormCharacters
        state="privacy"
        activeField="email"
        reducedMotion
      />
    );

    const group = document.querySelector(".contact-characters");
    expect(group?.getAttribute("data-scene")).toBe("privacy");
    expect(group?.getAttribute("data-phase")).toBe("hold");
    expect(getCharacter("purple").getAttribute("data-cue")).toBe("guard");
    expect(getCharacter("black").getAttribute("data-cue")).toBe("close-eyes");
    expect(getCharacter("orange").getAttribute("data-cue")).toBe("close-eyes");
    expect(getCharacter("yellow").getAttribute("data-cue")).toBe("avert");
  });

  it("lets one idle character look before the other responds", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(
      <AnimatedFormCharacters
        state="idle"
        activeField={null}
        reducedMotion={false}
      />
    );

    act(() => vi.advanceTimersByTime(4800));
    expect(getCharacter("purple").getAttribute("data-cue")).toBe("glance-right");
    expect(getCharacter("black").getAttribute("data-cue")).toBe("rest");

    act(() => vi.advanceTimersByTime(140));
    expect(getCharacter("purple").getAttribute("data-cue")).toBe("glance-right");
    expect(getCharacter("black").getAttribute("data-cue")).toBe("glance-left");
  });
});
