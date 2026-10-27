export const SMTP_PROBE_USAGE: string;

type ProbeEmail = { subject: string; text: string };
type ProbeEnvironment = Record<string, string | undefined>;
type ProbeResult = {
  exitCode: number;
  code: string;
  probeId?: string;
};

export function runSmtpProbe(
  args?: string[],
  env?: ProbeEnvironment,
  sender?: (email: ProbeEmail, env: ProbeEnvironment) => Promise<void>
): Promise<ProbeResult>;
