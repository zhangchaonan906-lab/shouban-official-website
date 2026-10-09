type RollbackPlan =
  | { ok: false; code: "ROLLBACK_IMAGE_REFERENCE_NOT_IMMUTABLE" | "ROLLBACK_COMPOSE_INPUT_MISSING" }
  | {
      ok: true;
      image: string;
      composeArgs: string[];
      requiresHumanApproval: true;
    };

export function createRollbackPlan(options: {
  previousImage: unknown;
  composeFile: string;
  composeEnvFile: string;
}): RollbackPlan;
