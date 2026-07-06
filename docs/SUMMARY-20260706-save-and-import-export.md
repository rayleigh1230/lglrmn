# 存档系统(阶段1) + 方案markdown导入/导出 — 工作总结

> 日期：2026-07-06
> 范围：本地存档系统(阶段1) + 强化页方案导入/导出 + 分享码逆向调查(已闭环)

## 一、完成的两大功能

### A. 本地存档系统（阶段1）

**架构**：一个存档 = 所有船配置的整体快照（非 per-ship）。启动→首页 loadouts(存档列表)→激活存档→选船→改配置→保存写回激活存档。

**数据结构**：
- `ShipConfig` = `{ enhanceLevels, peakLevel, enabledSlots }`（单船完整配置）
- `Loadout` = `{ id, name, createdAt, updatedAt, ships: Record<shipId, ShipConfig> }`（整套快照）
- `LoadoutRepository` 接口（为阶段2云开发预留同接口）

**新增文件（5）**：
- `state/loadout/types.ts` — ShipConfig/Loadout/LoadoutRepository/LocalStoreShape
- `state/loadout/localRepo.ts` — Taro.getStorageSync/setStorageSync 实现
- `state/loadoutStore.tsx` — 存档 Context（list/active/create/switch/rename/delete/saveActive）
- `state/useLoadout.ts` — 当前激活存档快捷 hook
- `pages/loadouts/index.tsx` + `.css` — 存档管理页（首页）

**改动文件（5）**：
- `state/enhanceStore.tsx` — store 从 `Record<shipId, EnhanceLevels>` 扩为 `Record<shipId, ShipConfig>`；新增 getShipConfig/setPeakLevel/setEnabledSlots/hydrateFromShips/snapshotAll；对外旧接口不变
- `pages/blueprint-design/index.tsx` — peakLevel/enabledSlots 提升到全局 store；新增保存按钮；FAB 去掉 URL 参数
- `pages/enhance/index.tsx` — peakLevel/enabledSlots 改读全局 store；保存按钮移至蓝图页；导入/导出实装
- `app.ts` — 嵌套 Provider（LoadoutProvider 外层 + EnhanceStateProvider 内层 + EnhanceHydrator 首次启动 hydrate）
- `app.config.ts` — pages 首位加 `pages/loadouts/index`

### B. 强化页方案 markdown 导入/导出

**背景**：游戏16字符分享码经9轮frida探针+6样本密码分析+信息论验证，**铁证确认是服务器端编解码**（客户端无算法，连dev模式都走服务器协议；96bit装不下任何完整加点方案），本地解码不可行。改用游戏「复制方案」生成的markdown文本格式。

**新增文件（2）**：
- `data/schemeMarkdown.ts` — 解析/导出核心（`parseMarkdown`/`resolveScheme`/`exportMarkdown`/`buildNameIndex`）
- `components/SchemeImportSheet/index.tsx` + `.css` — 导入浮窗

**解析链路**：`###船名 / ##系统名 / #强化名 等级` → 严格按`(系统名+强化名)`查 `resolveEnhanceSystem` 输出构建的反查表 → `enhanceId`。重名(同系统内多名)全赋同level。

**装配不符处理**（按用户确认的设计）：
- 解析时检测方案涉及的切换组系统是否当前未装配
- 浮窗显示橙色警告 + 两按钮：
  - 「仅加点」：只写强化加点，装配/巅峰不动
  - 「对齐并应用」：**先重置系统装配+强化/调校加点到初始默认状态，再按方案写入**（确定性，不是在当前状态打补丁）。巅峰等级不动。
- 对齐推导：方案涉及的组按方案（同组互斥），方案没涉及的组回到初始默认成员

**剪贴板交互**（修复 Taro H5 缺陷）：
- Taro H5 的 `getClipboardData` 只读 localStorage，读不到系统剪贴板 → 改用 `navigator.clipboard.readText()`
- 导出端 `setClipboardData` 会强制弹 Toast → 改用 `navigator.clipboard.writeText()`
- weapp 端保留 Taro API（小程序端读真正系统剪贴板）

## 二、验证

### 自动验证
- ✅ editor 类型检查零新增错误（仅2处预存：EnhanceTree onMouseDown、ship-list shipWhitelist）
- ✅ H5 build 编译通过

### 端到端验证（天枢级80801金标准）
- markdown解析对照服务器科技串：20项完美匹配，0多余0错误0歧义（维修槽optIdx20/调校/巅峰不在markdown，正常）
- 装配冲突检测：方案用北斗II型(未装配)而当前装I型 → 正确检测+对齐后启用II型排I型
- 对齐重置语义：用户改了装配+加了点，方案只含部分系统 → 对齐后方案没提的组回到初始默认成员，旧加点清空，巅峰不动

## 三、分享码调查结论（已闭环，存档备查）

经9轮frida实时探针+6个真实样本(含天枢级金标准)：
1. **信息论铁证**：16字符base62=96bit，装不下完整加点（天枢147强化项需441+bit）
2. **客户端无编解码函数**（三轮穷举搜索）
3. **连dev模式都走服务器协议**（`insert_dev_env_share_code` 也调 `BpEnhanceSysSchemeBatGetInfoByShareCode`）
4. **服务器返回科技串**（内存dump实证，项目`parseTechString`能100%解析）
5. **码是服务器存档引用**（含user_id+time+存档ID的加密/哈希）

第三方小程序能用短码：必然走「后端登录游戏账号+代理官方协议`GET_INFO_BY_SHARE_CODE`(3204)」路径，非本地解码。

## 四、改动文件清单（共14个）

**新增（9）**：
- `packages/editor/src/state/loadout/types.ts`
- `packages/editor/src/state/loadout/localRepo.ts`
- `packages/editor/src/state/loadoutStore.tsx`
- `packages/editor/src/state/useLoadout.ts`
- `packages/editor/src/pages/loadouts/index.tsx` + `index.css`
- `packages/editor/src/data/schemeMarkdown.ts`
- `packages/editor/src/components/SchemeImportSheet/index.tsx` + `index.css`
- `data/client/tools/hook_share_code.py`（frida hook脚本，备用）
- `data/client/tools/hook_timed.py`（定时版hook，备用）

**改动（7）**：
- `packages/editor/src/state/enhanceStore.tsx`
- `packages/editor/src/pages/blueprint-design/index.tsx` + `index.css`
- `packages/editor/src/pages/enhance/index.tsx`
- `packages/editor/src/app.ts`
- `packages/editor/src/app.config.ts`
- `docs/HANDOVER-20260706.md`（第五节更新）

## 五、阶段2待办（不在本轮）

- 云开发（CloudRepo 同接口、wx.cloud登录、公开展示区）
- 舰队组建页 / `simulate()` 接入
- 自动保存（当前手动）

## 六、手动验证清单（建议跑一遍）

1. 启动 → 见默认存档 → 进 → 选船 → 蓝图页改巅峰/装配 → 强化页加点 → 返回 → 蓝图页点保存 → 回 loadouts 看存档已更新
2. 新建第二存档 → 切换 → 确认船配置随之切换
3. 强化页「导出」→ 剪贴板含 markdown → 「导入」→ 从剪贴板读取 → 解析预览 → 应用 → 加点还原
4. 导入含未装配系统的方案 → 浮窗显示警告 → 「对齐并应用」→ 装配切换+加点写入
