# 实现报告：画一个笑脸

- 工作项：`wi-t1000102`
- 阶段：implementation（revision 2）
- 应用类型：`simple-frontend`（Vite + React 单页应用，无服务端、无持久化、无认证）
- 需求基线：`docs/wi-t1000102/requirements.md`（sha256:1a3d70f4f7222686ad708d0453100a00373cf2a94d61c1e7587c89181e7d4d27）
- 设计基线：`docs/wi-t1000102/architecture-baseline.md`（sha256:2faf201c723ceb2623a73a528a0c9a4c60022e49f2cb496ea08d5fe0d2447f58）
- 实现日期：2026-10-15

## 1. 变更概述

新建一个可在桌面浏览器中直接使用的单页绘图工具，完成「画一个笑脸」这一业务目标：打开页面即可看到画布；点击「生成笑脸」一键得到标准笑脸；或按住指针自由绘制笑脸；可切换笔触颜色与粗细，可撤销、清空，并把结果导出为 PNG 图片。

变更性质为新建应用（工作区此前仅有 LICENSE、README 与需求/设计文档，无既有业务行为、业务数据或对外契约需要保持）。

## 2. 代码结构与设计一致性

实现严格按 `architecture-baseline.md` 第 2 节的模块责任划分，调用方向为「页面组件 → 功能模块 → 画布表面」：

| 设计模块 | 实现文件 | 承担的职责与事实归属 |
| --- | --- | --- |
| 绘图表面模块（画布） | `src/modules/drawing.ts` | 画布内容模型（`DrawingSnapshot` + `Stroke`）与唯一渲染出口（`renderSnapshot` / `paintStroke`）：背景铺底、逐笔重绘、段间不连线、单点渲染为圆点 |
| 操作历史模块 | `src/modules/history.ts` | 撤销单位与撤销历史的唯一持有者：`strokeEntry`（一笔）与 `replacedContentEntry`（一次内容替换），`undo` 在无历史时原样返回快照 |
| 笔触配置模块 | `src/modules/brushConfig.ts` | 当前颜色与粗细档位的唯一持有者：5 个颜色预设、细/中/粗三档，默认黑色中档 |
| 笑脸生成模块 | `src/modules/smiley.ts` | 按画布尺寸计算几何（脸部轮廓圆、两只眼睛、向上弯曲的嘴部弧），产出三笔图形描述，无状态 |
| 导出模块 | `src/modules/exporter.ts` | 一次性读取当前画布并编码 PNG、触发浏览器下载，文件名含 `smiley` 与时间戳 |
| 工作区装配组件 | `src/App.tsx` | 组合画布与工具栏，编排生成 / 撤销 / 清空 / 导出动作，持有画布内容快照与指针输入语义 |
| 页面入口与样式 | `src/main.tsx`、`src/styles.css`、`index.html` | 挂载根组件、页面骨架与视觉样式 |
| 工程配置 | `package.json`、`vite.config.ts`、`tsconfig.json` | Vite + React + TypeScript + Vitest 构建与检查配置 |

落笔输入语义（对应设计「页面与交互边界」）实现于 `src/App.tsx:150-174` 与 `src/modules/strokeBuilder.ts`：按下开始一笔、移动持续补充、抬起结束一笔；指针移出画布范围时不再产生新笔迹，移回画布后另起一段继续绘制，不在离开与返回位置之间补线。起笔时固定当前笔触配置（`src/modules/strokeBuilder.ts` 的 `begin`），绘制过程中改配置不会造成半笔变色或半笔变粗。

## 3. 验收条件与实现映射

| AC | 实现位置 | 开发自检结论 | 需 QA 验证的部分 |
| --- | --- | --- | --- |
| AC-01 打开页面显示可绘制的画布 | `src/App.tsx:264-276`（常驻 canvas，挂载后立即 `renderSnapshot` 铺底，`src/App.tsx:80-83`） | 已实现 | 在真实浏览器中打开页面观察绘图区与是否存在错误提示 |
| AC-02 一键生成标准笑脸 | `src/App.tsx:85-94` + `src/modules/smiley.ts`（轮廓 + 两段眼睛 + 向上弯嘴部弧，共三笔） | 单测覆盖几何构成、对称性、嘴部向上弯曲与画布内可见 | 点击后画布实际呈现可辨认笑脸 |
| AC-03 自由绘制连续笔迹 | `src/App.tsx:129-194` + `src/modules/strokeBuilder.ts` | 单测覆盖落笔聚合、多段不补线、单点轨迹 | 真实指针拖动下的实时笔迹与连续性 |
| AC-04 调整笔触颜色 | `src/App.tsx:212-230`、`src/modules/brushConfig.ts` | 单测覆盖起笔固定配置（改配置不影响已画笔迹） | 切换后新笔迹颜色生效的视觉验证 |
| AC-05 调整笔触粗细 | `src/App.tsx:232-249`、`src/modules/brushConfig.ts` | 同上 | 切换后新笔迹粗细生效的视觉验证 |
| AC-06 撤销最近一次绘制 | `src/App.tsx:96-106`、`src/modules/history.ts` | 单测覆盖按序撤销、保留其余内容、撤销生成笑脸恢复替换前内容 | 真实点击撤销后画面变化 |
| AC-07 清空画布 | `src/App.tsx:108-115`、`src/modules/drawing.ts`（`replaceStrokes`） | 单测覆盖整体替换为空 | 真实点击清空后画面为空白 |
| AC-08 导出图片 | `src/App.tsx:117-127`、`src/modules/exporter.ts` | 单测覆盖导出文件名（`smiley` 前缀 + 时间戳 + `.png`） | 下载得到的 PNG 文件及其内容与画布一致 |
| AC-09 无可撤销内容时撤销不报错 | `src/App.tsx:96-106`（`undo` 返回同一快照时直接返回，不设置错误消息） | 单测覆盖空历史撤销不抛错且画布不变 | 空白画布点击撤销后的页面状态 |

「撤销」与「清空」按钮始终保持可点击（不置灰），动作在无内容时按无副作用处理，以保证 AC-09 的验证动作可以直接执行且不出现错误提示。清空与生成笑脸都登记为一次可撤销的内容替换，避免误操作导致内容丢失（需求 3.5 推荐基线）。

## 4. 开发验证证据

工作目录：`/Users/kingdee/lingeebuild-beta/workspaces/06f24a38bb30f38f63de62c426bac2fd/tasks/.lingee-task-worktrees/wi-t1000102`

| checkId | 命令 | 状态 | 退出码 | 证据 |
| --- | --- | --- | --- | --- |
| typecheck | `npm run typecheck`（`tsc --noEmit`，strict + noUnusedLocals） | passed | 0 | 无类型错误输出 |
| unit-test | `npm test`（`vitest run`） | passed | 0 | 5 个测试文件 / 30 个测试全部通过 |
| build | `npm run build`（`vite build`） | passed | 0 | 产出 `dist/index.html`、`dist/assets/index-BBYiydPw.css`、`dist/assets/index-BnxsB3ot.js` |
| dev-preview | `npm run dev -- --port 0`（注册后台作业） | running（仅预览入口） | - | 预览地址 http://127.0.0.1:62298/ |

单元测试覆盖（均为纯逻辑单元测试，不启动浏览器与 HTTP 服务）：

- `tests/drawing.test.ts`：快照内容变换（追加 / 移除 / 替换 / 空判断）、深拷贝隔离、渲染顺序（背景铺底先于描边）、多段不补线、单点圆点渲染。
- `tests/strokeBuilder.test.ts`：落笔聚合、起笔固定笔触配置、离开画布后另起一段不补线、未按下不产生笔迹、连续两笔相互独立。
- `tests/history.test.ts`：按序撤销保留其余内容、空历史撤销不报错且快照不变、撤销生成笑脸恢复替换前内容、替换记录持有内容副本。
- `tests/smiley.test.ts`：脸部轮廓居中含于画布内、两眼对称位于脸部上半、嘴部弧两端高于中间（向上弯曲）、按画布尺寸等比缩放、三笔内容与闭合点序列、所有点落在画布范围内、可注入标识生成器。
- `tests/exporter.test.ts`：导出文件名格式与时间戳唯一性。

## 5. 明确未覆盖的验证（留给 QA）

本阶段不执行浏览器端交互与端到端验收，以下结论**尚未验证**，不得据本报告认为已通过：

- AC-01/AC-02/AC-03/AC-06/AC-07/AC-09 的真实页面渲染与指针交互结果；
- AC-04/AC-05 的视觉样式效果；
- AC-08 的真实下载行为、PNG 格式与图片内容与画布一致性；
- 桌面分辨率下工具栏与画布完整可见可操作、主流浏览器兼容性（需求 4 的推荐基线）。

## 6. 遗留风险

- 画布内部尺寸固定为 1024×1024 像素，页面按 1:1 比例自适应显示；导出的 PNG 为该内部尺寸。在高分辨率显示器上显示为缩放结果，导出图仍为 1024×1024。
- 画布内容与撤销历史只存在于页面内存，刷新后不保留；这与需求「不使用账号体系、不向服务端上传绘制内容」一致，但意味着刷新即清空。
- 单次点击（未拖动）会生成一个圆点笔迹；这是渲染模型对单点轨迹的定义，属于设计决定而非缺陷。
- 导出依赖浏览器 `HTMLCanvasElement.toBlob`；编码失败时页面通过状态栏提示「导出失败：…」，不阻断其它动作。