# dsh-ponytail

[![npm version](https://img.shields.io/npm/v/dsh-ponytail-skills)](https://www.npmjs.com/package/dsh-ponytail-skills)
[![GitHub release](https://img.shields.io/github/v/release/gongyijie85/dsh-ponytail)](https://github.com/gongyijie85/dsh-ponytail/releases)
[![CI](https://github.com/gongyijie85/dsh-ponytail/actions/workflows/ci.yml/badge.svg)](https://github.com/gongyijie85/dsh-ponytail/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<div align="center">

[English](README.en.md) | **简体中文**

</div>

把 [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)(~76k⭐ 的
"最懒资深工程师"代码风格)移植到 **DeepSeek Harness (DSH)** 的 Cordis 插件架构。

插件向 `ctx.skills` 注册表的 **host 层** 注册技能提供者,6 个技能随包分发
(`skills/<name>/SKILL.md`),无需任何用户配置。

> **非官方移植**:技能内容改编自 [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)(MIT, © DietrichGebert)。

## 快速上手

装好后对 agent 说 **"用 ponytail 模式写这段代码"**,或让模型在编码时自动
采用:YAGNI → 复用现有代码 → 标准库 → 原生平台能力 → 一行 → 最小代码。
支持 `lite` / `full`(默认)/ `ultra` 三档强度,`"stop ponytail"` 退出。

## 技能列表

| 技能 | 用途 |
| --- | --- |
| `ponytail` | 核心模式:强制"最懒但能用的方案",YAGNI → stdlib → 原生 → 一行 → 最小代码。支持 lite / full(默认)/ ultra 三档 |
| `ponytail-review` | 只针对过度工程的代码评审:每行一个发现(位置、删什么、用什么替代) |
| `ponytail-audit` | 全仓库过度工程审计(ponytail-review 的仓库版):排序输出"最大削减优先" |
| `ponytail-debt` | 把代码里所有 `ponytail:` 注释收进债务台账,延迟不烂尾 |
| `ponytail-gain` | 展示 ponytail 的实测收益记分牌(基准中位数) |
| `ponytail-help` | 全部模式/技能/命令的速查卡 |

## 安装

```sh
# npm(包名 dsh-ponytail 已被同名项目占用,本包发布为 dsh-ponytail-skills)
dsh plugin --profile web add dsh-ponytail-skills

# GitHub
dsh plugin --profile web add github:gongyijie85/dsh-ponytail

# 本地开发
dsh plugin --profile web add D:\plugins\dsh-ponytail
```

装完重启 profile(`dsh web`),技能即可用 `skill` 工具加载。

## 工作原理

- **Bundle 层** —— `cordis.patch.yml` 在 dsh-base 层插入插件行,后续层可按 id 定位。
- **提供者** —— `lib/index.js` 调用 `ctx.skills.registerProvider(...)`:扫描
  `skills/` 目录,从 YAML frontmatter 解析 `name`/`description` 并返回完整技能
  定义,`resourceBase` 指向技能目录。
- **零运行时依赖** —— 只使用 Node 内置模块。

## 移植说明(对比上游)

- **技能文件与上游完全一致(verbatim)**:包括 `description: >` 折叠多行
  frontmatter——提供者(`lib/index.js`)原生解析折叠标量(按 YAML 语义以
  单空格连接),无需任何改写。
- `argument-hint`、`license` 等元数据原样透传。
- 调用语义:全部模型/用户可调用(上游未设 `disable-model-invocation`)。

## 许可证

MIT。技能内容 © DietrichGebert([ponytail](https://github.com/DietrichGebert/ponytail));
DSH 移植 © gongyijie85。见 [LICENSE](LICENSE)。
