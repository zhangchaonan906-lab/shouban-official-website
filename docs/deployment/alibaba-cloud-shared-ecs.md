# 阿里云 ECS 官网共享部署设计与操作手册

> 状态：仅架构与容器工程准备；本手册不表示已修改生产服务器、Caddy、DNS、证书或安全组，也不授权部署。生产域名、联系表单发布事实和业务负责人批准尚未确认。

## 1. 设计与实施计划

1. 保留 Next.js 现有隐私动态渲染、Cache-Control: private, no-store, max-age=0、联系 API 边界及 release:check。
2. 在 CI 使用 Node.js 24 LTS 构建 standalone 镜像；正式 SMTP 密钥和人工证明不进入构建。
3. 用独立 Compose 项目运行非 root 官网容器；不发布宿主机端口，并设置 CPU、内存、PID、临时缓存及容器日志上限。
4. 让官网只与 Caddy 共用新的专用 Docker bridge 网络，不加入飞书助手后端网或现有入口网。
5. 提供独立 Caddy 站点片段、只读部署前检查、无表单提交的验收脚本，以及逐版本镜像回滚步骤。
6. 由现有生产 Caddy 配置的负责人审查新增网络、导入路径和路由；本项目不覆盖或修改现有 Caddyfile。
7. 将资源基线、联系接口限频、合规发布事实和负责人批准列为上线门槛。

## 2. 只读拓扑核查摘要

以下仅为 2026-10-09 的结构性现场观察；不保存主机标识、公网 IP、实际域名、环境变量值、密钥或业务数据。

- 现有 Caddy 为 2.10.2，承载公网 TCP 80/443 与 UDP 443；同时连接现有 edge 与 backend 两个 bridge 网络。
- 飞书助手只连接 backend 网络；Caddy 通过 backend 访问现有助手上游。现有宿主机回环端口 127.0.0.1:3001 转发到助手容器端口 3000。
- 现有管理/Workbench 容器在 edge 网络；Caddy 也连接该网络。现有两个网络均不是 Docker internal 网络。
- 现有 Caddyfile 是从保留发布目录只读挂载；Caddy 的 /data、/config 使用具名卷。配置结构没有发现现成的站点目录 import；站点地址使用环境占位符。实际域名、ACME 发行方和证书文件未读取。
- 已有站点含多个按路径、HTTP 方法和请求头分类的 matcher，并反向代理到现有业务上游；没有发现显式 basic_auth、forward_auth、flush_interval、stream_timeout 或 transport 超时指令。配置 matcher 的具体值未读取；实际 WebSocket/长连接使用情况仍待业务负责人确认。
- 助手容器 healthy，配置了 30 秒间隔、5 秒超时、3 次重试；Caddy 正在运行但没有容器健康检查。二者均为 restart: always，且没有容器级 CPU、内存或 PID 上限。
- 助手、Caddy 和 Workbench 的 Docker 日志驱动均为 json-file，单文件上限 10 MiB、最多 3 个文件。这个大小轮转上限不等于 30 天留存策略。
- 同一时点 Docker 资源快照：助手约 151.9 MiB、12 个 PID；Caddy 约 55.0 MiB、9 个 PID；Workbench 约 131.7 MiB、8 个 PID。它们都是瞬时值，不代表高峰。
- 先前只读主机快照显示约 6.4 GiB MemAvailable、约 64 GB 可用磁盘、无 Swap，负载较低；没有可靠的连续 24 小时/7 天 CPU、内存、磁盘和网络峰值数据。不能把该快照当作容量证明。
- Caddy 访问日志配置结构包含 request/header 字段；由于不读取原始配置值，无法确认其过滤规则是否完整删除敏感头。上线官网前必须由 Caddy 负责人核对日志过滤。官网模板默认删除完整请求头、URI 和请求体字段。

实际配置摘要刻意不包含生产环境变量、证书、邮箱、Cookie、Token、请求内容或地址。

## 3. 目标拓扑

公网 HTTP/HTTPS
    |
    v
现有 Caddy（80/443；保留现有飞书助手和管理路由）
    ├── 现有 backend 网络 ── 飞书助手（不变）
    ├── 现有 edge 网络 ───── 管理/Workbench（不变）
    └── 新的专用 bridge ──── 官网容器 :3000
                                  └── 无宿主机端口映射

官网 Compose 只声明外部专用网络，不声明 ports，不加入助手 backend 或现有 edge 网络。Caddy 是该专用网络上唯一另一个成员。官网容器通过容器 DNS 别名 shouban-website:3000 接收反代流量；容器端口只在该网络内可达。

该网络和 Caddy 的连接必须在后续获批窗口中由现有飞书生产发布流程持久化；只用一次性 docker network connect 会在 Caddy 容器重建后丢失，不作为最终配置。

## 4. 官网容器边界和资源预算

| 边界 | 初始值 | 说明 |
|---|---:|---|
| Node.js | 24 LTS | 官方 Debian slim 多阶段镜像；宿主机不安装 Node |
| CPU | 1 vCPU | Compose 硬上限；不是已验证容量 |
| 内存 | 1536 MiB | Compose 硬上限并禁止额外 swap；需要监控后复核 |
| PID | 128 | 限制进程/线程数量 |
| 临时目录 | /tmp 64 MiB | tmpfs，无执行权限 |
| Next 图片/运行缓存 | 256 MiB | 独立 tmpfs；不与飞书数据共享 |
| 根文件系统 | 只读 | 仅 tmpfs 可写；无应用持久化数据卷 |
| Docker stdout/stderr | json-file 10 MiB × 3 | 每容器约 30 MiB 大小上限；不构成 30 天策略 |
| 镜像磁盘预留 | 至少 10 GiB Docker 可用空间 | 保留当前与前一不可变镜像用于回滚；不足则停止 |

Compose 没有给镜像层设置按服务的硬磁盘配额：只读根文件系统、tmpfs 和日志轮转限制官网运行期写入，镜像层仍占用宿主机共享 Docker 存储。每次发布前检查至少 10 GiB 可用空间并保留当前/前一镜像；空间不足即停止，镜像清理须另行人工批准，禁止自动 prune。

当前瞬时可用内存约 6.4 GiB，若官网达到 1.5 GiB 限额，算术上还剩约 4.9 GiB；但助手和 Caddy 未设置资源上限，且没有 7 天峰值，真实并发余量仍未知。发布前应在低流量窗口观察既有基线，并在上线后持续比较宿主机与容器指标。不得通过压力测试在生产机“证明容量”。

## 5. Caddy 接入与 Nginx 等效核验

Caddy 模板是单独文件 deploy/caddy/shouban-site.caddy，站点地址为 {$SHOUBAN_SITE_DOMAIN}。该占位符必须由业务负责人批准的正式域名替换/注入；不能假定仓库或历史环境中的任一域名已经授权。deploy/caddy/validate.Caddyfile 仅供 CI 语法验证，不是生产根配置。

生产 Caddyfile 当前为只读挂载且没有站点目录 import。未来必须由现有 Caddy 配置负责人基于新的保留发布目录，增量增加 import /etc/caddy/sites-enabled/*.caddy 并增加只读站点目录挂载、专用网络；不得覆盖原 Caddyfile、修改旧发布目录或遗漏原有业务路由。所有变更先在隔离环境用同版本 caddy validate，再由负责人安排窗口。

| 原 Nginx 验收项 | Caddy 方案 | 仍需实际验收 |
|---|---|---|
| TLS、证书续期和 HTTP→HTTPS | Caddy 自动 HTTPS；当前 Caddy /data 持久卷可保存证书状态 | 正式域名 DNS、80/443 可达、签发/续期、有效证书和 HTTP 跳转；发行方/挑战方式目前未核实 |
| proxy_pass 与上游端口 | 专用 Docker 网络上的 reverse_proxy shouban-website:3000，无宿主机应用端口 | 从 Caddy 容器验证解析和连通；确认不能通过其他共享网络访问飞书助手 |
| WebSocket/长连接 | Caddy reverse_proxy 支持 Upgrade；模板不设置有限流超时 | 业务负责人确认飞书助手协议与活跃长连接；Caddy reload/recreate 的现有连接影响需要窗口和回滚安排 |
| /api/contact 16 KiB 请求上限 | Caddy request_body 对 POST /api/contact 限为精确 16384 字节；应用已有自身请求校验 | 使用无个人信息、无 SMTP 的候选请求验证 413 与未到达邮件适配器；此 Caddy 指令在 2.10.x 文档标注为实验性，升级 Caddy 后必须重新验证 |
| /contact、/privacy、/api/contact 不缓存 | Next 现有 no-store 保留；Caddy 模板再次为三路由设置 deferred Cache-Control | 分别验证源站及边缘响应头、缓存命中状态，不能仅凭配置推断通过 |
| 请求体/凭据不入日志 | 模板 access log 删除 request>headers、request>uri、request>body 和原始 IP 字段 | 核对 Caddy 实际适配配置、Docker 日志内容和应用粗粒度日志；不执行或保存含请求值的命令输出 |
| 30 天日志删除 | Docker 按大小轮转保护磁盘；应用仅记录 requestId、结果码、状态、耗时 | 大小轮转不证明 30 天删除。必须另行核验现有日志平台/主机的时间留存与副本删除；未完成前不开放联系收集 |

Caddy 共享故障域包括配置导入错误、证书/域名冲突、专用网络缺失、反代上游不可达、Caddy 重载/重建以及宿主机资源争抢；这些情况可能影响飞书助手及管理入口。通过保留旧版本目录、仅增加单一站点文件、先健康启动官网容器、Caddy 语法校验、明确窗口、观察现有服务健康并准备恢复旧 Caddy 发布来降低风险，但无法消除共享代理/宿主机故障域。

Caddy 不承担联系接口公网限频。联系 API 必须在 EdgeOne 或经业务批准并实际验证的等效边缘防护中单独设置/验收 POST /api/contact 按 IP 限频和反滥用；本 PR 不把该能力标记为已启用。

## 6. 构建与发布门禁

- CI 使用 Node 24、npm ci 和多阶段 Docker build；生产 ECS 不执行 npm ci 或 next build。
- Docker 构建仅接收 NEXT_PUBLIC_SITE_URL（公开 Origin）及构建修订号，不接收 SMTP_*、人工证明、Cookie 或其他运行时密钥。构建时把实际 Origin 写入镜像内的非秘密标记文件。
- 运行时 NEXT_PUBLIC_SITE_URL 必须是精确 HTTPS Origin，且与镜像内构建 Origin 完全一致。域名变化时必须重新从 CI 构建镜像，不能只改运行时变量，否则 canonical/Sitemap 可能与构建产物不一致。
- CI 的 https://deployment-validation.invalid 仅是语法/容器测试夹具，缺少全部生产隐私事实和人工证明；CI 镜像不发布、不推送、不作为生产证明或候选镜像。
- 容器入口顺序为 npm run release:check → 构建 Origin 一致性校验 → exec node server.js。第一步失败时绝不启动 Next 服务器。不得用 node server.js 作为 Compose command、运维启动命令或验收绕过入口。
- npm start 原有 prestart 生命周期和 release:check 保留。/contact 与 /privacy 的 force-dynamic、revalidate=0 及现有 no-store 响应边界不得移除。
- CI 可验证门禁失败时容器快速退出；目前没有真实邮箱、隐私事实、EdgeOne 记录和人工证明，因此真实生产门禁成功、健康运行及真实邮件验收必须保持 BLOCKED。禁止使用虚构环境值让发布检查通过。

### 隔离 Docker 网络组件测试

CI 在临时 `--internal` Docker 网络中运行 Next.js 和 Caddy 2.10.2，不发布宿主机端口。组件测试仅通过 `docker run --entrypoint node ... server.js` 启动已构建 standalone 服务，目的是验证服务和 DNS/反代路径；这是显式隔离的 CI 组件测试，不是生产容器启动流程，不更改 Dockerfile 的 production `ENTRYPOINT`，也不向生产 Compose 添加入口覆盖。真实生产入口仍由独立 CI 测试验证 fail-closed。

测试客户端经 Docker DNS 请求 Caddy：根路径预期 200；联系 API 使用合成非个人信息请求并预期因缺少真实发布条件返回 503，不发送邮件。日志检查只读取该临时 Caddy 容器的 CI 合成日志，检查请求头、查询、请求体、Cookie、授权头、合成及实际临时客户端 IP 与脱敏字段都未保留；测试结束删除临时容器和网络。它证明模板在该版本、该隔离拓扑中的行为，不代表生产域名、TLS、EdgeOne 或真实合规验收通过。

## 7. 只读部署前检查与验收顺序

1. 飞书助手负责人批准共享主机、单独网络、Caddy 新增站点、资源上限、变更窗口、现场观察人与回滚负责人。
2. 取得连续 7 天基线：先查询现有阿里云 CloudMonitor/已安装 Agent；本次控制台未显示可靠 24 小时/7 天历史。若必须安装/启用系统指标 Agent，先另行批准，不在本 PR 操作。
3. 核对正式域名、备案/授权、A/AAAA 记录、Caddy 自动 HTTPS、证书数据持久化、现有域名无冲突。不得改 DNS 或证书直到获得单独授权。
4. 在受信任 CI 用正式公开 Origin 构建不可变镜像；构建产物记录 Git SHA、镜像 digest 和归档校验和。正式 SMTP/隐私/人工证明只注入受控运行时。不要使用 latest。
5. 通过部署前脚本只读检查 Docker/Compose 版本、Caddy 与助手状态、专用网络成员、官网镜像、Docker 磁盘余量和主机可用内存。阈值不满足即停止，不自动创建网络或释放磁盘。
6. 通过现有 Caddy 发布流程准备新保留版本：保留原配置/路由，添加专用网络和 Caddy import；在隔离配置中校验站点片段。负责人确认 Caddy reload/recreate 对现有长连接的影响。
7. 在运行时配置全部真实就绪事实后，由容器入口执行 release:check。任何非零退出都停止，不公开流量。
8. 先启动官网独立容器并等待健康检查，再启用 Caddy 站点。验收脚本只对页面和 API 执行 GET/HEAD，不提交表单、不发送邮件；检查 HTTPS、根页面健康、三路由 no-store 和应用无宿主机端口映射。
9. 另按边缘服务验收计划验证限频规则（包括阈值触发和未到达应用），不得以 Caddy no-store 或应用蜜罐替代边缘验收。
10. 观察助手健康、Caddy健康/日志、宿主机和官网容器 CPU/内存/磁盘/网络；至少观察发布窗口和后续 24 小时。7 天容量结论需等待完整周期数据。

脚本均为只读检查；脚本不会创建/删除网络、加载/拉取镜像、运行 Compose 服务、发出 POST、重载 Caddy 或修改主机配置。将脚本作为结构检查工具，不代表正式发布已经获批。

## 8. 回滚步骤

### 仅官网镜像/应用异常

1. 每次发布记录一条不可变的上一版发布描述：镜像必须为 `registry/repository@sha256:<64位摘要>`；同时记录该版运行时 env 文件的绝对版本路径及文件 SHA-256。env 文件内容仍是受保护秘密，不复制进描述记录或日志。
2. 回滚计划必须从同一条上一版发布描述选出镜像、运行时文件和文件摘要；返回的可执行参数以 `env SHOUBAN_IMAGE=<上一版 digest> SHOUBAN_RUNTIME_ENV_FILE=<上一版配置路径> SHOUBAN_PROXY_NETWORK=<专用网络> docker compose ...` 形式将这组三个值直接绑定到 Compose 命令，不能只返回未绑定配置的 Compose 参数，也不能依赖可变 `.env` 或当前发布的 env 文件。
3. 经负责人批准后，先对所选版本文件计算 SHA-256 并与发布描述比对；不一致、文件缺失或路径不是版本化绝对路径时停止。文件应由受控身份只读保存，校验后不要替换。
4. 停止推进新流量；不停止 Caddy、助手或 Workbench。用回滚计划中明确返回的环境值及 Compose 参数，只对官网服务执行单服务替换，不执行 `docker compose down`、全局 prune 或其他项目操作。
5. 等待官网健康检查通过；用 GET/HEAD 验证页面及三路由 no-store。
6. 记录当前/恢复镜像 digest、运行时配置摘要、状态码、健康状态、时间和负责人；不要记录 env 文件内容。

### Caddy 导入/网络导致反代异常

1. 由 Caddy/飞书助手负责人恢复前一个保留 Caddyfile/Compose 版本及其镜像/卷引用。
2. 用原有 Caddy 发布流程校验并恢复配置；reload/recreate 前确认旧 Caddy /data、/config 卷和现有 edge/backend 网络均保留。
3. 验证原飞书助手与管理入口，再验证官网路由。不要清理旧发布目录或证书卷。
4. 该回滚可能影响飞书助手和长连接，必须由业务负责人在批准窗口承担责任。

回滚执行命令属于未来生产变更，本次仅提供步骤，不运行。

## 9. 发布前置条件与费用

### 必须满足

- 飞书助手负责人书面批准共用 ECS、共享 Caddy 变更、专用网络、CPU 1 vCPU/内存 1.5 GiB 上限、观察窗口和回滚责任。
- 取得连续 7 天可靠负载基线，评估助手无资源上限的峰值余量。
- 确认正式 Origin、DNS/备案、证书方式与续期检查；网站域名未确认时不构建生产镜像。
- Caddy 站点 import、Docker 网络和日志过滤由现有配置负责人审查。
- 真实隐私事实、SMTP 投递链路、删除/留存、运营证明和 release:check 全部通过；不编造证明。
- 外部边缘的联系 POST 限频/反滥用、三路由不缓存和日志 30 天留存分别验收。
- 当前 Caddy 对长连接的实际影响、现有日志过滤和证书管理方式待负责人核实。

### 预计费用类型

若复用现有 ECS，预计无新增服务器购置费。可能增加现有按流量计费公网带宽的出站流量费用；镜像保存/传输占用磁盘；GitHub Actions runner 与产物存储可能产生用量费用。若改用 ACR、额外监控 Agent/服务、边缘限频/WAF 或扩容磁盘/带宽，需先核对现有资源与价目并获得批准；本设计不要求新购服务器，也不假定这些服务已存在。

## 10. 本次结论

该 ECS 在当前瞬时资源下具备条件性复用基础；推荐技术拓扑是独立 Node 24 官网容器 + Caddy + Caddy/官网专用网络，不与助手容器共享网络或数据目录。它不是“现在可以部署”的结论：没有 7 天容量基线、共享 Caddy 仍无健康检查、现有 Caddy 导入/日志过滤/证书与长连接行为未完全验证，且业务负责人、域名、边缘限频和真实发布证明均未批准或就绪。

因此，本 PR 只提供隔离实现、结构验证和后续操作方案；不进入生产部署验收，不执行任何阿里云变更。
