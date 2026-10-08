async function main() {
  try {
    const {
      createEvaluationTime,
      evaluatePrivacyPublicConfig
    } = await import(new URL("../lib/privacy-readiness.mjs", import.meta.url));
    const result = evaluatePrivacyPublicConfig(
      process.env,
      createEvaluationTime(new Date())
    );

    if (result.ok) {
      process.stdout.write(`${result.publicConfig.privacyPolicySnapshotId}\n`);
    } else {
      for (const issue of result.issues) {
        process.stderr.write(`${issue.code} ${issue.key}\n`);
      }
      process.exitCode = 1;
    }
  } catch {
    process.stderr.write("PRIVACY_SNAPSHOT_INTERNAL_ERROR INTERNAL\n");
    process.exitCode = 2;
  }
}

await main();
