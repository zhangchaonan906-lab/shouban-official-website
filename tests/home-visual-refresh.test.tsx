// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../app/page";
import { CTASection } from "../components/common/CTASection";
import { HomeAiprCapabilities } from "../components/home/HomeAiprCapabilities";
import { HomePositioning } from "../components/home/HomePositioning";
import { HomeProcess } from "../components/home/HomeProcess";
import { HomeResearch } from "../components/home/HomeResearch";
import { HomeServiceGrid } from "../components/home/HomeServiceGrid";
import { aiprModules, aiprPositioning } from "../content/aipr";
import { customerScenarios, serviceFlow } from "../content/company";
import { parentCompanyQualifications } from "../content/qualifications";
import { services } from "../content/services";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const expectedQualifications = [
  {
    title: "国家高新技术企业",
    reference: "GR202311001132",
    dateLabel: "2023年10月26日发证 · 有效期三年"
  },
  {
    title: "中关村高新技术企业",
    reference: "20252080455501",
    dateLabel: "2025年8月22日发证 · 有效期三年"
  },
  {
    title: "ICP/EDI 增值电信业务经营许可",
    reference: "京B2-20223420",
    dateLabel: "有效至2027年9月16日"
  },
  {
    title: "全国 SP 增值电信业务经营许可",
    reference: "B2-20223716",
    dateLabel: "有效至2027年8月23日"
  },
  {
    title: "北京市版权局同意设立版权工作站",
    reference: "京权发〔2022〕1号",
    dateLabel: "2022年3月8日"
  },
  {
    title: "媒体融合创新技术与服务应用优秀推荐项目",
    reference: "数字图文智能版权资产管理服务平台",
    dateLabel: "北京市广播电视局 · 2023年6月"
  }
] as const;

function getActiveQualificationTitle(carousel: HTMLElement) {
  const activeCard = carousel.querySelector<HTMLButtonElement>(
    '[data-qualification-active="true"]'
  );

  if (!activeCard) {
    throw new Error("The qualification carousel must expose one active card.");
  }

  const label = activeCard.getAttribute("aria-label") ?? "";

  return expectedQualifications.find(({ title }) => label.includes(title))
    ?.title;
}

describe("homepage visual refresh", () => {
  it("presents the verified parent-company qualifications as image-only cards", () => {
    const { container } = render(<HomeResearch />);

    const qualificationHeading = screen.getByRole("heading", {
      level: 2,
      name: "母公司资质与行业认可"
    });
    const qualificationSection = qualificationHeading.closest("section");

    if (!qualificationSection) {
      throw new Error("The parent-company qualification heading must belong to a section.");
    }

    expect(
      within(qualificationSection).queryByText(
        "北京首版认证有限公司的母公司北京首版科技有限公司持有相关资质与行业认可。"
      )
    ).toBeNull();
    expect(parentCompanyQualifications).toHaveLength(6);
    expect(parentCompanyQualifications).toHaveLength(expectedQualifications.length);

    const carousel = within(qualificationSection).getByRole("region", {
      name: "母公司资质证照展示"
    });
    const certificateButtons = within(carousel).getAllByRole("button", {
      name: /查看.+证照/
    });

    expect(carousel.getAttribute("data-qualification-carousel")).toBe("true");
    expect(certificateButtons).toHaveLength(5);
    expect(
      certificateButtons.filter(
        (button) => button.getAttribute("data-qualification-active") === "true"
      )
    ).toHaveLength(1);
    expect(
      carousel.querySelector("[data-qualification-detail]")
    ).toBeNull();

    expectedQualifications.forEach((expectedQualification, index) => {
      expect(parentCompanyQualifications[index]).toMatchObject({
        ...expectedQualification,
        holder: "北京首版科技有限公司"
      });
    });

    [
      "北京首版科技有限公司国家高新技术企业证书",
      "北京首版科技有限公司中关村高新技术企业证书",
      "北京首版科技有限公司ICP/EDI增值电信业务经营许可证",
      "北京首版科技有限公司全国SP增值电信业务经营许可证",
      "北京市版权局同意北京首版科技有限公司设立版权工作站通知"
    ].forEach((alt) => {
      expect(within(carousel).getByAltText(alt)).not.toBeNull();
    });

    expect(
      container.querySelector("[data-qualification-supporting-recognition]")
    ).toBeNull();

    const qualificationText = qualificationSection.textContent ?? "";

    expect(qualificationText).not.toContain("元宇宙创新发展工作委员会");
    expect(qualificationText).not.toContain("游戏出版工作委员会理事单位");
  });

  it("moves the focused qualification into the center with keyboard, click and autoplay", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );

    render(<HomeResearch />);

    const carousel = screen.getByRole("region", {
      name: "母公司资质证照展示"
    });
    const getActiveTitle = () => getActiveQualificationTitle(carousel);

    expect(getActiveTitle()).toBe(expectedQualifications[0].title);

    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(getActiveTitle()).toBe(expectedQualifications[1].title);

    fireEvent.click(
      within(carousel).getByRole("button", {
        name: "查看 ICP/EDI 增值电信业务经营许可 证照"
      })
    );
    expect(getActiveTitle()).toBe(expectedQualifications[2].title);

    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(getActiveTitle()).toBe(expectedQualifications[3].title);
  });

  it("keeps the qualification carousel static when reduced motion is requested", () => {
    vi.useFakeTimers();
    render(<HomeResearch />);

    const carousel = screen.getByRole("region", {
      name: "母公司资质证照展示"
    });
    act(() => {
      vi.advanceTimersByTime(5600);
    });

    expect(getActiveQualificationTitle(carousel)).toBe(
      expectedQualifications[0].title
    );
  });

  it("follows a horizontal pointer drag and advances after crossing the threshold", () => {
    render(<HomeResearch />);

    const carousel = screen.getByRole("region", {
      name: "母公司资质证照展示"
    });
    const track = carousel.querySelector<HTMLElement>(
      "[data-qualification-track]"
    );

    if (!track) {
      throw new Error("The qualification carousel must expose a draggable track.");
    }

    fireEvent.pointerDown(track, {
      pointerId: 1,
      button: 0,
      isPrimary: true,
      clientX: 260
    });
    fireEvent.pointerMove(track, {
      pointerId: 1,
      isPrimary: true,
      clientX: 160
    });

    expect(track.style.getPropertyValue("--drag-offset")).toBe("-100px");
    expect(track.getAttribute("data-dragging")).toBe("true");

    fireEvent.pointerUp(track, {
      pointerId: 1,
      isPrimary: true,
      clientX: 160
    });

    expect(getActiveQualificationTitle(carousel)).toBe(
      expectedQualifications[1].title
    );
    expect(track.style.getPropertyValue("--drag-offset")).toBe("0px");
    expect(track.getAttribute("data-dragging")).toBe("false");
  });

  it("snaps a short qualification drag back without changing the active card", () => {
    render(<HomeResearch />);

    const carousel = screen.getByRole("region", {
      name: "母公司资质证照展示"
    });
    const track = carousel.querySelector<HTMLElement>(
      "[data-qualification-track]"
    );

    if (!track) {
      throw new Error("The qualification carousel must expose a draggable track.");
    }

    fireEvent.pointerDown(track, {
      pointerId: 2,
      button: 0,
      isPrimary: true,
      clientX: 260
    });
    fireEvent.pointerMove(track, {
      pointerId: 2,
      isPrimary: true,
      clientX: 235
    });
    fireEvent.pointerUp(track, {
      pointerId: 2,
      isPrimary: true,
      clientX: 235
    });

    expect(getActiveQualificationTitle(carousel)).toBe(
      expectedQualifications[0].title
    );
    expect(track.style.getPropertyValue("--drag-offset")).toBe("0px");
    expect(track.getAttribute("data-dragging")).toBe("false");
  });

  it("moves backward on a right drag without triggering the dragged card click", () => {
    render(<HomeResearch />);

    const carousel = screen.getByRole("region", {
      name: "母公司资质证照展示"
    });
    const activeCard = within(carousel).getByRole("button", {
      name: "查看 国家高新技术企业 证照"
    });

    fireEvent.pointerDown(activeCard, {
      pointerId: 3,
      button: 0,
      isPrimary: true,
      clientX: 180
    });
    fireEvent.pointerMove(activeCard, {
      pointerId: 3,
      isPrimary: true,
      clientX: 270
    });
    fireEvent.pointerUp(activeCard, {
      pointerId: 3,
      isPrimary: true,
      clientX: 270
    });
    fireEvent.click(activeCard);

    expect(getActiveQualificationTitle(carousel)).toBe(
      expectedQualifications[4].title
    );
  });

  it("keeps the assessment link in both CTA variants while isolating the home variant", () => {
    const homeMarkup = renderToStaticMarkup(<CTASection variant="home" />);
    const defaultMarkup = renderToStaticMarkup(<CTASection />);

    expect(homeMarkup).toContain('data-cta-variant="home"');
    expect(homeMarkup).not.toContain("fluentSurface");
    expect(homeMarkup).toContain('href="/contact?type=assessment"');
    expect(homeMarkup).toContain("申请IP权益体检");
    expect(defaultMarkup).toContain('data-cta-variant="default"');
    expect(defaultMarkup).toContain("fluentSurface");
    expect(defaultMarkup).toContain('href="/contact?type=assessment"');
    expect(defaultMarkup).toContain("申请IP权益体检");
    expect(defaultMarkup).not.toContain('data-cta-variant="home"');
  });

  it("renders company positioning as an indexed editorial scenario list", () => {
    const { container } = render(<HomePositioning />);
    const section = container.querySelector<HTMLElement>(
      '[data-positioning-layout="editorial"]'
    );

    if (!section) {
      throw new Error("Company positioning must use the editorial layout.");
    }

    const scenarioList = within(section).getByRole("list");

    expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "让数字人格权资产更清晰、更可信、更可持续"
      })
    ).not.toBeNull();
    expect(scenarioList.getAttribute("role")).toBe("list");

    const scenarios = within(scenarioList).getAllByRole("listitem");

    expect(scenarios).toHaveLength(customerScenarios.length);
    expect(
      scenarios.map((scenario) => scenario.getAttribute("data-positioning-scenario"))
    ).toEqual(["01", "02", "03", "04"]);
    customerScenarios.forEach((scenario, index) => {
      expect(scenarios[index].textContent).toContain(scenario.title);
      expect(scenarios[index].textContent).toContain(scenario.description);
      expect(scenarios[index].querySelector("svg")).not.toBeNull();
    });
    expect(container.querySelector('a[href="/about"]')).not.toBeNull();
  });

  it("renders AIPR as an indexed five-capability list", () => {
    const { container } = render(<HomeAiprCapabilities />);
    const section = container.querySelector<HTMLElement>(
      '[data-aipr-tone="warm-light"]'
    );

    if (!section) {
      throw new Error("AIPR capabilities must use the warm-light section treatment.");
    }

    const capabilityList = within(section).getByRole("list");
    const capabilities = within(capabilityList).getAllByRole("listitem");

    expect(capabilityList.getAttribute("role")).toBe("list");
    expect(within(section).getByText(aiprPositioning.name)).not.toBeNull();
    expect(
      within(section).getByRole("heading", {
        level: 2,
        name: "以可信记录连接认证、监测、维权与授权"
      })
    ).not.toBeNull();
    expect(within(section).getByText(aiprPositioning.description)).not.toBeNull();
    expect(capabilities).toHaveLength(5);
    expect(capabilities.map((capability) => capability.getAttribute("data-aipr-capability"))).toEqual(
      ["01", "02", "03", "04", "05"]
    );
    expect(aiprModules).toHaveLength(5);
    aiprModules.forEach((module, index) => {
      expect(capabilities[index].textContent).toContain(module.title);
      expect(capabilities[index].textContent).toContain(module.description);
    });
    expect(container.querySelector('a[href="/aipr"]')).not.toBeNull();
  });

  it("keeps the warm-light AIPR section stable while revealing its inner content", () => {
    const { container } = render(<HomeAiprCapabilities />);
    const section = container.querySelector<HTMLElement>(
      '[data-aipr-tone="warm-light"]'
    );

    if (!section) {
      throw new Error("AIPR capabilities must use the warm-light section treatment.");
    }

    expect(section.classList.contains("scroll-reveal")).toBe(false);
    expect(section.querySelectorAll(".scroll-reveal")).toHaveLength(0);
  });

  it("renders service products as an indexed editorial list", () => {
    const { container } = render(<HomeServiceGrid />);
    const section = container.querySelector<HTMLElement>(
      '[data-service-layout="editorial"]'
    );

    if (!section) {
      throw new Error("Service products must use the editorial layout.");
    }

    const sectionView = within(section);
    const list = sectionView.getByRole("list");
    const entries = within(list).getAllByRole("listitem");
    const allServicesLink = sectionView.getByRole("link", {
      name: "查看全部服务"
    });

    expect(sectionView.getByText("服务产品")).not.toBeNull();
    expect(
      sectionView.getByRole("heading", {
        level: 2,
        name: "覆盖数字人格权资产全生命周期"
      })
    ).not.toBeNull();
    expect(
      sectionView.getByText(
        "围绕资产认证、声音声纹、肖像影像、侵权监测、证据固定和商业授权，形成清晰的服务组合。"
      )
    ).not.toBeNull();
    expect(allServicesLink.getAttribute("href")).toBe("/services");
    expect(list.tagName).toBe("OL");
    expect(list.getAttribute("role")).toBe("list");
    expect(services).toHaveLength(6);
    expect(entries).toHaveLength(6);
    expect(entries).toHaveLength(services.length);
    expect(
      entries.map((entry) => entry.getAttribute("data-service-emphasis"))
    ).toEqual(["featured", "featured", "compact", "compact", "compact", "compact"]);
    expect(
      entries.map((entry) =>
        within(entry).getByRole("link").getAttribute("href")
      )
    ).toEqual(services.map(() => "/services"));
    expect(
      section.className
        .split(/\s+/)
        .filter((className) => className === "scroll-reveal")
    ).toHaveLength(1);

    services.forEach((service, index) => {
      const entry = entries[index];
      const entryView = within(entry);
      const serviceIcon = entry.querySelector<SVGElement>(
        "svg[data-service-icon]"
      );

      expect(entryView.getByText(String(index + 1).padStart(2, "0"))).not.toBeNull();
      expect(
        entryView.getByRole("heading", { level: 3, name: service.title })
      ).not.toBeNull();
      expect(entryView.getByText(service.summary)).not.toBeNull();
      expect(serviceIcon?.getAttribute("data-service-icon")).toBe(service.title);
      expect(serviceIcon?.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("renders the service process as a traceable record path", () => {
    const { container } = render(<HomeProcess />);
    const section = container.querySelector<HTMLElement>(
      '[data-process-layout="traceable"]'
    );

    if (!section) {
      throw new Error("The service process must use the traceable layout.");
    }

    const sectionView = within(section);
    const list = sectionView.getByRole("list");
    const steps = within(list).getAllByRole("listitem");

    expect(sectionView.getByText("服务流程")).not.toBeNull();
    expect(
      sectionView.getByRole("heading", {
        level: 2,
        name: "从资产识别到合规使用，形成可追溯闭环"
      })
    ).not.toBeNull();
    expect(
      sectionView.getByText(
        "以清晰对象、可信记录和协同处置为基础，连接认证、监测、维权与授权。"
      )
    ).not.toBeNull();
    expect(list.tagName).toBe("OL");
    expect(list.getAttribute("role")).toBe("list");
    expect(serviceFlow).toHaveLength(4);
    expect(steps).toHaveLength(4);
    expect(steps).toHaveLength(serviceFlow.length);
    expect(
      section.className
        .split(/\s+/)
        .filter((className) => className === "scroll-reveal")
    ).toHaveLength(1);

    serviceFlow.forEach((step, index) => {
      const item = steps[index];
      const itemView = within(item);

      expect(itemView.getByText(step.step)).not.toBeNull();
      expect(
        itemView.getByRole("heading", { level: 3, name: step.title })
      ).not.toBeNull();
      expect(itemView.getByText(step.description)).not.toBeNull();
      expect(itemView.getByText("可信记录")).not.toBeNull();
    });
  });

  it("keeps the service closure stages contiguous and ordered", () => {
    const { container } = render(<HomePage />);
    const stages = Array.from(
      container.querySelectorAll<HTMLElement>("[data-service-closure-stage]")
    );

    expect(stages).toHaveLength(3);
    expect(stages.map((section) => section.dataset.serviceClosureStage)).toEqual([
      "scenario",
      "services",
      "delivery"
    ]);
    expect(stages[0].nextElementSibling).toBe(stages[1]);
    expect(stages[1].nextElementSibling).toBe(stages[2]);
  });

  it("keeps the eight-card hero and the refreshed homepage module order", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    const heroIndex = markup.indexOf('data-curved-hero="true"');
    const positioningIndex = markup.indexOf("公司定位");
    const aiprIndex = markup.indexOf("星眸AIPR");
    const scenarioIndex = markup.indexOf("服务场景");
    const processIndex = markup.indexOf("服务流程");
    const qualificationsIndex = markup.indexOf("母公司资质与行业认可");

    expect(markup.match(/data-curved-hero-fallback-card/g) ?? []).toHaveLength(8);
    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(positioningIndex).toBeGreaterThan(heroIndex);
    expect(aiprIndex).toBeGreaterThan(positioningIndex);
    expect(scenarioIndex).toBeGreaterThan(aiprIndex);
    expect(processIndex).toBeGreaterThan(scenarioIndex);
    expect(qualificationsIndex).toBeGreaterThan(processIndex);
  });
});
