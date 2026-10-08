# 北京首版认证有限公司官网第一阶段

这是“北京首版认证有限公司”官网第一阶段前台项目，定位为 AIGC 时代数字人格权资产的认证、确权、监测、维权与授权服务展示站。当前版本聚焦可信落地页、角色解决方案、星眸AIPR、服务与产品、技术与可信、合规与研究、新闻内容、法律信息和文本联系表单。

第一阶段不包含 Directus CMS、PostgreSQL、对象存储、附件上传、滑块验证码、线索状态流转后台、自动分配负责人或英文站。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- lucide-react 图标
- Vitest + Testing Library 内容契约、导航状态、轮播交互与联系表单测试
- nodemailer 企业邮箱发送适配

## 环境依赖与本地启动

- Node.js 20.9.0 或更新版本（当前 Next.js 依赖要求）及 npm。
- 使用根目录 `package-lock.json` 安装依赖；当前官网不需要本地数据库。
- 生产联系表单所需的 SMTP 和隐私运营配置见下方环境变量分组；本地查看页面无需填写生产密钥。

```bash
npm ci
npm run dev
```

本地开发服务默认运行在 `http://localhost:3000`。

如果 Windows PowerShell 阻止 `npm.ps1`，可使用：

```powershell
npm.cmd run dev
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
```

日常开发、测试、类型检查和构建不需要生产 SMTP 密钥或生产人工证明。缺少生产配置时，联系收集保持关闭，但仍可验证草案页面和 fail-closed 行为。

提交前可依次运行：

```bash
npm run typecheck
npm run test
npm run build
```

构建产物位于 `.next/`，该目录不进入 Git。部署生产候选前须按下方“隐私快照与生产发布检查”完成配置和人工核验；`npm start` 会先运行 `release:check`，缺少必需配置时会阻止启动。当前仓库不包含已验收的生产部署配置。

## 当前页面

- `/` 首页
- `/solutions` 解决方案
- `/aipr` 星眸AIPR
- `/services` 服务与产品
- `/trust` 技术与可信
- `/compliance` 合规与研究
- `/news` 新闻与研究
- `/news/[slug]` 新闻与研究详情
- `/about` 关于首版与联系
- `/contact` 联系我们
- `/privacy` 隐私政策
- `/disclaimer` 免责声明

旧栏目 `/platform`、`/cases` 仍为兼容重定向；`/solutions` 已升级为真实解决方案页面。

## 目录说明

- `app/`：Next.js App Router 页面、布局、404、robots、sitemap 和联系表单接口。
- `components/layout/`：固定顶部导航、Mega Menu 与页脚。
- `components/common/`：容器、页面 Hero、模块标题、功能卡片、CTA 等通用展示组件。
- `components/home/`：三屏 Hero 轮播与首页定位、AIPR、服务、流程、研究模块。
- `components/forms/`：联系表单前端交互与校验。
- `content/navigation.ts`：七项主导航与“服务与产品”“合规与研究”两组 Mega Menu 内容。
- `content/home.ts`：首页三屏轮播标题、说明、按钮与视觉类型。
- `content/`：公司信息、星眸AIPR、服务产品、合规研究、新闻研究和法律内容配置。
- `lib/`：SEO、常量、轮播与导航状态、联系表单校验、邮件正文和 SMTP 发送适配。
- `public/images/hero/shouban-campus.jpg`：首页轮播第一屏实景图；保持文件名即可直接替换。
- `tests/`：内容结构、导航、轮播和联系表单测试。
- `docs/deployment/privacy-readiness.md`：隐私邮箱、保留、权利请求、Lighthouse/Nginx 和候选发布人工操作手册。
- `docs/deployment/edgeone-contact-protection.md`：EdgeOne 限频、九字段证据与重新证明清单。

## 首页内容维护

- 更换第一屏图片：替换 `public/images/hero/shouban-campus.jpg`，建议使用横向高清 JPG。
- 修改三屏轮播文案与按钮：编辑 `content/home.ts`。
- 修改主导航与 Mega Menu：编辑 `content/navigation.ts`。
- 修改首页服务、AIPR 与研究内容：分别编辑 `content/services.ts`、`content/aipr.ts`、`content/research.ts`。

## 环境变量分组

完整键名和空白示例见 `.env.example`。README 只按用途列出配置，不记录生产值。

### 公开隐私事实

- 站点 Origin：`NEXT_PUBLIC_SITE_URL`
- 专用隐私联系渠道和政策日期：`PRIVACY_CONTACT_EMAIL`、`PRIVACY_POLICY_EFFECTIVE_DATE`
- 托管服务商、产品和位置：`PRIVACY_HOSTING_PROVIDER_NAME`、`PRIVACY_HOSTING_PRODUCT_NAME`、`PRIVACY_HOSTING_LOCATION`
- SMTP 中继服务商和位置：`PRIVACY_SMTP_RELAY_PROVIDER_NAME`、`PRIVACY_SMTP_RELAY_LOCATION`
- 联系邮箱服务商和位置：`PRIVACY_CONTACT_MAILBOX_PROVIDER_NAME`、`PRIVACY_CONTACT_MAILBOX_LOCATION`
- 权利邮箱服务商和位置：`PRIVACY_RIGHTS_MAILBOX_PROVIDER_NAME`、`PRIVACY_RIGHTS_MAILBOX_LOCATION`
- 邮件删除和备份到期方式：`PRIVACY_MAIL_DELETION_METHOD`

### 运行时邮件投递

- 目标邮箱：`CONTACT_TO_EMAIL`
- SMTP 连接与认证：`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`

### 受控运营人工证明

- 当前不可变服务版本：`SERVICE_VERSION_ID`
- 证明身份、时间和负责人：`PRIVACY_OPERATIONS_ATTESTATION_ID`、`PRIVACY_OPERATIONS_APPROVED_AT`、`PRIVACY_OPERATIONS_OWNER`
- 证明绑定：`PRIVACY_ATTESTED_SERVICE_VERSION_ID`、`PRIVACY_ATTESTED_SITE_ORIGIN`、`PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID`

### 可选 EdgeOne 九字段证据

- 当前配置：`EDGEONE_SITE_ID`、`EDGEONE_RATE_LIMIT_RULE_ID`
- 已验证配置：`EDGEONE_VERIFIED_SITE_ID`、`EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID`、`EDGEONE_VERIFIED_ORIGIN`、`EDGEONE_VERIFIED_AT`
- 验证与日志事实：`EDGEONE_VERIFICATION_ID`、`EDGEONE_LOG_RETENTION_DAYS`、`EDGEONE_LOG_STORAGE_LOCATION`

九字段必须全部有效或全部不提供。EdgeOne 控制台事实变化后，旧快照和人工证明不能复用。

任一隐私事实、邮件投递设置或人工证明不完整时，联系页不渲染表单，`/api/contact` 返回 503，避免假装已经接收或完成投递。

## 隐私快照与生产发布检查

生成当前公开隐私事实的快照：

```powershell
npm.cmd run privacy:snapshot
```

`privacy:snapshot` 成功时只输出公共事实的 64 位 SHA-256 哈希；配置不完整时只输出 issue code 和键名。两种情况都不输出邮箱、服务商、SMTP 凭据、证明值或其他环境变量值。该哈希用于人工证明绑定，不代表人工核验已经完成。

生产候选运行时在切换流量前必须执行：

```powershell
npm.cmd run release:check
```

`release:check` 只校验配置格式和绑定，不能代替邮箱投递、权限、MFA、删除／备份、Nginx 或服务商位置的人工证据。当前项目尚无已经创建并验收的专用隐私邮箱、Lighthouse/Nginx 部署和运营人工证明，因此在普通／裸环境中运行该命令会按设计返回非零；这不是日常 `test`、`typecheck` 或 `build` 的失败。

支持的 `npm start` 路径会先自动运行 `prestart`，而 `prestart` 会执行同一个 `release:check`。未来使用 standalone `node server.js` 时不会自动触发 npm 生命周期，因此独立容器 entrypoint 必须先运行 `release:check`，成功后才能启动服务。

## 当前部署状态

- 腾讯云 Lighthouse 北京地域 2 核 CPU／2 GB 内存目前只是选定目标，尚未创建或验收。
- Next.js standalone 产物、容器 entrypoint、Nginx 配置、30 天日志轮转和原子流量切换仍属于独立部署工作。
- EdgeOne 仍需人工开通、三路径缓存旁路、第 6 次请求验证和九字段证据；当前不得标记为已启用。
- 专用隐私邮箱、邮件服务商位置、MFA／最小权限、删除／备份流程和运营人工证明均须按部署手册实际完成后，才能开放联系收集。

执行顺序和证据要求见：

- [隐私就绪、保留与生产发布操作手册](docs/deployment/privacy-readiness.md)
- [EdgeOne 联系接口防滥用配置](docs/deployment/edgeone-contact-protection.md)

## 待公司内部确认

- 正式电话、邮箱、地址、备案号。
- 可公开客户名称、真实案例、合作方和业务数据。
- 公司资质、荣誉、标准、专利、鉴定材料等正式披露口径。
- 新闻发布时间、活动事实、政策解读发布口径。
- 正式官网域名与备案信息。
