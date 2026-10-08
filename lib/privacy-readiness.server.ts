import "server-only";

import {
  createEvaluationTime,
  evaluateContactCollectionReadiness,
  type ContactCollectionReadiness
} from "./privacy-readiness.mjs";

export function getContactCollectionReadiness(): ContactCollectionReadiness {
  return evaluateContactCollectionReadiness(
    process.env,
    createEvaluationTime(new Date())
  );
}
