// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PrivacyPage, * as privacyPageModule from "../app/privacy/page";
import {
  getContactCollectionReadiness
} from "../lib/privacy-readiness.server";
import type { EffectivePrivacyConfig } from "../lib/privacy-readiness.mjs";
import {
  CHILD_CONTACT_NOTICE,
  PUBLIC_PRIVACY_POLICY,
  SENSITIVE_MATERIAL_WARNING
} from "../lib/privacy-policy.mjs";
import { canonicalUrl } from "../lib/seo";
import * as privacyPolicyModule from "../lib/privacy-policy.mjs";

vi.mock("@/lib/privacy-readiness.server", () => ({
  getContactCollectionReadiness: vi.fn()
}));

const effectiveConfig: EffectivePrivacyConfig = {
  policyVersion: "1.0",
  effectiveDate: "2026-07-11",
  siteOrigin: "https://www.shouban.test",
  processorName: "北京首版认证有限公司",
  privacyContactEmail: "privacy@shouban.test",
  hosting: {
    providerName: "腾讯云",
    productName: "轻量应用服务器",
    location: "中国大陆北京"
  },
  mail: {
    smtpRelay: {
      providerName: "企业邮 SMTP Relay",
      location: "中国大陆上海"
    },
    contactMailbox: {
      providerName: "企业邮联系邮箱",
      location: "中国大陆北京"
    },
    rightsMailbox: {
      providerName: "企业邮权利邮箱",
      location: "中国大陆深圳"
    },
    deletionMethod: "从收件箱、已发送、回收站及受控备份中删除，并等待备份周期届满"
  },
  retention: {
    unconvertedInquiryDays: 180,
    applicationLogDays: 30,
    rightsRecordDays: 180
  },
  rightsResponseWorkingDays: 15,
  childAgeThreshold: 14,
  edgeOne: { enabled: false },
  privacyPolicySnapshotId: "a".repeat(64)
};

function mockDraftReadiness() {
  vi.mocked(getContactCollectionReadiness).mockReturnValue({
    ready: false,
    issues: [
      { code: "PRIVACY_CONFIG_MISSING", key: "SMTP_PASS" },
      { code: "PRIVACY_CONFIG_MISSING", key: "PRIVACY_CONTACT_EMAIL" }
    ]
  });
}

function mockEffectiveReadiness(config: EffectivePrivacyConfig = effectiveConfig) {
  vi.mocked(getContactCollectionReadiness).mockReturnValue({
    ready: true,
    publicConfig: config
  });
}

beforeEach(() => {
  vi.mocked(getContactCollectionReadiness).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("privacy page readiness states", () => {
  it("renders a structured, non-fabricated draft and draft robots metadata", () => {
    mockDraftReadiness();
    render(<PrivacyPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("隐私政策草案 / 尚未生效");
    expect(
      screen.getByText("在线联系表单当前未开放；应用层不读取、处理或转发表单正文。")
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain("不会接收或转发访客信息");
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(3);
    expect(document.body.textContent).not.toContain("privacy@shouban.test");
    expect(document.body.textContent).not.toContain("腾讯云");
    expect(document.body.textContent).not.toContain("2026-07-11");
    expect(document.body.textContent).not.toContain("SMTP_PASS");
    expect(document.body.textContent).not.toContain("PRIVACY_CONFIG_MISSING");

    const generateMetadata = Reflect.get(privacyPageModule, "generateMetadata");
    expect(generateMetadata).toBeTypeOf("function");
    const metadata = generateMetadata();
    expect(metadata.title).toBe("隐私政策草案");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(canonicalUrl("/privacy"));
    expect(metadata.openGraph?.url).toBe(canonicalUrl("/privacy"));
  });

  it("renders effective controller and actual deployed processor facts", () => {
    mockEffectiveReadiness();
    const { container } = render(<PrivacyPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "隐私政策" })).toBeTruthy();
    expect(screen.getByText("版本 1.0")).toBeTruthy();
    expect(container.querySelector('time[datetime="2026-07-11"]')).not.toBeNull();
    const email = screen.getByRole("link", { name: "privacy@shouban.test" });
    expect(email.getAttribute("href")).toBe("mailto:privacy@shouban.test");
    expect(email.classList.contains("privacy-policy__email")).toBe(true);

    for (const fact of [
      "腾讯云",
      "轻量应用服务器",
      "中国大陆北京",
      "企业邮 SMTP Relay",
      "中国大陆上海",
      "企业邮联系邮箱",
      "企业邮权利邮箱",
      "中国大陆深圳",
      effectiveConfig.mail.deletionMethod
    ]) {
      expect(document.body.textContent).toContain(fact);
    }
    expect(document.getElementById("technical-data")?.textContent).toContain(
      "EdgeOne 当前未启用",
    );

    const generateMetadata = Reflect.get(privacyPageModule, "generateMetadata");
    expect(generateMetadata).toBeTypeOf("function");
    const metadata = generateMetadata();
    expect(metadata.title).toBe("隐私政策");
    expect(metadata.robots).not.toEqual(expect.objectContaining({ index: false }));
    expect(metadata.alternates?.canonical).toBe(canonicalUrl("/privacy"));
    expect(metadata.openGraph?.url).toBe(canonicalUrl("/privacy"));
  });

  it("discloses enabled EdgeOne using its actual retention and storage facts", () => {
    mockEffectiveReadiness({
      ...effectiveConfig,
      edgeOne: {
        enabled: true,
        logRetentionDays: 7,
        logStorageLocation: "中国大陆华北"
      }
    });
    render(<PrivacyPage />);

    const technicalSection = document.getElementById("technical-data");
    expect(technicalSection).not.toBeNull();
    expect(technicalSection?.textContent).toContain("EdgeOne 安全日志保留 7 天");
    expect(technicalSection?.textContent).toContain("中国大陆华北");
    expect(technicalSection?.textContent).not.toContain("EdgeOne 安全日志保留 30 天");
    for (const category of [
      "IP 地址",
      "请求时间",
      "请求路径",
      "HTTP 状态",
      "User-Agent",
      "安全规则结果"
    ]) {
      expect(technicalSection?.textContent).toContain(category);
    }
  });
});

describe("effective privacy policy semantics", () => {
  beforeEach(() => {
    mockEffectiveReadiness();
  });

  it("renders a table of contents and exactly ten stable shared sections", () => {
    render(<PrivacyPage />);

    const tableOfContents = screen.getByRole("navigation", { name: "隐私政策目录" });
    const expectedSections = [
      "controller",
      "submitted-data",
      "technical-data",
      "processing-flow",
      "processors",
      "retention",
      "rights",
      "security",
      "sensitive-and-children",
      "updates"
    ];
    expect(within(tableOfContents).getAllByRole("link")).toHaveLength(10);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(10);
    expect(
      Reflect.get(privacyPolicyModule, "PRIVACY_POLICY_SECTIONS")?.map(
        (section: { id: string }) => section.id
      )
    ).toEqual(expectedSections);
    for (const id of expectedSections) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("uses five semantic columns for every submitted and technical data row", () => {
    render(<PrivacyPage />);

    const table = screen.getByRole("table", { name: "联系表单收集信息说明" });
    expect(
      within(table).getAllByRole("columnheader").map((header) => header.textContent)
    ).toEqual(["信息类别", "填写要求", "处理目的", "处理方式", "保存期限"]);
    expect(table.querySelectorAll('th[scope="col"]')).toHaveLength(5);
    expect(table.querySelectorAll('th[scope="row"]')).toHaveLength(9);
    expect(table.textContent).toContain("手机号或邮箱");
    expect(table.textContent).toContain("至少填写一项");
    expect(table.textContent).toContain("回复本次询问");
    expect(table.textContent).toContain("请求ID及安全访问数据");
    expect(table.textContent).toContain("自动产生");
    expect(table.textContent).toContain("同源 API 校验");
    expect(table.textContent).toContain("未转化咨询 180 天");
    expect(table.textContent).toContain("轻量应用服务器/反向代理访问日志 30 天");
  });

  it("distinguishes application logs from the configured hosting product and reverse proxy", () => {
    render(<PrivacyPage />);

    const technical = document.getElementById("technical-data")?.textContent ?? "";
    expect(technical).toMatch(/应用日志.*requestId.*结果码.*状态.*耗时.*保留 30 天/s);
    expect(technical).toMatch(/轻量应用服务器\/反向代理访问日志.*保留 30 天/s);
    expect(technical).toMatch(/不包含表单字段.*原始 SMTP/s);
    for (const category of [
      "IP 地址",
      "请求时间",
      "请求路径",
      "HTTP 状态",
      "User-Agent",
      "安全规则结果"
    ]) {
      expect(technical).toContain(category);
    }
    expect(technical).not.toContain("Lighthouse");
  });

  it("defines inquiry and formal-record retention with deletion exceptions", () => {
    render(<PrivacyPage />);

    const retention = document.getElementById("retention")?.textContent ?? "";
    expect(retention).toMatch(/未转化.*咨询.*180 天/s);
    expect(retention).toMatch(/转为正式业务记录.*合同.*法定义务.*留存/s);
    expect(retention).toContain(effectiveConfig.mail.deletionMethod);
    expect(retention).toContain("备份周期届满");
    expect(retention).toMatch(/法律义务.*争议处理.*删除例外/s);
  });

  it("starts the response clock after identity verification and commits to eleven rights", () => {
    render(<PrivacyPage />);

    const rights = document.getElementById("rights");
    expect(rights).not.toBeNull();
    expect(rights?.textContent).toMatch(/身份核验完成后起算.*15 个工作日/s);
    expect(rights?.querySelectorAll("li")).toHaveLength(11);
    for (const right of PUBLIC_PRIVACY_POLICY.rightsCommitments) {
      expect(rights?.textContent).toContain(right);
    }
  });

  it("states MFA alongside the existing security safeguards", () => {
    render(<PrivacyPage />);

    const security = document.getElementById("security")?.textContent ?? "";
    expect(security).toMatch(/最小权限.*TLS.*不记录表单字段/s);
    expect(security).toContain("多因素认证（MFA）");
  });

  it("discloses processing flow, sensitive data and child rules", () => {
    render(<PrivacyPage />);

    expect(document.getElementById("processing-flow")?.textContent).toMatch(/浏览器内存.*API.*纯文本邮件.*授权人员/s);

    expect(screen.getByText(SENSITIVE_MATERIAL_WARNING)).toBeTruthy();
    expect(screen.getByText(CHILD_CONTACT_NOTICE)).toBeTruthy();
    expect(
      document.getElementById("sensitive-and-children")?.textContent
    ).toContain(
      "如果发现通过本表单提交了14周岁以下未成年人的个人信息，我们将在核验后删除，法律法规另有保存义务的除外。"
    );
  });

  it("publishes update notice and re-consent triggers from the shared contract", () => {
    render(<PrivacyPage />);

    const updates = document.getElementById("updates")?.textContent ?? "";
    expect(updates).toMatch(/版本.*生效日期.*通知/s);
    expect(updates).toMatch(/处理目的.*处理方式.*信息类别/s);
    expect(updates).toMatch(/实质变化前.*重新告知.*取得同意/s);
  });

  it("remains a server component and defines focused responsive and print styles", () => {
    const componentPath = join(process.cwd(), "components", "privacy", "PrivacyPolicy.tsx");
    expect(existsSync(componentPath)).toBe(true);
    const componentSource = readFileSync(componentPath, "utf8");
    const pageSource = readFileSync(join(process.cwd(), "app", "privacy", "page.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(componentSource).not.toMatch(/^\s*["']use client["']/m);
    expect(pageSource).not.toMatch(/^\s*["']use client["']/m);
    expect(css).toMatch(/\.privacy-policy__table-region\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto/s);
    expect(css).toMatch(/\.privacy-policy__email[^}]*\{[^}]*overflow-wrap:\s*anywhere/s);
    expect(css).toMatch(/@media print[\s\S]*\.privacy-policy__table-region\s*\{[^}]*overflow:\s*visible/s);
    expect(css).toMatch(/@media print[\s\S]*\.privacy-policy__table\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/@media print[\s\S]*\.privacy-policy__email\[href\]::after\s*\{[^}]*attr\(href\)/s);
    expect(css).toMatch(/@media print[\s\S]*\.privacy-page \[aria-hidden="true"\][^{]*\{[^}]*display:\s*none/s);
  });
});
