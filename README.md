# 星际猎人（无尽的拉格朗日）交战模拟器

一个尽量复刻真实战报的舰队交战仿真引擎，目标平台为微信小程序。

## 设计哲学

**"骨架全量容纳，MVP 最小激活"** —— 引擎按最终完整机制设计接口（网格拓扑/舰载机/反导/子系统摧毁），但每阶段只实现最小子集，逐公式用真实战报校准后再激活下一层。

- ✅ 引擎核心库**平台无关**（纯 TypeScript），可被 Node / 小程序 / Web 任意外壳调用
- ✅ **断言 + 事件日志双管齐下**验证：每个公式既有测试断言，又能 dump 完整事件流人工核对
- ✅ **离散事件仿真（DES）**：每个武器系统是独立定时器，事件驱动推进

## 目录结构

```
战斗模拟器/
├─ packages/
│  └─ engine/                 # 纯逻辑仿真引擎（@lagrange/engine）
│     ├─ src/
│     │  ├─ types/            # 数据契约（Cell/Ship/Weapon/Event）
│     │  ├─ topology/         # 战场网格拓扑关系判定
│     │  ├─ core/             # RNG(可复现) + Scheduler + Simulator + Config
│     │  ├─ model/            # RuntimeShip/RuntimeWeapon 运行时状态
│     │  ├─ phases/           # 结算阶段（目标→拦截→命中→暴击→伤害→摧毁）
│     │  └─ index.ts          # 公共 API
│     └─ tests/               # 35 个断言测试 + FG300实测回归 + 事件日志dump
├─ docs/
│  ├─ 01-战斗机制研究文档.md   # 机制调研（公式来源）
│  └─ 02-采样测试方案.md       # 黑盒参数标定方案 + 首轮实测结论
└─ package.json               # monorepo (npm workspaces)
```

## 已校准的机制

| 机制 | 公式 | 校准状态 |
|------|------|---------|
| 实弹伤害 | `max(dph − resistance, dph×10%)` | ✅ 实测校准（保底10%） |
| 能量伤害 | `dph × (1 − shield)` | ⏳ 待采样 |
| 命中率 | `base × (1 + bonus − dodge)`，夹[10%,95%] | ✅ 实测验证（误差1.2pp） |
| 暴击 | 无基础暴击率，需明确数值；倍率默认×2 | ✅ 模型确定 |
| 攻击循环 | 持续N秒打M发，间隔=fireDuration/shots；含锁定时间 | ✅ 实测校准 |

## 开发

```bash
npm install              # 安装依赖
npm run build            # 编译引擎
npm test                 # 运行全部测试（35个）
npm run test:dump -w @lagrange/engine   # 跑FG300场景打印事件日志
```

## 技术栈

- TypeScript（严格模式）
- 离散事件仿真内核
- Node.js 内置测试运行器 + tsx
- npm workspaces (monorepo)
