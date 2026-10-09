type RollbackFailureCode =
  | "ROLLBACK_PREVIOUS_RELEASE_MISSING"
  | "ROLLBACK_IMAGE_REFERENCE_INVALID"
  | "ROLLBACK_IMAGE_REFERENCE_NOT_DIGEST"
  | "ROLLBACK_RUNTIME_CONFIG_INVALID"
  | "ROLLBACK_COMPOSE_INPUT_INVALID";

type PreviousReleaseInput = {
  image: unknown;
  runtimeEnvFile: unknown;
  runtimeEnvSha256: unknown;
};

type RollbackPlan =
  | { ok: false; code: RollbackFailureCode }
  | {
      ok: true;
      selectedRelease: {
        image: string;
        runtimeEnvFile: string;
        runtimeEnvSha256: string;
      };
      runtimeConfigVerification: { path: string; sha256: string };
      environment: {
        SHOUBAN_IMAGE: string;
        SHOUBAN_RUNTIME_ENV_FILE: string;
        SHOUBAN_PROXY_NETWORK: string;
      };
      composeArgs: string[];
      requiresHumanApproval: true;
    };

export function createRollbackPlan(options: {
  previousRelease?: PreviousReleaseInput | null;
  composeFile?: unknown;
  proxyNetwork?: unknown;
} | null): RollbackPlan;
