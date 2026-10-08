async function main() {
  try {
    const {
      createEvaluationTime,
      evaluateContactCollectionReadiness
    } = await import(new URL("../lib/privacy-readiness.mjs", import.meta.url));
    const result = evaluateContactCollectionReadiness(
      process.env,
      createEvaluationTime(new Date())
    );

    if (result.ready) {
      process.stdout.write("privacy release check passed\n");
    } else {
      for (const issue of result.issues) {
        process.stderr.write(`${issue.code} ${issue.key}\n`);
      }
      process.exitCode = 1;
    }
  } catch {
    process.stderr.write("PRIVACY_RELEASE_CHECK_INTERNAL_ERROR INTERNAL\n");
    process.exitCode = 2;
  }
}

await main();
