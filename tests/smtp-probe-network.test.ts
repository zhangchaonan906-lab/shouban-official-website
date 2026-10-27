import { createServer, type Socket } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import nodemailer from "nodemailer";
import { describe, expect, it, vi } from "vitest";
import { CONTACT_MAIL_TIMEOUT_MS } from "../lib/mail-transport.mjs";
import { runSmtpProbe } from "../scripts/deployment/smtp-probe.mjs";

describe("SMTP probe network deadline", () => {
  it("terminates a real, continuously active loopback SMTP connection at the total deadline before authentication or delivery", async () => {
    const sockets = new Set<Socket>();
    const intervals = new Set<ReturnType<typeof setInterval>>();
    const commands: string[] = [];
    let sawEhlo = false;
    let connectedSocket: Socket | undefined;
    const server = createServer((socket) => {
      connectedSocket = socket;
      sockets.add(socket);
      socket.on("error", () => {});
      socket.once("close", () => sockets.delete(socket));
      socket.write("220 synthetic.test ESMTP\r\n");
      socket.on("data", (bytes) => {
        commands.push(bytes.toString("ascii"));
        if (!sawEhlo && /^EHLO /i.test(bytes.toString("ascii"))) {
          sawEhlo = true;
          // Keep the socket active without completing EHLO. SMTP authentication
          // and message delivery are impossible; the idle timeout cannot win.
          socket.write("250-synthetic.test\r\n");
          const interval = setInterval(() => socket.write("250-pending\r\n"), 500);
          intervals.add(interval);
          socket.once("close", () => {
            clearInterval(interval);
            intervals.delete(interval);
          });
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected a loopback listener");
    }

    const realCreateTransport = nodemailer.createTransport;
    // Only the endpoint is redirected to an ephemeral loopback test listener.
    // All connection handling, SMTP parsing, timeouts and TLS policy remain real.
    const createTransport = vi.spyOn(nodemailer, "createTransport").mockImplementation((options) => (
      realCreateTransport({
        ...(typeof options === "object" ? options : {}),
        host: "127.0.0.1",
        port: address.port
      })
    ));

    try {
      const startedAt = Date.now();
      const result = await runSmtpProbe(["--send", "--confirm", "synthetic-only"], {
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: "587",
        SMTP_USER: "synthetic-user",
        SMTP_PASS: "synthetic-secret",
        SMTP_FROM: "synthetic@example.test",
        CONTACT_TO_EMAIL: "synthetic-recipient@example.test"
      });
      const elapsed = Date.now() - startedAt;

      expect(result).toMatchObject({ exitCode: 1, code: "SMTP_PROBE_TIMEOUT" });
      expect(sawEhlo).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(CONTACT_MAIL_TIMEOUT_MS - 500);
      expect(elapsed).toBeLessThan(CONTACT_MAIL_TIMEOUT_MS + 5_000);
      const closedAt = Date.now();
      while ((!connectedSocket?.destroyed || sockets.size > 0) && Date.now() - closedAt < 1_000) {
        await delay(10);
      }
      expect(connectedSocket?.destroyed).toBe(true);
      expect(sockets.size).toBe(0);
      expect(commands.join("")).not.toMatch(/AUTH|MAIL FROM|RCPT TO|\bDATA\b/i);
      expect(JSON.stringify(result)).not.toContain("synthetic-secret");
    } finally {
      createTransport.mockRestore();
      for (const interval of intervals) clearInterval(interval);
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 25_000);
});
