import type { EffectivePrivacyConfig } from "@/lib/privacy-readiness.mjs";
import {
  PRIVACY_COLLECTION_FIELDS,
  PRIVACY_POLICY_CONSENT_CONTRACT,
  PRIVACY_POLICY_SECTIONS,
  type PrivacyCollectionField,
  type PrivacyPolicySectionId
} from "@/lib/privacy-policy.mjs";
import { Container } from "@/components/common/Container";

type PrivacyPolicyProps = {
  config: EffectivePrivacyConfig;
};

const sectionOrdinals = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"] as const;

function sectionHeading(id: PrivacyPolicySectionId, index: number) {
  const section = PRIVACY_POLICY_SECTIONS.find((item) => item.id === id);
  if (!section || !sectionOrdinals[index]) {
    throw new Error(`Unknown privacy policy section: ${id}`);
  }

  return `${sectionOrdinals[index]}、${section.label}`;
}

function fieldRetention(
  field: PrivacyCollectionField,
  config: EffectivePrivacyConfig
) {
  if (field.retentionKind === "inquiry") {
    return `${PRIVACY_POLICY_CONSENT_CONTRACT.retention.inquiryLabel} ${config.retention.unconvertedInquiryDays} 天；${PRIVACY_POLICY_CONSENT_CONTRACT.retention.formalRecordRule}`;
  }

  const applicationAndProxy = `应用日志与${config.hosting.productName}/反向代理访问日志 ${config.retention.applicationLogDays} 天`;
  if (!config.edgeOne.enabled) {
    return `${applicationAndProxy}；EdgeOne 当前未启用`;
  }

  return `${applicationAndProxy}；EdgeOne ${config.edgeOne.logRetentionDays} 天，存储位置：${config.edgeOne.logStorageLocation}`;
}

export function PrivacyPolicy({ config }: PrivacyPolicyProps) {
  const contract = PRIVACY_POLICY_CONSENT_CONTRACT;
  const networkCategories = contract.technicalData.reverseProxy.categories.join("、");

  return (
    <div className="privacy-policy-canvas">
      <Container>
        <article className="privacy-policy">
          <p className="privacy-policy__status" aria-label="政策版本与生效日期">
            <span>版本 {config.policyVersion}</span>
            <span>
              生效日期 <time dateTime={config.effectiveDate}>{config.effectiveDate}</time>
            </span>
          </p>

          <nav className="privacy-policy__toc" aria-label="隐私政策目录">
            <p className="privacy-policy__toc-title">目录</p>
            <ol>
              {PRIVACY_POLICY_SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <section id="controller" className="privacy-policy__section">
            <h2>{sectionHeading("controller", 0)}</h2>
            <p>
              本联系表单个人信息的处理者为
              <strong>{config.processorName}</strong>。我们仅为
              {contract.processing.primaryPurpose}处理相关信息。
            </p>
            <p>
              如需咨询本政策或行使个人信息权利，请发送邮件至
              <a
                className="privacy-policy__email"
                href={`mailto:${config.privacyContactEmail}`}
              >
                {config.privacyContactEmail}
              </a>
              。
            </p>
          </section>

          <section id="submitted-data" className="privacy-policy__section">
            <h2>{sectionHeading("submitted-data", 1)}</h2>
            <p>{contract.processing.collectionNotice}</p>
            <div
              className="privacy-policy__table-region"
              role="region"
              aria-label="联系表单收集信息表格"
              tabIndex={0}
            >
              <table className="privacy-policy__table">
                <caption>联系表单收集信息说明</caption>
                <thead>
                  <tr>
                    <th scope="col">信息类别</th>
                    <th scope="col">填写要求</th>
                    <th scope="col">处理目的</th>
                    <th scope="col">处理方式</th>
                    <th scope="col">保存期限</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIVACY_COLLECTION_FIELDS.map((field) => (
                    <tr key={field.key}>
                      <th scope="row">{field.label}</th>
                      <td>{field.requiredness}</td>
                      <td>{field.purpose}</td>
                      <td>{field.processingMethod}</td>
                      <td>{fieldRetention(field, config)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="technical-data" className="privacy-policy__section">
            <h2>{sectionHeading("technical-data", 2)}</h2>
            <p>{`应用日志仅记录${contract.technicalData.applicationLogs.categories.join("、")}，用于${contract.technicalData.applicationLogs.purpose}，保留 ${config.retention.applicationLogDays} 天；不包含${contract.technicalData.applicationLogs.exclusions.join("、")}。`}</p>
            <p>{`${config.hosting.productName}/反向代理访问日志处理${networkCategories}，仅用于${contract.technicalData.reverseProxy.purpose}，保留 ${config.retention.applicationLogDays} 天。`}</p>
            <p>
              {config.edgeOne.enabled
                ? `EdgeOne 处理同类网络与安全元数据（${contract.technicalData.edgeOne.categories.join("、")}），用于${contract.technicalData.edgeOne.purpose}；EdgeOne 安全日志保留 ${config.edgeOne.logRetentionDays} 天，日志存储位置：${config.edgeOne.logStorageLocation}。`
                : "EdgeOne 当前未启用，不处理本网站的边缘安全日志。"}
            </p>
          </section>

          <section id="processing-flow" className="privacy-policy__section">
            <h2>{sectionHeading("processing-flow", 3)}</h2>
            <p>
              联系信息按“{contract.processing.path.join(" → ")}”的顺序处理；
              {contract.processing.method}。
            </p>
            <p>
              {contract.processing.noWebsiteDatabase}；
              {contract.processing.noAdvertisingOrUnrelatedMarketing}。
              {contract.processing.priorNoticeForNewBasisOrConsent}。
            </p>
          </section>

          <section id="processors" className="privacy-policy__section">
            <h2>{sectionHeading("processors", 4)}</h2>
            <p>以下为本网站生效时实际使用的基础设施与邮件服务：</p>
            <dl className="privacy-policy__facts">
              <div>
                <dt>网站托管</dt>
                <dd>
                  {config.hosting.providerName}，{config.hosting.productName}；处理位置：
                  {config.hosting.location}
                </dd>
              </div>
              <div>
                <dt>邮件中继</dt>
                <dd>
                  {config.mail.smtpRelay.providerName}；处理位置：
                  {config.mail.smtpRelay.location}
                </dd>
              </div>
              <div>
                <dt>联系信息收件邮箱</dt>
                <dd>
                  {config.mail.contactMailbox.providerName}；存储位置：
                  {config.mail.contactMailbox.location}
                </dd>
              </div>
              <div>
                <dt>权利请求邮箱</dt>
                <dd>
                  {config.mail.rightsMailbox.providerName}；存储位置：
                  {config.mail.rightsMailbox.location}
                </dd>
              </div>
            </dl>
          </section>

          <section id="retention" className="privacy-policy__section">
            <h2>{sectionHeading("retention", 5)}</h2>
            <ul>
              <li>
                {contract.retention.inquiryLabel}自收到之日起保留
                {config.retention.unconvertedInquiryDays} 天；
                {contract.retention.formalRecordRule}。
              </li>
              <li>
                应用日志与{config.hosting.productName}/反向代理访问日志均保留
                {config.retention.applicationLogDays} 天。
              </li>
              <li>
                {contract.retention.rightsRecordRule}：保留
                {config.retention.rightsRecordDays} 天。
              </li>
            </ul>
            <p>
              {contract.retention.deletionRule}；具体处理方式：
              {config.mail.deletionMethod}。
            </p>
            <p>
              {contract.retention.deletionException}时，我们
              {contract.retention.restrictedUse}，这些情形属于删除例外。
            </p>
          </section>

          <section id="rights" className="privacy-policy__section">
            <h2>{sectionHeading("rights", 6)}</h2>
            <p>在法律规定的范围内，您可以提出以下请求：</p>
            <ul className="privacy-policy__rights-list">
              {contract.rights.commitments.map((right) => (
                <li key={right}>{right}</li>
              ))}
            </ul>
            <p>{`${contract.rights.verification}。我们将从${contract.rights.responseClock} ${config.rightsResponseWorkingDays} 个工作日内答复；${contract.rights.refusalNotice}。`}</p>
          </section>

          <section id="security" className="privacy-policy__section">
            <h2>{sectionHeading("security", 7)}</h2>
            <ul>
              {contract.security.commitments.map((commitment) => (
                <li key={commitment}>{commitment}</li>
              ))}
            </ul>
          </section>

          <section id="sensitive-and-children" className="privacy-policy__section">
            <h2>{sectionHeading("sensitive-and-children", 8)}</h2>
            <p className="privacy-policy__notice">{contract.sensitiveMaterialWarning}</p>
            <p className="privacy-policy__notice">{contract.children.notice}</p>
            <p>
              {contract.children.discoveredDataAction}，
              {contract.children.legalRetentionException}。
            </p>
          </section>

          <section id="updates" className="privacy-policy__section">
            <h2>{sectionHeading("updates", 9)}</h2>
            <p>
              {contract.updates.notice}。当前版本为 {config.policyVersion}，生效日期为
              <time dateTime={config.effectiveDate}>{config.effectiveDate}</time>。
            </p>
            <p>
              {contract.updates.materialChangeTriggers.join("、")}等事项
              {contract.updates.reconsent}。
            </p>
          </section>
        </article>
      </Container>
    </div>
  );
}
