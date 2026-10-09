const IMMUTABLE_IMAGE_REFERENCE =
  /(?:@sha256:[a-f0-9]{64}|:[a-f0-9]{40,64})$/i;

export function createRollbackPlan({
  previousImage,
  composeFile,
  composeEnvFile
}) {
  if (
    typeof previousImage !== "string" ||
    !IMMUTABLE_IMAGE_REFERENCE.test(previousImage)
  ) {
    return { ok: false, code: "ROLLBACK_IMAGE_REFERENCE_NOT_IMMUTABLE" };
  }

  if (!composeFile || !composeEnvFile) {
    return { ok: false, code: "ROLLBACK_COMPOSE_INPUT_MISSING" };
  }

  return {
    ok: true,
    image: previousImage,
    composeArgs: [
      "compose",
      "--env-file",
      composeEnvFile,
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