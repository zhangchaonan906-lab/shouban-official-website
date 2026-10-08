import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import * as curvedHeroScene from "../lib/curved-hero-scene";
import {
  cardOpacity,
  createCurvedHeroScene,
  createSceneDisposer,
  hasCardSource,
  normalizeGeometryUvs
} from "../lib/curved-hero-scene";

describe("curved hero scene resources", () => {
  it("disposes in LIFO order and aggregates failures without stopping cleanup", () => {
    const rendererError = new Error("renderer disposal failure");
    const materialError = new Error("material disposal failure");
    const disposalOrder: string[] = [];
    const dispose = createSceneDisposer([
      {
        dispose() {
          disposalOrder.push("renderer");
          throw rendererError;
        }
      },
      {
        dispose() {
          disposalOrder.push("geometry");
        }
      },
      {
        dispose() {
          disposalOrder.push("material");
          throw materialError;
        }
      },
      {
        dispose() {
          disposalOrder.push("texture");
        }
      }
    ]);
    let disposalError: unknown;

    try {
      dispose();
    } catch (error) {
      disposalError = error;
    }

    expect(disposalOrder).toEqual([
      "texture",
      "material",
      "geometry",
      "renderer"
    ]);
    expect(disposalError).toBeInstanceOf(AggregateError);
    expect((disposalError as AggregateError).errors).toEqual([
      materialError,
      rendererError
    ]);
  });

  it("disposes every registered resource exactly once, including late textures", () => {
    const disposeRenderer = vi.fn();
    const disposeFaceGeometry = vi.fn();
    const disposeOutlineGeometry = vi.fn();
    const disposeCardMaterials = Array.from({ length: 24 }, () => vi.fn());
    const disposeHorizonGeometry = vi.fn();
    const disposeHorizonMaterial = vi.fn();
    const resources = [
      { dispose: disposeRenderer },
      { dispose: disposeFaceGeometry },
      { dispose: disposeOutlineGeometry },
      ...disposeCardMaterials.map((dispose) => ({ dispose })),
      { dispose: disposeHorizonGeometry },
      { dispose: disposeHorizonMaterial }
    ];
    const dispose = createSceneDisposer(resources);
    const disposeLateTexture = vi.fn();

    resources.push({ dispose: disposeLateTexture });
    dispose();
    dispose();

    [
      disposeRenderer,
      disposeFaceGeometry,
      disposeOutlineGeometry,
      ...disposeCardMaterials,
      disposeHorizonGeometry,
      disposeHorizonMaterial,
      disposeLateTexture
    ].forEach((disposeResource) => {
      expect(disposeResource).toHaveBeenCalledTimes(1);
    });
  });

  it("rejects a non-eight-card scene before creating a WebGL renderer", () => {
    expect(() =>
      createCurvedHeroScene({
        canvas: {} as HTMLCanvasElement,
        cards: []
      })
    ).toThrow(/requires 8 cards/i);
  });

  it("continues disposing resources after one resource throws", () => {
    const sentinel = new Error("sentinel disposal failure");
    const disposeBad = vi.fn(() => {
      throw sentinel;
    });
    const disposeGood = vi.fn();
    const dispose = createSceneDisposer([
      { dispose: disposeBad },
      { dispose: disposeGood }
    ]);
    let firstError: unknown;

    try {
      dispose();
    } catch (error) {
      firstError = error;
    }

    const containsSentinel =
      firstError === sentinel ||
      (firstError instanceof AggregateError &&
        firstError.errors.includes(sentinel));
    expect(containsSentinel).toBe(true);
    expect(disposeBad).toHaveBeenCalledTimes(1);
    expect(disposeGood).toHaveBeenCalledTimes(1);
    expect(() => dispose()).not.toThrow();
    expect(disposeBad).toHaveBeenCalledTimes(1);
    expect(disposeGood).toHaveBeenCalledTimes(1);
  });
});

describe("curved hero scene geometry", () => {
  it("places a shallow pale-blue horizon near the lower edge of the card ring", () => {
    const horizon = (
      curvedHeroScene as typeof curvedHeroScene & {
        CURVED_HERO_HORIZON?: Readonly<{
          color: number;
          positionY: number;
          positionZ: number;
          scaleX: number;
          scaleY: number;
          scaleZ: number;
        }>;
      }
    ).CURVED_HERO_HORIZON;

    expect(horizon).toEqual({
      color: 0xf4f8ff,
      positionY: -4.55,
      positionZ: 5.55,
      scaleX: 1.45,
      scaleY: 0.45,
      scaleZ: 1
    });
  });

  it("normalizes shape UVs into the full zero-to-one texture range", () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        [-1.6, -1, 1.6, -1, 1.6, 1, -1.6, 1],
        2
      )
    );

    normalizeGeometryUvs(geometry);

    expect(Array.from(geometry.getAttribute("uv").array)).toEqual([
      0, 0, 1, 0, 1, 1, 0, 1
    ]);
  });

  it("does nothing when geometry has no UV attribute", () => {
    expect(() => normalizeGeometryUvs(new THREE.BufferGeometry())).not.toThrow();
  });
});

describe("curved hero scene card helpers", () => {
  it("accepts only non-blank card sources", () => {
    expect(hasCardSource(null)).toBe(false);
    expect(hasCardSource("")).toBe(false);
    expect(hasCardSource("   ")).toBe(false);
    expect(hasCardSource("/image.webp")).toBe(true);
  });

  it("keeps front, side, and back card opacity within its visual range", () => {
    const front = cardOpacity(0, 0);
    const side = cardOpacity(Math.PI / 2, 0);
    const back = cardOpacity(Math.PI, 0);

    expect(front).toBe(1);
    expect(back).toBeCloseTo(0.35);
    expect(side).toBeGreaterThan(0.35);
    expect(side).toBeLessThan(1);
    [front, side, back].forEach((opacity) => {
      expect(opacity).toBeGreaterThanOrEqual(0.35);
      expect(opacity).toBeLessThanOrEqual(1);
    });
  });
});
