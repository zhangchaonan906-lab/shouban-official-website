# 独立官网网关发布、验收与回滚

状态：工程准备，未生产部署。本文不表示域名、备案、正式资料、邮箱、防护、证书、资源或运营证明已核验。本次不连接生产服务器，不修改 DNS、证书、安全组、ALB 或现有服务。所有真实值在受控发布记录中批准；仓库样例不是生产配置。

## 1. 拓扑和边界

```text
访客 → 经验证的边缘防护 → 现有 ALB 的官网精确 Host/SNI 规则
     → 官网专属服务器组 → ECS 私网地址:批准端口（候选18807）
     → 独立 Caddy HTTP:8080 → 专用 bridge → website:3000
```

不更改现有共享 Caddy、助手/管理入口网络或 ALB 默认业务。两台现有 ECS 不等于官网双机高可用；目标主机、容量、端口、实际 ALB 来源和证书均须变更前只读复核。旧 `alibaba-cloud-shared-ecs.md` 保留历史观察，不是当前操作依据。

`deploy/compose.website.yml` 无宿主机端口；`deploy/compose.gateway.yml` 仅绑定批准的 RFC1918 私网 IPv4 和非特权端口。两服务只加入专网。生产 bridge 需要受控 DNS/SMTP 出站，不能照抄 CI 的 `--internal` 网络；专网不等于出站隔离，SG/Docker 转发链和源站防绕过另行验收。

新 Caddy 仅接受批准 ALB 来源 CIDR 和正式 Host；不信任任意公网代理头。`/healthz` 的直接健康响应仅允许容器 loopback，不能当成网站、SMTP 或 ALB 健康证明。ALB 应用健康检查使用正式 Host 的 `GET /`、预期200。维护配置返回业务503，不能依靠 unhealthy 阻断流量：ALB 全部后端不健康时仍可能转发。

TLS 在边缘/ALB 管理，独立 Caddy 明确 `auto_https off`，不签证书、不占旧80/443。应用运行环境的 `SHOUBAN_SITE_DOMAIN` 必须是正式域名，不能设为 `:8080`。代理头信任和来源限制必须结合真实 ALB 模式核对，禁止 `0.0.0.0/0`。

网关镜像必须由 `deploy/gateway.Dockerfile` 构建：官方固定Caddy基础镜像的二进制携带低端口文件capability，与清空运行capability的边界会产生exec EPERM；派生镜像在构建期显式移除并检查文件capability，运行继续非root、cap_drop ALL和8080。不通过增加运行capability解决，不直接拿官方原镜像冒充已验证网关镜像。

## 2. 执行环境和发布包

工具新增前置：目标 Linux 主机须有 Node.js 24、Docker Engine/Compose v2（支持 `up --wait`）、curl；执行身份须已获准读受保护配置并操作本机 Docker。这不是安装授权，本轮不安装任何生产组件。ECS 不运行 `npm ci` 或 `next build`。回滚 apply 固定使用本机 Unix Docker socket，不允许 DOCKER_HOST/context 将操作转向未知主机。

每次使用完整 Git SHA 或不可变版本ID，固定 Compose 项目名 `shouban-prod`，不因切换目录创建第二套项目。固定 DNS 别名 `shouban-website` 不支持两个项目共网冒充蓝绿；单服务替换存在短暂不可用。

发布包统一放在 `/opt/shouban/releases/<releaseId>/`，内含仓库构建来源、`deploy/`、`scripts/`、受保护 `config/` 和非秘密 `release.json`。运行配置不进入 Git 或镜像；目录权限和备份按受控发布身份设置。所有描述文件引用都必须在同一版本目录内，不能使用 `current`、父级路径、符号链接或可变配置。

| 文件 | 用途 |
|---|---|
| `config/runtime.env` | 应用真实配置、SMTP与当前证明；权限0600，仅受控身份读取 |
| `config/compose.env` | 网关/镜像/路径等部署绑定，不包含SMTP密码；权限0600 |
| `deploy/compose.website.yml`、`compose.gateway.yml` | 本版审查后的部署模型 |
| `deploy/caddy/shouban-alb-http.caddy` | 本版正式网关配置 |
| `deploy/caddy/shouban-maintenance.caddy` | 首发和升级失败时的维护配置 |
| `release.json` | 本版配置/模型/镜像的绑定和 SHA-256；不是秘密文件内容副本 |

`deploy/compose.env.example` 和 `.env.example` 只列配置名称。填写前逐项取得事实；不得用样例、旧证明或虚构邮箱让门禁通过。正式电话、邮箱、地址、备案号仍待公司确认，本PR不填充。

## 3. 上线前必须关闭的外部事项

- 核验 sbrz.com.cn 本身的备案/接入状态及主办单位。用户说明两个公司名称为同一公司，仍需核对名称关联与对外披露，不能根据账户中一次搜索无结果认定未备案。
- 确认 EdgeOne 或等效防护及费用。联系 POST 速率策略沿用仓库方案5次/10分钟、触发保持30分钟；不同边缘节点计数不应宣称为全网严格额度。三个动态路径旁路缓存并验证源站无法绕过防护。
- 真实SMTP中继/收件/权利邮箱、MFA和最小权限、处理位置、邮件删除/回收站/备份到期、应用与网关日志时间留存、运维责任和当前版本证明。
- 取得可靠资源基线、至少10GiB Docker可用空间和现有业务容量余量；preflight瞬时内存阈值不是7天峰值证明。
- 备份当前及候选镜像、同版配置/模型和ALB规则记录，完成维护及版本回退演练。备份加密和访问权限不能只由文件hash代替。

DNS只指向批准后的正式入口；使用边缘时指向其分配CNAME而不是猜测ECS地址。两段HTTPS均验证证书链/域名/续期，不使用跳过证书校验。ALB只新增官网精确Host规则、SNI证书和专属组，不覆盖旧默认规则或默认证书。回源保护只作用官网Host，不全局收紧共享ALB。ECS应用3000不开放；网关私网端口只允许实际ALB数据/健康来源，同时验证Docker转发链。

## 4. 构建与部署准备

在受信任CI构建最终通过main检查的完整SHA。构建只注入公开Origin和SHA，运行秘密不进入构建。当前Quality工作流只构建 `.invalid` 隔离夹具，不推送生产镜像，不部署。

```sh
set -eu
set +x
: "${RELEASE_SHA:?}" "${REGISTRY_REPO:?}" "${GATEWAY_REGISTRY_REPO:?}" "${SITE_ORIGIN:?}"
test "$(git rev-parse HEAD)" = "$RELEASE_SHA"
test -z "$(git status --porcelain)"
npm ci
npm run typecheck
npm test
npm audit
NEXT_PUBLIC_SITE_URL="$SITE_ORIGIN" npm run build
docker buildx build --pull --platform linux/amd64 -f deploy/Dockerfile \
  --build-arg NEXT_PUBLIC_SITE_URL="$SITE_ORIGIN" --build-arg BUILD_SHA="$RELEASE_SHA" \
  --tag "$REGISTRY_REPO:$RELEASE_SHA" --metadata-file image-metadata.json --push .
docker buildx build --pull --platform linux/amd64 -f deploy/gateway.Dockerfile \
  --tag "$GATEWAY_REGISTRY_REPO:$RELEASE_SHA" --metadata-file gateway-image-metadata.json --push .
```

记录两个metadata文件的 `containerimage.digest`，分别绑定网站和派生网关，使用 `registry/repository@sha256:<64位摘要>`，不用latest或仅SHA样式tag。Caddy基础采用已验证的固定digest；变更基础镜像/Caddy版本后重跑隔离测试。registry认证由批准发布身份提供，命令/工单不写凭证。

目标主机先拉取批准的两个digest，准备版本包和0600 runtime文件。`SHOUBAN_TRUSTED_PROXY_CIDRS` 为空格分隔的真实ALB来源；不能把CI网段当生产值。将runtime、compose.env、两个manifest和选定Caddy配置的文件 SHA-256 记入release.json，再保护文件，校验后不得替换。

## 5. SMTP探针、快照和真实门禁

无参数或 `--dry-run` 不读取SMTP配置、不发送；可在无网络容器中验证打包可用性：

```sh
docker run --rm --network none --entrypoint node "$SHOUBAN_IMAGE" \
  /app/scripts/deployment/smtp-probe.mjs
```

真实投递是单独获批的生产动作；只生成随机probe ID和固定合成内容，不接收正文、目标邮箱或主题参数，目标仅来自受保护runtime配置。真实探针必须通过批准的SMTP/DNS出站网络：

```sh
docker run --rm --network "$SHOUBAN_PROXY_NETWORK" \
  --env-file "$SHOUBAN_RUNTIME_ENV_FILE" \
  --env NODE_OPTIONS= --env NODE_PATH= --env LD_PRELOAD= --env LD_LIBRARY_PATH= \
  --entrypoint node "$SHOUBAN_IMAGE" \
  /app/scripts/deployment/smtp-probe.mjs --send --confirm synthetic-only
```

`SMTP_PROBE_ACCEPTED`仅表示中继接受，仍需人工核对入箱并清理收件、已发送、回收站、可恢复项和受控副本。超时/失败不证明未投递；先按probe ID核对再重试。测试不使用生产SMTP，本次不执行发送。

先完成真实服务、权限、删除和防护证据，再计算公共快照：

```sh
node --env-file="$SHOUBAN_RUNTIME_ENV_FILE" scripts/privacy-print-snapshot.mjs
```

该命令仅输出公共快照hash。授权负责人在受控记录中将当前服务版本、正式Origin、快照与证明绑定，不能照抄CI或上一版本。然后检查候选镜像：

```sh
docker run --rm --network none --env-file "$SHOUBAN_RUNTIME_ENV_FILE" \
  --env NODE_OPTIONS= --env NODE_PATH= --env LD_PRELOAD= --env LD_LIBRARY_PATH= \
  --entrypoint node "$SHOUBAN_IMAGE" /app/scripts/privacy-release-check.mjs
docker run --rm --network none --env-file "$SHOUBAN_RUNTIME_ENV_FILE" \
  --env NODE_OPTIONS= --env NODE_PATH= --env LD_PRELOAD= --env LD_LIBRARY_PATH= \
  --entrypoint node "$SHOUBAN_IMAGE" /app/scripts/deployment/check-built-site-origin.mjs
```

独立检查入口不会启动HTTP服务器；生产网站仍必须使用默认entrypoint。build Origin、runtime Origin和域名必须一致；域名变化必须重新构建。默认入口不允许“先静态上线、以后补证明”。

## 6. 只读preflight和私网启动

将 `deploy/compose.env.example` 中名称的已批准值以环境变量及受保护compose.env绑定；工具不把该文件作为shell脚本source。设置 `COMPOSE_ENV_FILE` 及固定 `COMPOSE_PROJECT_NAME=shouban-prod`，`RELEASE_DIR` 是当前版本根目录。

```sh
cd "$RELEASE_DIR"
sh scripts/deployment/preflight.sh --model-only
```

model-only只检查文件/配置模型，不证明主机就绪。检查拒绝不完整digest、不安全路径/权限/hash、意外服务/网络/挂载/入口、网站端口或错误网关私网绑定；错误只输出固定码，不输出完整Compose JSON、环境值或docker错误。

获批窗口才可创建专网；存在同名网时先核对用途/成员，不直接复用。启动官网候选及独立维护网关，不改旧代理和旧服务：

```sh
dc() {
  docker compose --project-name shouban-prod --env-file "$COMPOSE_ENV_FILE" \
    -f "$RELEASE_DIR/deploy/compose.website.yml" \
    -f "$RELEASE_DIR/deploy/compose.gateway.yml" "$@"
}
dc config --quiet
dc up -d --no-build --no-deps --pull never --wait --wait-timeout 180 website
# gateway配置应先指向已签入发布记录的维护模板
dc up -d --no-build --no-deps --pull never --wait --wait-timeout 180 gateway
sh scripts/deployment/preflight.sh
```

完整preflight必须看到现有助手健康、网站/独立网关健康、批准专网的完整成员白名单及实际绑定，并核对资源阈值。检查脚本不创建网络、不启动/重载/删除容器、不调整防火墙。正式配置与维护配置应各自有独立版本记录和hash；不能检查一种配置后临时替换另一种。

## 7. 候选验收与切流

在获准候选访问路径中先启用正式网关配置，配置版本和hash必须同步更新至当前描述记录。保留SNI/Host进行预DNS验收：

```sh
ACCEPTANCE_MODE=pre-dns sh scripts/deployment/acceptance.sh
```

该模式用 `ALB_DNS_NAME` 的 `curl --connect-to`，不会写DNS，不使用 `--insecure`。公开入口验收：

```sh
ACCEPTANCE_MODE=public sh scripts/deployment/acceptance.sh
```

两模式均只GET/HEAD，不提交联系表单、不发送邮件。应验根页200、联系/隐私200、API GET405，三路由private/no-store，以及HTTP跳转到精确规范HTTPS地址，所有请求有超时。完成回源限制后普通公网直接ALB访问应拒绝，此时预DNS200检查不再适用，需使用获准候选出口。

独立验收清单仍必须记录：边缘限频阈值和不回源、源站防绕过、16KiB/流式边界、真实投递/清理、TLS续期、日志时间删除和旧网站/助手/管理入口/长连接回归。脚本成功不自动勾选这些外部事实。保持官网专属Host规则，不将根域解析到未知入口。切流后观察发布窗口和24小时，资源峰值结论需完整周期。

## 8. 回滚描述与CLI

`rollback-plan.mjs` 保留旧API的输入错误兼容，但旧的孤立镜像参数不能构成可执行回滚；必须使用完整版本描述。CLI默认只校验并计划，不执行Docker：

```sh
node scripts/deployment/rollback.mjs --descriptor "$PREVIOUS_RELEASE_DESCRIPTOR"
```

descriptor schema v1 必须包含 `schemaVersion`、`project`、`releaseId`、`mode`、`siteOrigin`、`siteDomain`、`proxyNetwork`、`privateBindIp`、`gatewayPort`、`albDnsName`、`trustedProxyCidrs`、`gatewayImage`；website模式还需要 `websiteImage`。`files` 包含 `composeEnv`、`websiteManifest`、`gatewayManifest`、`gatewayConfig`，website模式另有 `runtimeEnv`；每项是 `{path, sha256}`，所有路径在该版本目录内。真实值和摘要从批准记录生成，不复制本页占位符作为配置。

`mode=maintenance`不需要websiteImage或runtimeEnv，Compose只加载独立gateway manifest；无需编造SMTP/隐私配置。`mode=website`校验同版runtime/Origin/版本证明，并恢复成组网站和网关。拒绝符号链接、版本路径逃逸、权限/hash错误、可变镜像及不匹配的compose绑定。描述和hash防误选，不能替代对批准配置内容的审查。

只有操作员已获准执行，才添加显式apply：

```sh
node scripts/deployment/rollback.mjs --descriptor "$PREVIOUS_RELEASE_DESCRIPTOR" --apply
```

apply不使用shell/eval，不继承任意Compose覆盖变量，固定本机Docker、项目名、版本文件和目标服务；先静默验证resolved模型，website模式先在无网络容器中执行真实发布/Origin门禁，再up指定服务并等待健康。失败立即非零，人工核对维护入口与旧业务。不会修改ALB/DNS/证书/SG，不执行 `docker compose down`、全局prune或其他项目清理。

### 首发

不存在上一版官网。提前隔离验证并保存 `mode=maintenance` 描述；失败时apply维护记录，只替换官网gateway，业务响应503/no-store。保留官网Host路由和证书，避免缓存DNS落入旧默认业务；不能删除Host规则或依赖unhealthy作为回滚。维护模式的配置检查通过不表示网站可以开放。

### 后续版本

先维护，再选出上一版整组digest、受保护runtime路径/文件SHA-256、compose环境、manifest和网关配置；默认plan核对后apply。旧版本仍须真实门禁有效，不能只退镜像继续使用新证明。应用回滚不回滚已投递邮件，探针/咨询记录按既定流程管理。

## 9. CI证明范围

Quality对main、codex分支push和PR执行检查，以便先取得分支CI再创建草稿PR；它没有deploy、SSH、云API、镜像push或真实SMTP动作。CI覆盖原716项回归和新增工具行为、两manifest模型、固定Caddy语法、非root只读网关、真实隔离网络下的Host/来源限制、HTTPS转发头、no-store、16KiB拒绝、维护503及日志脱敏。SMTP测试只mock和本地合成网络，镜像探针只dry-run且network none。

CI不代表真实备案、域名/HTTPS、SMTP投递、边缘规则、资源峰值、日志删除或恢复演练通过。这些事项关闭前仍为“修复后部署”，不能宣称已经上线。
