import * as THREE from "three";
import type { CurvedHeroCard } from "../content/home";
import { curvedHeroViewport, slotAngle } from "./curved-hero";

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  cards: readonly CurvedHeroCard[];
};

export type SceneResource = {
  dispose(): void;
};

type CardEntry = {
  angle: number;
  surfaceMaterial: THREE.MeshStandardMaterial;
  outlineMaterial: THREE.LineBasicMaterial;
  shadowMaterial: THREE.MeshBasicMaterial;
};

export type CurvedHeroSceneController = {
  ready: Promise<void>;
  render(rotation: number, pointerX: number): void;
  resize(width: number, height: number, dpr: number): void;
  dispose(): void;
};

export const CURVED_HERO_HORIZON = Object.freeze({
  color: 0xf4f8ff,
  positionY: -4.55,
  positionZ: 5.55,
  scaleX: 1.45,
  scaleY: 0.45,
  scaleZ: 1
} as const);

export function createSceneDisposer(resources: readonly SceneResource[]) {
  let disposed = false;

  return () => {
    if (disposed) return;
    disposed = true;
    const errors: unknown[] = [];

    for (let index = resources.length - 1; index >= 0; index -= 1) {
      const resource = resources[index];
      try {
        resource?.dispose();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        "Failed to dispose curved hero scene resources."
      );
    }
  };
}

export function normalizeGeometryUvs(geometry: THREE.BufferGeometry) {
  const uv = geometry.getAttribute("uv");
  if (!uv || uv.count === 0) return;

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (let index = 0; index < uv.count; index += 1) {
    const u = uv.getX(index);
    const v = uv.getY(index);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }

  const rangeU = maxU - minU;
  const rangeV = maxV - minV;
  for (let index = 0; index < uv.count; index += 1) {
    const normalizedU = rangeU === 0 ? 0 : (uv.getX(index) - minU) / rangeU;
    const normalizedV = rangeV === 0 ? 0 : (uv.getY(index) - minV) / rangeV;
    uv.setXY(index, normalizedU, normalizedV);
  }
  uv.needsUpdate = true;
}

export function hasCardSource(src: string | null): src is string {
  return typeof src === "string" && src.trim().length > 0;
}

export function cardOpacity(angle: number, rotation: number) {
  const frontness = (Math.cos(angle + rotation) + 1) / 2;
  return THREE.MathUtils.lerp(0.35, 1, Math.pow(frontness, 0.7));
}

function createRoundedRectShape(width: number, height: number, radius: number) {
  const left = -width / 2;
  const right = width / 2;
  const bottom = -height / 2;
  const top = height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);

  return shape;
}

function safeDimension(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)));
}

export function createCurvedHeroScene({
  canvas,
  cards
}: SceneOptions): CurvedHeroSceneController {
  if (cards.length !== 8) {
    throw new Error(`Curved hero requires 8 cards, received ${cards.length}.`);
  }

  const horizonColor = new THREE.Color(CURVED_HERO_HORIZON.color);
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
  camera.position.set(0, 0.15, 8);
  camera.lookAt(0, -0.35, 0);

  const resources: SceneResource[] = [];
  const disposeResources = createSceneDisposer(resources);
  let sceneDisposed = false;

  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    resources.push(renderer);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(horizonColor, 0);

    const ring = new THREE.Group();
    ring.position.y = -0.65;
    ring.rotation.x = THREE.MathUtils.degToRad(-9);
    scene.add(ring);

    const cardShape = createRoundedRectShape(3.2, 2, 0.16);
    const faceGeometry = new THREE.ShapeGeometry(cardShape, 8);
    resources.push(faceGeometry);
    normalizeGeometryUvs(faceGeometry);
    const outlineGeometry = new THREE.EdgesGeometry(faceGeometry, 10);
    resources.push(outlineGeometry);

    const cardEntries: CardEntry[] = [];
    const radius = 4.3;
    const textureLoads: Promise<void>[] = [];
    const textureMaterialsBySource = new Map<
      string,
      THREE.MeshStandardMaterial[]
    >();

    cards.forEach((card, index) => {
      const angle = slotAngle(index);
      const surfaceMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        depthWrite: false,
        metalness: 0,
        roughness: 0.9,
        side: THREE.DoubleSide,
        transparent: true
      });
      resources.push(surfaceMaterial);
      const outlineMaterial = new THREE.LineBasicMaterial({
        color: 0xdedfd9,
        depthWrite: false,
        opacity: 0.58,
        transparent: true
      });
      resources.push(outlineMaterial);
      const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        depthWrite: false,
        opacity: 0.055,
        side: THREE.DoubleSide,
        transparent: true
      });
      resources.push(shadowMaterial);
      surfaceMaterial.forceSinglePass = true;
      shadowMaterial.forceSinglePass = true;

      const cardGroup = new THREE.Group();
      const shadow = new THREE.Mesh(faceGeometry, shadowMaterial);
      const surface = new THREE.Mesh(faceGeometry, surfaceMaterial);
      const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
      shadow.position.set(0.035, -0.055, -0.028);
      shadow.scale.setScalar(1.025);
      outline.position.z = 0.004;
      cardGroup.add(shadow, surface, outline);
      cardGroup.position.set(
        Math.sin(angle) * radius,
        0,
        Math.cos(angle) * radius
      );
      cardGroup.rotation.y = angle;
      ring.add(cardGroup);

      cardEntries.push({
        angle,
        surfaceMaterial,
        outlineMaterial,
        shadowMaterial
      });

      if (hasCardSource(card.src)) {
        const source = card.src.trim();
        const matchingMaterials = textureMaterialsBySource.get(source);

        if (matchingMaterials) matchingMaterials.push(surfaceMaterial);
        else textureMaterialsBySource.set(source, [surfaceMaterial]);
      }
    });

    if (textureMaterialsBySource.size > 0) {
      const textureLoader = new THREE.TextureLoader();

      textureMaterialsBySource.forEach((matchingMaterials, source) => {
        textureLoads.push(
          new Promise<void>((resolve, reject) => {
            textureLoader.load(
              source,
              (texture) => {
                if (sceneDisposed) {
                  texture.dispose();
                  resolve();
                  return;
                }

                resources.push(texture);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = Math.min(
                  renderer.capabilities.getMaxAnisotropy(),
                  8
                );
                matchingMaterials.forEach((material) => {
                  material.map = texture;
                  material.needsUpdate = true;
                });
                resolve();
              },
              undefined,
              reject
            );
          })
        );
      });
    }

    const ready = Promise.all(textureLoads).then(() => undefined);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(2.5, 4, 7);
    scene.add(keyLight);

    const horizonGeometry = new THREE.CircleGeometry(7, 96);
    resources.push(horizonGeometry);
    const horizonMaterial = new THREE.MeshBasicMaterial({ color: horizonColor });
    resources.push(horizonMaterial);
    const horizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
    horizon.position.set(
      0,
      CURVED_HERO_HORIZON.positionY,
      CURVED_HERO_HORIZON.positionZ
    );
    horizon.scale.set(
      CURVED_HERO_HORIZON.scaleX,
      CURVED_HERO_HORIZON.scaleY,
      CURVED_HERO_HORIZON.scaleZ
    );
    horizon.renderOrder = 10;
    scene.add(horizon);

    return {
      ready,

      render(rotation, pointerX) {
        if (sceneDisposed) return;

        ring.rotation.y = rotation;
        const clampedPointerX = THREE.MathUtils.clamp(pointerX, -1, 1);
        camera.position.x = THREE.MathUtils.lerp(
          camera.position.x,
          clampedPointerX * 0.14,
          0.08
        );
        camera.lookAt(0, -0.35, 0);

        for (const entry of cardEntries) {
          const opacity = cardOpacity(entry.angle, rotation);
          entry.surfaceMaterial.opacity = opacity;
          entry.outlineMaterial.opacity = opacity * 0.58;
          entry.shadowMaterial.opacity = opacity * 0.055;
        }

        renderer.render(scene, camera);
      },

      resize(width, height, dpr) {
        if (sceneDisposed) return;

        const safeWidth = safeDimension(width);
        const safeHeight = safeDimension(height);
        const safeDpr = Number.isFinite(dpr)
          ? THREE.MathUtils.clamp(dpr, 1, 1.5)
          : 1;
        const viewport = curvedHeroViewport(safeWidth);
        camera.aspect = safeWidth / safeHeight;
        camera.fov = viewport.cameraFov;
        camera.position.z = viewport.cameraZ;
        ring.scale.setScalar(viewport.ringScale);
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(safeDpr);
        renderer.setSize(safeWidth, safeHeight, false);
      },

      dispose() {
        if (sceneDisposed) return;
        sceneDisposed = true;
        disposeResources();
      }
    };
  } catch (error) {
    sceneDisposed = true;
    try {
      disposeResources();
    } catch {
      // Preserve the initialization error after attempting every cleanup.
    }
    throw error;
  }
}
