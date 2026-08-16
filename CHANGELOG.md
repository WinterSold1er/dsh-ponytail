# Changelog

## [0.1.1] - 2026-08-16

### Changed

- 新增完整英文 README(`README.en.md`),随 npm 包分发;中文 README 顶部加语言切换链接。
- README 增加徽章(npm / GitHub release / license)、快速上手、工作原理章节。

## [0.1.0] - 2026-08-16

首个发布版:把 DietrichGebert/ponytail 的 6 个技能移植到 DeepSeek Harness。

### Added

- 6 个技能(标准 `SKILL.md`,host 层技能提供者注册):
  - `ponytail`(核心懒模式,lite / full / ultra)
  - `ponytail-review`(只针对过度工程的 diff 评审)
  - `ponytail-audit`(全仓库过度工程审计)
  - `ponytail-debt`(`ponytail:` 注释债务台账)
  - `ponytail-gain`(实测收益记分牌)
  - `ponytail-help`(速查卡)
- Cordis bundle 插件:`cordis.patch.yml` + `lib/index.js`(零运行时依赖)
- 验证脚本 `scripts/verify-provider.mjs`(6/6 冒烟测试,`npm run verify`)

### Adapted (vs 上游 DietrichGebert/ponytail)

- 折叠多行 `description: >` frontmatter 全部展平为单行(DSH 发现解析器只读标量值)
- 技能正文零改动;`argument-hint`、`license` 等元数据原样透传

### License

MIT;技能内容 © DietrichGebert([ponytail](https://github.com/DietrichGebert/ponytail)),
DSH 移植 © gongyijie85。
