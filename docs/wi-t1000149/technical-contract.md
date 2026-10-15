# API 技术契约（费用报销单）

本文件是前后端共同遵守的字段级唯一来源：接口路径/方法、请求与响应字段、类型、可空性、错误约定、权限前置条件与幂等语义。架构说明见 `architecture-baseline.md`。

## 1. 通用约定

- Base URL：`/api`；请求与响应均为 JSON（附件上传为 `multipart/form-data`）。
- 认证：无（需求明确排除账号体系，D-01）；不存在认证头或用户前置条件。
- 字段命名：JSON 一律 camelCase；SQLite 列 snake_case；转换唯一 owner 是服务端 Repository 层，前端不接触列名。
- 金额：JSON 数值，单位「元」，最多两位小数且必须 > 0（明细）；服务端以整数「分」落库。日期：字符串 `YYYY-MM-DD`；时间戳：ISO-8601 字符串。
- 状态枚举：`draft` | `submitted`（业务文案「草稿/已提交」由前端映射）。
- 费用类别枚举（D-04，必填）：`travel` | `entertainment` | `office` | `transport` | `communication` | `training` | `other`（前端展示差旅费/招待费/办公费/交通费/通讯费/培训费/其他）。
- 成功响应直接返回资源对象或 `{ items: [...] }` 列表包装，不套统一 envelope。
- 错误响应固定形态（HTTP 语义状态码）：

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "保存失败：存在未通过校验的字段", "details": [ { "field": "title", "message": "报销事由为必填" } ] } }
```

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 请求体字段校验失败（含明细非法金额、类别枚举外值、表头必填缺失、事由超 200 字）；`details[].field` 指向表单字段 |
| 404 | `NOT_FOUND` | 单据 id 不存在；附件 id 不属于该单据 |
| 409 | `STATE_CONFLICT` | 状态机拒绝：已提交单据被编辑/更新/删除/再次提交，或对草稿执行撤回；C6/C8 的服务端表达 |

`STATE_CONFLICT` 一律不改变单据内容；重复提交不产生新单据（同一 id 再次提交仍 409，永不新建）。

## 2. 资源模型

### Expense（报销单）

| 字段 | 类型 | 可空 | 写 | 说明 |
| --- | --- | --- | --- | --- |
| id | integer | 否 | 只读 | 服务端主键 |
| number | string | 否 | 只读 | 唯一单号，`BX` + `yyyyMMdd` + 3 位当日序号（如 `BX20261015001`）；首次保存时服务端事务内生成（C1），此后不可变 |
| title | string | 否 | 读写 | 报销事由，必填，长度 1–200（C4/D-10） |
| applicant | string | 否 | 读写 | 报销人，必填，手工输入（D-01），无格式约束（去首尾空白后非空） |
| applicationDate | string (date) | 否 | 读写 | 申请日期，必填；新建表单初始值当天由前端预填（D-08），服务端只校验格式 |
| remark | string | 是 | 读写 | 备注，可选，无长度上限约定 |
| status | enum | 否 | 只读 | `draft`/`submitted`，仅能经 submit/withdraw 端点变化 |
| totalAmount | number | 否 | 只读 | 分→元换算后的合计，恒等于 items 金额之和（C2/N3，服务端每次保存/提交重算返回） |
| items | ExpenseItem[] | 否 | 读写 | 费用明细，整单替换语义；`[]` 允许（仅阻断提交，不阻断保存，C5） |
| createdAt / updatedAt | string (ISO) | 否 | 只读 | |

### ExpenseItem（费用明细）

| 字段 | 类型 | 可空 | 说明 |
| --- | --- | --- | --- |
| id | integer | 是 | 只读；响应中始终存在，请求中携带的值被忽略（整单替换重新分配） |
| expenseDate | string (date) | 否 | 费用日期，必填、合法日期 |
| category | enum | 否 | 费用类别，必填，见枚举表 |
| description | string | 是 | 用途说明，可选 |
| amount | number | 否 | 金额（元），必须 > 0，最多两位小数，非数字拒绝（C3）；违规请求整体 400，不落库 |

附件不进入 Expense 对象，经附件资源清单端点独立获取（见 §4）。

## 3. 报销单端点

| # | 方法与路径 | 语义 | 请求 | 成功响应 | 失败/幂等 |
| --- | --- | --- | --- | --- | --- |
| 1 | GET `/api/expenses` | 列表查询（FR-1） | Query：`status`（可选，`draft`/`submitted`，非法值 400）、`query`（可选，对 number/title/applicant 的包含匹配） | 200 `{ items: ExpenseSummary[] }`，按 updatedAt 降序（同值按 id 降序）；无分页；空数组=正常空态 | 过滤无结果返回空 items，不报错 |
| 2 | POST `/api/expenses` | 新建并保存草稿（FR-2/FR-5） | `{ title, applicant, applicationDate, remark?, items: ExpenseItemInput[] }` | 201 完整 Expense（含生成的 number、status=`draft`、服务端 totalAmount） | 表头必填缺失或明细非法 → 400 VALIDATION_ERROR（C4/C3/C5：草稿级校验=表头必填+已有明细合法；items 可为 `[]`） |
| 3 | GET `/api/expenses/{id}` | 单据详情（FR-1/J3） | - | 200 完整 Expense | 404 |
| 4 | PUT `/api/expenses/{id}` | 保存草稿（整单替换，FR-5/AD-3） | 同 #2 请求体 | 200 更新后完整 Expense（number 不变） | 状态为 `submitted` → 409（C6）；校验同 #2；明细事务内先删后插 |
| 5 | DELETE `/api/expenses/{id}` | 删除草稿（FR-6/C7） | - | 204 无响应体；级联删除明细与附件记录及文件 | 状态为 `submitted` → 409；前端负责二次确认弹窗，服务端不依赖确认参数 |
| 6 | POST `/api/expenses/{id}/submit` | 提交（T1，FR-5） | - | 200 完整 Expense（status=`submitted`） | 提交级校验（C5）：明细 ≥1 且表头完整 → 否则 400（明细为空提示语「请至少填写一条费用明细」由 details 承载）；已 `submitted` → 409（C8：幂等拒绝，不新建、不重复变更） |
| 7 | POST `/api/expenses/{id}/withdraw` | 撤回（T2，FR-6/D-06） | - | 200 完整 Expense（status=`draft`，number 不变） | 当前为 `draft` → 409 |

状态转换 #6/#7 的服务端实现：`UPDATE expense SET status=?, updated_at=? WHERE id=? AND status=?` 条件更新，0 行影响即 `STATE_CONFLICT`，保证并发下不会双写状态。`#4/#5/#6/#7` 均以单据存在为前置（否则 404）。

ExpenseSummary（列表行）字段：`id, number, title, applicant, applicationDate, totalAmount, status, updatedAt`——覆盖 FR-1 要求展示列。

## 4. 附件端点（复用 @commonapp/attachment，挂载于 `/api/expenses` 前缀）

模块自带路径形态为 `/{expenseId}/attachments` 及子路径；前端通过模块的 `AttachmentUploader` / `AttachmentList` 组件与 `AttachmentApiClient` 访问，不手工拼接 URL；下表为宿主需要保证的行为契约（供验收）：

| 能力 | 路径（模块定义） | 宿主约束 | 失败可见性 |
| --- | --- | --- | --- |
| 清单 | GET `/api/expenses/{id}/attachments` | 单据存在即可查看（含 `submitted`） | 404 |
| 上传 | POST `/api/expenses/{id}/attachments`（multipart） | `canAccess(upload)`：仅 `draft`；大小 ≤ `maxFileSize=10485760`（模块默认，D-05）；类型白名单 `png/jpg/jpeg/gif/webp/pdf` 由前端 accept 强制、宿主接入层在转发前校验扩展名，不符则拒绝且不落库不写盘 | 超限/类型不符 → 400/413 具体原因；单据已提交 → 403（模块 hooks 映射） |
| 下载 | 模块内置 download 路由 | `canAccess(download)`：单据存在即允许 | 404 |
| 删除 | DELETE `/api/expenses/{id}/attachments/{attachmentId}` | `canAccess(delete)`：仅 `draft`；文件与记录一并移除 | 不存在→404；已提交→403 |

- 模块 hooks 实现约定：`resolveUser` 返回固定匿名 `{ id: 0, name: '未登录用户' }`；`canAccess` 按上表单据状态判定（本应用无权限体系，403 仅表达「只读状态不可变更附件」）；`onLog` 不接入；分享链接与 `createPublicDownloadRoute`（GET `/api/public/attachments/download?token=...`）不挂载路由、UI 无入口。
- 附件随草稿保留、上传失败不产生残缺记录是模块自带验收行为，实现阶段以模块 install 验证清单复核。

## 5. 校验规则到端点的映射（服务端唯一权威）

| 需求规则 | 服务端落点 |
| --- | --- |
| C1 唯一单号 | POST `#2` 事务内 `expense_number_seq` 取当日序号 + UNIQUE(number) 兜底；PUT/撤回不重新生成；请求体不接受 number 字段（出现则忽略） |
| C2/N3 合计 | `#2/#4/#6` 响应中的 totalAmount；由 items 求和（分）换算，请求不接受客户端合计值 |
| C3 明细金额 | `#2/#4` 校验 `amount>0`、两位小数、数字类型 → 400 details |
| C4 表头必填 | `#2/#4/#6` title/applicant/applicationDate 非空校验 → 400 |
| C5 校验差异 | 保存（`#2/#4`）允许 items 空、仅表头校验；提交（`#6`）追加「明细 ≥1」 |
| C6 只读 | `#4/#5/#6` 对 `submitted` → 409；附件 upload/delete hooks → 403 |
| C7 删除约束 | `#5` 仅 `draft`；409 拒绝 `submitted` |
| C8 防重复提交 | `#6` 对 `submitted` → 409 幂等拒绝 |
| D-10 事由 200 字 | `#2/#4/#6` title 长度校验 → 400 |

## 6. 环境变量（服务端启动输入）

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `PORT` | 3000 | HTTP 监听 |
| `DB_PATH` | `./data/expense-reimbursement.db` | SQLite 文件（父目录自动创建） |
| `UPLOAD_DIR` | `./data/uploads` | 附件磁盘目录 |
| `APP_URL` | `http://localhost:3000` | 附件模块必填（分享 URL 拼接，UI 不使用） |
| `JWT_SECRET` | 内置开发默认值 | 附件 token 签名（本应用不开放分享路由） |

验收脚本必须用独立临时 `DB_PATH`/`UPLOAD_DIR` 与空闲 `PORT` 启动同一入口，禁止触碰默认交付库。
