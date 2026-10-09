import { posix } from "node:path";

const SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/i;
const IMAGE_REPOSITORY =
  /^(?:[a-z0-9]+(?:[.-][a-z0-9]+)*(?::[0-9]+)?\/)?[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)*$/;
const RUNTIME_CONFIG_DIGEST = /^[a-f0-9]{64}$/i;
const NETWORK_NAME = /^[a-z0-9][a-z0-9_.-]{0,62}$/i;

function isSafeAbsolutePath(value) {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    posix.isAbsolute(value) &&
    !value.split("/").includes("..") &&
    !/[\0\r\n]/.test(value)
  );
}

function isVersionedRuntimeConfigPath(value) {
  if (!isSafeAbsolutePath(value)) return false;

  const segments = value.split("/").filter(Boolean);
  const releasesIndex = segments.lastIndexOf("releases");
  if (releasesIndex < 0 || releasesIndex >= segments.length - 2) return false;

  const releaseId = segments[releasesIndex + 1];
  return /^(?:v?\d+(?:[._-][a-z0-9]+)*|[a-f0-9]{8,64})$/i.test(releaseId);
}

function validateImageReference(value) {
  if (typeof value !== "string" || value.trim() !== value) {
    return "ROLLBACK_IMAGE_REFERENCE_INVALID";
  }

  const separator = value.lastIndexOf("@");
  if (separator === -1) {
    return "ROLLBACK_IMAGE_REFERENCE_NOT_DIGEST";
  }

  if (separator !== value.indexOf("@")) {
    return "ROLLBACK_IMAGE_REFERENCE_INVALID";
  }

  const repository = value.slice(0, separator);
  const digest = value.slice(separator + 1);
  if (!SHA256_DIGEST.test(digest)) {
    return "ROLLBACK_IMAGE_REFERENCE_NOT_DIGEST";
  }

  if (!IMAGE_REPOSITORY.test(repository)) {
    return "ROLLBACK_IMAGE_REFERENCE_INVALID";
  }

  return null;
}

export function createRollbackPlan(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return { ok: false, code: "ROLLBACK_PREVIOUS_RELEASE_MISSING" };
  }

  const { previousRelease, composeFile, proxyNetwork } = options;
  if (!previousRelease || typeof previousRelease !== "object") {
    return { ok: false, code: "ROLLBACK_PREVIOUS_RELEASE_MISSING" };
  }

  const imageError = validateImageReference(previousRelease.image);
  if (imageError) return { ok: false, code: imageError };

  if (
    !isVersionedRuntimeConfigPath(previousRelease.runtimeEnvFile) ||
    !RUNTIME_CONFIG_DIGEST.test(previousRelease.runtimeEnvSha256 ?? "")
  ) {
    return { ok: false, code: "ROLLBACK_RUNTIME_CONFIG_INVALID" };
  }

  if (
    !isSafeAbsolutePath(composeFile) ||
    typeof proxyNetwork !== "string" ||
    !NETWORK_NAME.test(proxyNetwork)
  ) {
    return { ok: false, code: "ROLLBACK_COMPOSE_INPUT_INVALID" };
  }

  const selectedRelease = {
    image: previousRelease.image,
    runtimeEnvFile: previousRelease.runtimeEnvFile,
    runtimeEnvSha256: previousRelease.runtimeEnvSha256.toLowerCase()
  };

  return {
    ok: true,
    selectedRelease,
    runtimeConfigVerification: {
      path: selectedRelease.runtimeEnvFile,
      sha256: selectedRelease.runtimeEnvSha256
    },
    environment: {
      SHOUBAN_IMAGE: selectedRelease.image,
      SHOUBAN_RUNTIME_ENV_FILE: selectedRelease.runtimeEnvFile,
      SHOUBAN_PROXY_NETWORK: proxyNetwork
    },
    composeArgs: [
      "compose",
      "-f",
      composeFile,
      "up",
      "-d",
      "--no-build",
      "--no-deps",
      "website"
    ],
    requiresHumanApproval: true
  };
}
