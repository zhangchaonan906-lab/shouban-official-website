import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { CurvedHeroCard } from "../content/home";

type DisposableSpy = {
  dispose: Mock<() => void>;
};

type RendererSpy = DisposableSpy & {
  forceContextLoss: Mock<() => void>;
};

const initializationFakes = vi.hoisted(() => ({
  renderers: [] as RendererSpy[],
  rendererOptions: [] as Array<{ alpha?: boolean }>,
  clearAlphas: [] as number[],
  scenes: [] as Array<{ background: unknown }>,
  geometries: [] as DisposableSpy[],
  materials: [] as DisposableSpy[],
  standardMaterials: [] as Array<InstanceType<typeof import("three").MeshStandardMaterial>>,
  basicMaterials: [] as Array<{
    color: { getHex: () => number };
    opacity: number;
    transparent: boolean;
  }>,
  textures: [] as DisposableSpy[],
  textureLoads: [] as string[],
  textureLoadResolvers: [] as Array<() => void>,
  textureLoadRejectors: [] as Array<(error: unknown) => void>,
  deferTextureLoads: false,
  meshCount: 0,
  failMeshAt: Number.POSITIVE_INFINITY,
  failSetClearColor: false,
  sentinel: new Error("injected curved hero initialization failure")
}));

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();

  class TestWebGLRenderer {
    outputColorSpace = actual.SRGBColorSpace;
    capabilities = { getMaxAnisotropy: () => 16 };
    dispose = vi.fn<() => void>();
    forceContextLoss = vi.fn<() => void>();

    constructor(options: { alpha?: boolean } = {}) {
      initializationFakes.renderers.push(this);
      initializationFakes.rendererOptions.push(options);
    }

    setClearColor(_color: unknown, alpha = 1) {
      initializationFakes.clearAlphas.push(alpha);
      if (initializationFakes.failSetClearColor) {
        throw initializationFakes.sentinel;
      }
    }

    render() {}
    setPixelRatio() {}
    setSize() {}
  }

  class TestScene extends actual.Scene {
    constructor(...args: ConstructorParameters<typeof actual.Scene>) {
      super(...args);
      initializationFakes.scenes.push(this);
    }
  }

  class TestShapeGeometry extends actual.ShapeGeometry {
    override dispose = vi.fn<() => void>();

    constructor(...args: ConstructorParameters<typeof actual.ShapeGeometry>) {
      super(...args);
      initializationFakes.geometries.push(this);
    }
  }

  class TestEdgesGeometry extends actual.EdgesGeometry {
    override dispose = vi.fn<() => void>();

    constructor(...args: ConstructorParameters<typeof actual.EdgesGeometry>) {
      super(...args);
      initializationFakes.geometries.push(this);
    }
  }

  class TestCircleGeometry extends actual.CircleGeometry {
    override dispose = vi.fn<() => void>();

    constructor(...args: ConstructorParameters<typeof actual.CircleGeometry>) {
      super(...args);
      initializationFakes.geometries.push(this);
    }
  }

  class TestMeshStandardMaterial extends actual.MeshStandardMaterial {
    override dispose = vi.fn<() => void>();

    constructor(
      ...args: ConstructorParameters<typeof actual.MeshStandardMaterial>
    ) {
      super(...args);
      initializationFakes.materials.push(this);
      initializationFakes.standardMaterials.push(this);
    }
  }

  class TestLineBasicMaterial extends actual.LineBasicMaterial {
    override dispose = vi.fn<() => void>();

    constructor(...args: ConstructorParameters<typeof actual.LineBasicMaterial>) {
      super(...args);
      initializationFakes.materials.push(this);
    }
  }

  class TestMeshBasicMaterial extends actual.MeshBasicMaterial {
    override dispose = vi.fn<() => void>();

    constructor(...args: ConstructorParameters<typeof actual.MeshBasicMaterial>) {
      super(...args);
      initializationFakes.materials.push(this);
      initializationFakes.basicMaterials.push(this);
    }
  }

  class TestTextureLoader {
    load(
      url: string,
      onLoad: (texture: InstanceType<typeof actual.Texture>) => void,
      _onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void
    ) {
      initializationFakes.textureLoads.push(url);
      const texture = new actual.Texture() as InstanceType<
        typeof actual.Texture
      > &
        DisposableSpy;
      texture.dispose = vi.fn<() => void>();
      initializationFakes.textures.push(texture);
      if (initializationFakes.deferTextureLoads) {
        initializationFakes.textureLoadResolvers.push(() => onLoad(texture));
        initializationFakes.textureLoadRejectors.push((error) => onError?.(error));
      } else {
        onLoad(texture);
      }
      return texture;
    }
  }

  class FaultInjectedMesh extends actual.Mesh {
    constructor(...args: ConstructorParameters<typeof actual.Mesh>) {
      super(...args);
      initializationFakes.meshCount += 1;
      if (initializationFakes.meshCount === initializationFakes.failMeshAt) {
        throw initializationFakes.sentinel;
      }
    }
  }

  return {
    ...actual,
    Scene: TestScene,
    WebGLRenderer: TestWebGLRenderer,
    ShapeGeometry: TestShapeGeometry,
    EdgesGeometry: TestEdgesGeometry,
    CircleGeometry: TestCircleGeometry,
    MeshStandardMaterial: TestMeshStandardMaterial,
    LineBasicMaterial: TestLineBasicMaterial,
    MeshBasicMaterial: TestMeshBasicMaterial,
    TextureLoader: TestTextureLoader,
    Mesh: FaultInjectedMesh
  };
});

import { createCurvedHeroScene } from "../lib/curved-hero-scene";

const cards = Array.from({ length: 8 }, (_, index) => ({
  id: `initialization-card-${index + 1}`,
  src: index === 0 ? "/card.webp" : null,
  alt: "",
  href: null,
  aspect: 1.6 as const
})) satisfies readonly CurvedHeroCard[];

const repeatedPhotoCards = Array.from({ length: 8 }, (_, index) => ({
  id: `photo-card-${index + 1}`,
  src: index % 2 === 0 ? "/campus.webp" : "/bpc.webp",
  alt: "",
  href: null,
  aspect: 1.6 as const
})) satisfies readonly CurvedHeroCard[];

function createScene() {
  return createCurvedHeroScene({
    canvas: {} as HTMLCanvasElement,
    cards
  });
}

function createPhotoScene() {
  return createCurvedHeroScene({
    canvas: {} as HTMLCanvasElement,
    cards: repeatedPhotoCards
  });
}

function expectDisposedOnce(resources: readonly DisposableSpy[]) {
  resources.forEach((resource) => {
    expect(resource.dispose).toHaveBeenCalledTimes(1);
  });
}

describe("curved hero scene initialization cleanup", () => {
  beforeEach(() => {
    initializationFakes.renderers.length = 0;
    initializationFakes.rendererOptions.length = 0;
    initializationFakes.clearAlphas.length = 0;
    initializationFakes.scenes.length = 0;
    initializationFakes.geometries.length = 0;
    initializationFakes.materials.length = 0;
    initializationFakes.standardMaterials.length = 0;
    initializationFakes.basicMaterials.length = 0;
    initializationFakes.textures.length = 0;
    initializationFakes.textureLoads.length = 0;
    initializationFakes.textureLoadResolvers.length = 0;
    initializationFakes.textureLoadRejectors.length = 0;
    initializationFakes.deferTextureLoads = false;
    initializationFakes.meshCount = 0;
    initializationFakes.failMeshAt = Number.POSITIVE_INFINITY;
    initializationFakes.failSetClearColor = false;
  });

  it("keeps the CSS light field visible behind the pale-blue WebGL horizon", () => {
    const controller = createScene();

    expect(initializationFakes.rendererOptions).toHaveLength(1);
    expect(initializationFakes.rendererOptions[0]).toMatchObject({ alpha: true });
    expect(initializationFakes.clearAlphas).toEqual([0]);
    expect(initializationFakes.scenes).toHaveLength(1);
    expect(initializationFakes.scenes[0]?.background).toBeNull();
    expect(initializationFakes.basicMaterials.at(-1)?.color.getHex()).toBe(
      0xf4f8ff
    );
    expect(initializationFakes.basicMaterials.at(-1)?.transparent).toBe(false);
    expect(initializationFakes.basicMaterials.at(-1)?.opacity).toBe(1);

    controller.dispose();
  });

  it("releases the renderer when its post-construction configuration throws", () => {
    initializationFakes.failSetClearColor = true;

    expect(createScene).toThrow(initializationFakes.sentinel);

    expect(initializationFakes.renderers).toHaveLength(1);
    expectDisposedOnce(initializationFakes.renderers);
    expect(initializationFakes.renderers[0]?.forceContextLoss).not.toHaveBeenCalled();
  });

  it("releases all registered GPU resources when later scene assembly throws", () => {
    // Eight cards create two meshes each; the next mesh is the foreground horizon.
    initializationFakes.failMeshAt = 17;

    expect(createScene).toThrow(initializationFakes.sentinel);

    expect(initializationFakes.renderers).toHaveLength(1);
    expect(initializationFakes.geometries).toHaveLength(3);
    expect(initializationFakes.materials).toHaveLength(25);
    expect(initializationFakes.textures).toHaveLength(1);
    expectDisposedOnce(initializationFakes.renderers);
    expectDisposedOnce(initializationFakes.geometries);
    expectDisposedOnce(initializationFakes.materials);
    expectDisposedOnce(initializationFakes.textures);
    expect(initializationFakes.renderers[0]?.forceContextLoss).not.toHaveBeenCalled();
  });

  it("disposes a completed scene without forcing WebGL context loss", () => {
    const controller = createScene();

    controller.dispose();
    controller.dispose();

    expect(initializationFakes.renderers).toHaveLength(1);
    expectDisposedOnce(initializationFakes.renderers);
    expect(initializationFakes.renderers[0]?.forceContextLoss).not.toHaveBeenCalled();
  });

  it("loads each repeated photo once and shares it across matching card materials", () => {
    const controller = createPhotoScene();

    expect(initializationFakes.textureLoads).toEqual([
      "/campus.webp",
      "/bpc.webp"
    ]);
    expect(initializationFakes.textures).toHaveLength(2);
    expect(initializationFakes.standardMaterials).toHaveLength(8);
    initializationFakes.standardMaterials.forEach((material, index) => {
      expect(material.map).toBe(initializationFakes.textures[index % 2]);
      expect(material.version).toBeGreaterThan(0);
    });

    controller.dispose();
    expectDisposedOnce(initializationFakes.textures);
  });

  it("keeps scene readiness pending until every unique texture has loaded", async () => {
    initializationFakes.deferTextureLoads = true;
    const controller = createPhotoScene();
    const ready = (
      controller as typeof controller & { ready?: Promise<void> }
    ).ready;

    expect(ready).toBeInstanceOf(Promise);
    if (ready === undefined) return;

    let settled = false;
    void ready.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(initializationFakes.textureLoadResolvers).toHaveLength(2);

    initializationFakes.textureLoadResolvers[0]?.();
    await Promise.resolve();
    expect(settled).toBe(false);

    initializationFakes.textureLoadResolvers[1]?.();
    await ready;
    expect(settled).toBe(true);
    controller.dispose();
  });

  it("rejects scene readiness when a required texture fails", async () => {
    initializationFakes.deferTextureLoads = true;
    const controller = createPhotoScene();
    const ready = (
      controller as typeof controller & { ready?: Promise<void> }
    ).ready;

    expect(ready).toBeInstanceOf(Promise);
    if (ready === undefined) return;

    initializationFakes.textureLoadRejectors[0]?.(
      initializationFakes.sentinel
    );
    await expect(ready).rejects.toBe(initializationFakes.sentinel);
    controller.dispose();
  });
});
