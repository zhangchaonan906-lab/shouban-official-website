# EdgeOne 联系接口防滥用配置

> 当前状态：**未在腾讯云控制台启用，也没有九字段验证证据**。本文是未来开通 EdgeOne 的人工配置与验收清单；只有完成候选运行时检查、缓存旁路、规则发布、第 6 次请求验证和九字段证据绑定后，才能在新的隐私快照与人工证明中把 EdgeOne 作为已启用事实。

## 前置条件

- 执行前须按 [隐私就绪、保留与生产发布操作手册](./privacy-readiness.md) 完成人工检查。
- 执行前须确认候选运行时注入了当前版本的生产配置和人工证明，且 `npm run release:check` 退出码为 0。未通过前不得执行下面的应用边界或第 6 次请求探针。
- 执行时须确认生产候选环境部署了本仓库的联系接口安全边界。
- `NEXT_PUBLIC_SITE_URL` 是公开站点的准确 Origin，例如 `https://www.example.com`，不包含额外路径。
- 执行时须确认目标域名位于待验收的 EdgeOne 站点中，HTTPS 和回源访问正常；这只是候选条件，不代表已经通过验证或可以对外声明启用。
- 操作者有该站点 Web 防护策略的编辑、发布和 Web 安全分析查看权限。

腾讯云当前控制台路径和配置项可对照：

- [自定义速率限制规则](https://cloud.tencent.com/document/product/1552/93130)
- [Web 防护请求处理顺序](https://cloud.tencent.com/document/product/1552/93134)

## 先配置三条路径不缓存

EdgeOne 和源站必须对以下精确路径旁路缓存：

- `/contact`
- `/privacy`
- `/api/contact`

逐条确认：

1. 不创建会覆盖这三条路径的页面缓存、API 缓存或“忽略源站不缓存响应头”规则。
2. 保留源站的 `Cache-Control: private, no-store, max-age=0`，不得在边缘改写为可缓存。
3. 分别请求三条路径，记录 EdgeOne 实际缓存状态头或控制台命中证据；结果必须为旁路／未命中，重复请求也不得返回缓存对象。
4. `/privacy` 从草案切换为生效状态、`/contact` 从禁用切换为表单状态后再次验证，避免旧页面残留在边缘。

任一路径仍可能被缓存时停止验收，不得继续发布速率限制规则或创建 EdgeOne 证明。

## `release:check` 通过后验收应用边界

这组检查只能在候选运行时 `release:check` 已通过后、速率限制规则发布前执行，避免未就绪 API 的 503 掩盖边界结果，也避免探测请求污染同一 IP 的 EdgeOne 计数。以下命令使用 PowerShell；将地址替换成真实生产站点：

```powershell
$env:SITE_URL = "https://www.example.com"
$origin = ([Uri]$env:SITE_URL).GetLeftPart([System.UriPartial]::Authority)
$contactUri = "$($origin.TrimEnd('/'))/api/contact"

function Get-ContactStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Body,
    [string]$ContentType = "application/json",
    [hashtable]$Headers = @{}
  )

  try {
    (Invoke-WebRequest `
      -UseBasicParsing `
      -Method Post `
      -Uri $contactUri `
      -Headers $Headers `
      -ContentType $ContentType `
      -Body $Body).StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }

    throw
  }
}
```

依次确认以下边界：

```powershell
# 非 JSON Content-Type：应为 415
Get-ContactStatus -Body "{}" -ContentType "text/plain" -Headers @{ Origin = $origin }

# 缺少 Origin：应为 403
Get-ContactStatus -Body "{}"

# 非法 Origin：应为 403
Get-ContactStatus -Body "{}" -Headers @{ Origin = "https://invalid.example" }

# 畸形 JSON：应为 400
Get-ContactStatus -Body '{"name":' -Headers @{ Origin = $origin }

# JSON null：应为 400
Get-ContactStatus -Body "null" -Headers @{ Origin = $origin }

# 超过 16,384 字节：应为 413
$oversizedBody = '{"message":"' + ('a' * 17000) + '"}'
Get-ContactStatus -Body $oversizedBody -Headers @{ Origin = $origin }
```

应用生成的失败响应还应带有 `Content-Type: application/json`，正文符合：

```json
{
  "ok": false,
  "code": "CONTACT_INVALID_BODY",
  "message": "请求内容无效"
}
```

具体 `code` 会随失败原因变化，但 `ok`、`code`、`message` 的 envelope 结构保持一致。

至少再用一次带响应头的请求核对真实 envelope，而不是只看状态码：

```powershell
curl.exe --include --silent --show-error `
  --request POST $contactUri `
  --header "Origin: $origin" `
  --header "Content-Type: application/json" `
  --data-binary "null"
```

输出应同时包含 `HTTP/... 400`、`Content-Type: application/json` 和带 `ok: false`、`code`、`message` 的 JSON 正文。

## 创建 EdgeOne 精准速率限制规则

1. 登录腾讯云 EdgeOne 控制台，进入 **服务总览 > 网站安全加速 > 目标站点**。
2. 进入 **安全防护 > Web 防护**；选择承载生产联系表单的域名级防护策略。
3. 在 **速率限制 > 精准速率限制** 中选择 **添加规则 > 创建空白规则**。
4. 规则名建议填写 `contact-post-per-ip`。
5. 配置全部判断条件（条件间为 AND）：
   - 请求方式（Method）等于 `POST`
   - 请求路径（Path）等于 `/api/contact`
6. 配置触发方式：
   - 统计方式／请求特征：`客户端 IP`
   - 计数周期：`10 分钟`
   - 速率阈值：`5 次`
   - 触发状态保持时长：`30 分钟`
7. 配置处置：
   - 首选 `响应自定义页面`，HTTP 状态码设为 `429`，响应类型设为 JSON；或在套餐不支持该能力时使用 `拦截`。
   - 不使用 JavaScript 挑战：浏览器通过 `fetch()` 调用此 API，挑战页不是该接口可消费的响应。
8. 检查优先级和防护例外规则：不得有规则让 `/api/contact` 跳过速率限制模块。普通自定义规则中的“放行”不会跳过后续速率限制，但“防护例外规则”可能会跳过。
9. 已有公开流量的站点先选择 `观察` 并运行 24 小时；确认正常用户不会超过阈值后切换为上述阻断处置。新站可在表单公开前直接启用阻断。
10. 单击 **保存并发布**。仅保存草稿不代表规则生效。

如果支持自定义响应，建议正文保持不含内部信息：

```json
{
  "ok": false,
  "code": "CONTACT_RATE_LIMITED",
  "message": "提交过于频繁，请稍后再试。"
}
```

EdgeOne 返回默认 HTML 或其他非 JSON 拦截页时，客户端也能安全降级；但只有状态码为 `429` 时，客户端才会显示专门的频率限制提示。

## 验收第 6 次请求被阻断

使用一个尚未触发该规则的测试出口 IP。下面的有效请求故意填写蜜罐字段 `website`：应用会返回普通成功响应，但不会调用 SMTP，因此可以安全验证 EdgeOne 计数而不发送 5 封测试邮件。

```powershell
$probeBody = @{
  name = "EdgeOne验收"
  phone = "13800138000"
  organization = "部署验收"
  email = "edgeone-probe@example.com"
  customerType = "其他"
  needType = "企业合作咨询"
  assetType = "综合数字人格权资产"
  platformUrl = ""
  message = "这是EdgeOne联系接口限频验收请求。"
  consent = $true
  website = "edgeone-rollout-probe"
} | ConvertTo-Json -Compress

1..6 | ForEach-Object {
  $status = Get-ContactStatus -Body $probeBody -Headers @{ Origin = $origin }
  "request=$($_) status=$status"
}
```

触发后再读取一次完整的 EdgeOne 拦截响应，用于记录状态码、响应类型和正文格式；保持期内该请求仍应在边缘被阻断，不会到达应用：

```powershell
curl.exe --include --silent --show-error `
  --request POST $contactUri `
  --header "Origin: $origin" `
  --header "Content-Type: application/json" `
  --data-binary "{}"
```

验收标准：

- 前 5 次请求返回 `200`。
- 第 6 次请求由 EdgeOne 阻断；首选结果为 `429`，套餐只支持默认拦截时记录实际状态码和响应类型。
- 第 6 次请求没有到达应用；EdgeOne **Web 安全分析** 中能按规则名 `contact-post-per-ip` 找到命中记录。
- 验收期间 SMTP／收件箱中没有产生上述探测邮件。
- 30 分钟保持期结束后，测试 IP 可以重新提交。

任一条件不满足，都不得把规则标记为已启用。

## 记录九字段配置与验证证据

EdgeOne 不是由单个布尔值声明启用。完成第 6 次请求验证后，在受控发布记录中保存以下九个字段；必须九项全部存在且有效，或九项全部不提供。部分填写属于无效配置：

| 字段 | 证据要求 |
|---|---|
| `EDGEONE_SITE_ID` | 当前待发布 EdgeOne 站点 ID |
| `EDGEONE_RATE_LIMIT_RULE_ID` | 当前待发布精准速率限制规则 ID |
| `EDGEONE_VERIFIED_SITE_ID` | 实际完成第 6 次请求验证的站点 ID，必须等于当前 `EDGEONE_SITE_ID` |
| `EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID` | 实际命中验证的规则 ID，必须等于当前 `EDGEONE_RATE_LIMIT_RULE_ID` |
| `EDGEONE_VERIFIED_ORIGIN` | 验证时的公开 Origin，必须等于当前规范化站点 Origin |
| `EDGEONE_VERIFIED_AT` | 验证完成的 ISO 8601 时间，不得位于未来 |
| `EDGEONE_VERIFICATION_ID` | 将控制台事件、Web 安全分析记录和人工验收记录关联起来的非秘密验证 ID |
| `EDGEONE_LOG_RETENTION_DAYS` | EdgeOne 产品实际安全日志保留天数，不得套用应用／Nginx 的 30 天 |
| `EDGEONE_LOG_STORAGE_LOCATION` | EdgeOne 安全日志实际存储位置 |

同时记录以下非环境变量证据：

- 前 5 次请求的实际状态码；
- 第 6 次请求的实际状态码、响应类型和响应摘要；
- 第 6 次请求未到达应用的应用日志核对结果；
- Web 安全分析中的规则命中事件 ID；
- 三条路径的缓存旁路结果；
- 验收期间未产生 SMTP 邮件的核对结果。

当前 ID 与 verified ID 必须分别记录，不能用同一字段覆盖。站点 ID、规则 ID、Origin、日志期限、日志位置或验证事实发生变化时，旧证据立即失效，必须重新验证。

## 启用后的隐私快照与重新发布

EdgeOne 启用状态、实际日志期限和存储位置都是公开隐私事实。九字段证据完成后，必须按以下顺序重新发布：

1. 将完整九字段注入新的候选服务版本。
2. 运行 `npm run privacy:snapshot`，取得包含当前 EdgeOne 事实的新公共快照 ID。
3. 创建新的运营人工证明，重新绑定不可变 `SERVICE_VERSION_ID`、当前 Origin 和新快照；旧证明不得复用。
4. 在候选运行时运行 `npm run release:check` 并要求退出码为 0。
5. 发布新服务版本，再切换流量。
6. 复核生效隐私政策准确显示 EdgeOne 的实际日志期限和位置。
7. 再次验证 `/contact`、`/privacy`、`/api/contact` 均不被 EdgeOne 或源站缓存。

未完成新快照、新人工证明、重新发布和政策／缓存复核时，即使控制台规则已经保存，也不得在文档、页面或运营记录中标记 EdgeOne 已启用。

## 发布后 24 小时观察

- 在 Web 安全分析中观察命中 IP 数、命中次数、状态码和规则名，不导出联系表单正文。
- 对照应用的粗粒度 `requestId`、结果码和耗时日志；不得记录姓名、手机号、邮箱、链接、留言或 SMTP 凭据。
- 观察真实邮件量和用户反馈。若确认误伤，先切回 `观察`，再基于证据调整阈值。
- 不要通过加入宽泛的防护例外规则来绕过问题。

## 人工完成记录

- [ ] EdgeOne 套餐已开通并绑定生产站点
- [ ] 生产域名已接入，HTTPS／回源正常
- [ ] 候选运行时 `release:check` 已通过
- [ ] `NEXT_PUBLIC_SITE_URL` 与生产 Origin 一致
- [ ] `/contact`、`/privacy`、`/api/contact` 均已配置并验证不缓存
- [ ] 应用边界探测状态码全部符合预期
- [ ] `contact-post-per-ip` 已保存并发布
- [ ] 规则优先级与防护例外已检查
- [ ] 第 6 次请求已被 EdgeOne 阻断
- [ ] Web 安全分析中已看到命中记录
- [ ] 蜜罐验收请求未触发 SMTP
- [ ] 九字段证据已完整记录，current/verified 站点和规则 ID 分别保存且相等
- [ ] verified Origin、验证时间、验证 ID、实际日志期限和位置已复核
- [ ] 已重新计算隐私快照并创建绑定新快照的运营人工证明
- [ ] 新候选版本 `release:check` 已通过并重新发布
- [ ] 生效隐私政策与三路径缓存行为已复核
- [ ] 发布后 24 小时观察已完成

完成时间：`__________`

操作者：`__________`

线上第 6 次请求状态码：`__________`

`EDGEONE_SITE_ID`：`__________`

`EDGEONE_RATE_LIMIT_RULE_ID`：`__________`

`EDGEONE_VERIFIED_SITE_ID`：`__________`

`EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID`：`__________`

`EDGEONE_VERIFIED_ORIGIN`：`__________`

`EDGEONE_VERIFIED_AT`：`__________`

`EDGEONE_VERIFICATION_ID`：`__________`

`EDGEONE_LOG_RETENTION_DAYS`：`__________`

`EDGEONE_LOG_STORAGE_LOCATION`：`__________`

EdgeOne 第 6 次请求／规则事件 ID：`__________`
