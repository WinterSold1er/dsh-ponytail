/**
 * dsh-ponytail browser half: full settings control center and custom ponytail nav icon,
 * talking to the host half over /ponytail/* routes.
 *
 * BUNDLE FORM: hand-written IIFE registered on window.__ModuleLoader__ — same
 * lazy-CJS factory contract the dsh client module system loads. No imports; the
 * only externals are React and react/jsx-runtime from the loader table.
 *
 * Registers under both 'dsh-ponytail-skills' (package name) and 'dsh-ponytail' (bundle id).
 */
(function () {
  function factory(require) {
    var React = require('react')

    /** Fetch current ponytail state from the host half. */
    function fetchState() {
      return fetch('/ponytail/status', { cache: 'no-store' }).then(function (res) {
        return res.json()
      })
    }

    /** Write partial state; returns the resolved state. */
    function writeState(patch) {
      return fetch('/ponytail/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      }).then(function (res) {
        if (!res.ok) throw new Error('ponytail write failed: HTTP ' + res.status)
        return res.json()
      })
    }

    // ------------------------------------------------------------------
    // Dedicated Ponytail SVG Icon (PonytailNavIcon)
    // ------------------------------------------------------------------
    var PONYTAIL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="#000">' +
      '<path d="M 6.2,2.2 C 4.5,2.2 3.2,3.3 2.5,4.6 C 2.1,5.3 1.6,5.8 1,6.1 C 0.8,6.3 0.9,6.7 1.3,6.7 C 1.8,6.7 2.2,7 2.2,7.5 C 2,8.2 1.7,8.6 2,9.1 C 2.3,9.6 3,9.8 3.6,10 C 4.2,10.4 4.5,11 4.7,12 L 4.6,14.5 L 6.6,14.5 L 6.6,12 C 7,11.2 7.6,10.2 8,9 C 8.4,7.8 8.5,6.5 8.3,5.2 C 8.2,4.2 7.6,3.1 7,2.5 C 6.7,2.3 6.5,2.2 6.2,2.2 Z"/>' +
      '<ellipse cx="8.6" cy="4.2" rx="0.9" ry="1.4" transform="rotate(25 8.6 4.2)"/>' +
      '<path d="M 9.2,3.8 C 10.6,1.8 12.8,1.2 14.5,2.2 C 15.6,3 15.9,4.5 15.3,6.5 C 14.5,9.2 13,11.8 10.8,14 C 10.3,14.4 9.8,14 10,13.4 C 11,11.2 12,8.8 12.2,6.8 C 12.4,5.3 11.5,4.5 10.3,4.8 C 9.7,5 9.3,5.4 8.9,5.8 Z"/>' +
      '</svg>'

    var PONYTAIL_MASK_URL = 'data:image/svg+xml,' + encodeURIComponent(PONYTAIL_SVG)
    var NAV_ICON_MARKER = 'data-dsh-ponytail-nav-icon'
    var NAV_ROW_SELECTOR = '[role="dialog"] nav button, nav.dsw-settings-nav button, nav button'

    /** Renderable React icon component declared in slot registration. */
    function PonytailNavIcon(props) {
      var p = Object.assign(
        {
          viewBox: '0 0 16 16',
          width: 16,
          height: 16,
          fill: 'currentColor',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        props || {}
      )
      return React.createElement(
        'svg',
        p,
        React.createElement('path', {
          d: 'M 6.2,2.2 C 4.5,2.2 3.2,3.3 2.5,4.6 C 2.1,5.3 1.6,5.8 1,6.1 C 0.8,6.3 0.9,6.7 1.3,6.7 C 1.8,6.7 2.2,7 2.2,7.5 C 2,8.2 1.7,8.6 2,9.1 C 2.3,9.6 3,9.8 3.6,10 C 4.2,10.4 4.5,11 4.7,12 L 4.6,14.5 L 6.6,14.5 L 6.6,12 C 7,11.2 7.6,10.2 8,9 C 8.4,7.8 8.5,6.5 8.3,5.2 C 8.2,4.2 7.6,3.1 7,2.5 C 6.7,2.3 6.5,2.2 6.2,2.2 Z',
        }),
        React.createElement('ellipse', {
          cx: '8.6',
          cy: '4.2',
          rx: '0.9',
          ry: '1.4',
          transform: 'rotate(25 8.6 4.2)',
        }),
        React.createElement('path', {
          d: 'M 9.2,3.8 C 10.6,1.8 12.8,1.2 14.5,2.2 C 15.6,3 15.9,4.5 15.3,6.5 C 14.5,9.2 13,11.8 10.8,14 C 10.3,14.4 9.8,14 10,13.4 C 11,11.2 12,8.8 12.2,6.8 C 12.4,5.3 11.5,4.5 10.3,4.8 C 9.7,5 9.3,5.4 8.9,5.8 Z',
        })
      )
    }

    /** Stylesheet replacing DSH fallback gear icon with Ponytail silhouette. */
    function navIconCss() {
      return [
        '[' + NAV_ICON_MARKER + '] > svg { display: none !important; }',
        '[' + NAV_ICON_MARKER + ']::before {',
        "  content: '';",
        '  flex: none;',
        '  width: 16px;',
        '  height: 16px;',
        '  background-color: currentColor;',
        '  -webkit-mask-image: url("' + PONYTAIL_MASK_URL + '");',
        '  mask-image: url("' + PONYTAIL_MASK_URL + '");',
        '  -webkit-mask-repeat: no-repeat;',
        '  mask-repeat: no-repeat;',
        '  -webkit-mask-position: center;',
        '  mask-position: center;',
        '  -webkit-mask-size: 16px 16px;',
        '  mask-size: 16px 16px;',
        '}',
      ].join('\n')
    }

    function isOwnNavRow(rowText, wantedLabel) {
      var wanted = String(wantedLabel || '').trim().toLowerCase()
      if (!wanted) return false
      var actual = String(rowText || '').trim().toLowerCase()
      return actual === wanted || actual.replace(/\s+/g, ' ').trim() === wanted || actual.indexOf(wanted) === 0
    }

    /**
     * Installs the custom settings navigation icon for ponytail section.
     */
    function installSettingsNavIcon(ctx, resolveLabel) {
      if (typeof document === 'undefined') return

      var mount = function () {
        var tag = document.createElement('style')
        tag.dataset.plugin = 'dsh-ponytail'
        tag.dataset.pluginCss = 'dsh-ponytail/settings-nav-icon'
        tag.textContent = navIconCss()
        document.head.appendChild(tag)

        var disposed = false
        var scheduled = false

        var sync = function () {
          scheduled = false
          if (disposed) return
          var wanted = resolveLabel()
          var rows = document.querySelectorAll(NAV_ROW_SELECTOR)
          for (var i = 0; i < rows.length; i++) {
            var row = rows[i]
            if (isOwnNavRow(row.textContent, wanted)) {
              row.setAttribute(NAV_ICON_MARKER, '')
            } else if (row.hasAttribute(NAV_ICON_MARKER)) {
              row.removeAttribute(NAV_ICON_MARKER)
            }
          }
        }

        var schedule = function () {
          if (scheduled || disposed) return
          scheduled = true
          if (typeof queueMicrotask === 'function') {
            queueMicrotask(sync)
          } else {
            setTimeout(sync, 0)
          }
        }

        sync()
        var observer = new MutationObserver(schedule)
        observer.observe(document.body, { childList: true, subtree: true, characterData: true })

        return function () {
          disposed = true
          observer.disconnect()
          var marked = document.querySelectorAll('[' + NAV_ICON_MARKER + ']')
          for (var j = 0; j < marked.length; j++) {
            marked[j].removeAttribute(NAV_ICON_MARKER)
          }
          tag.remove()
        }
      }

      if (ctx && typeof ctx.effect === 'function') {
        ctx.effect(mount, 'dsh-ponytail: settings nav icon')
      } else {
        mount()
      }
    }

    // ------------------------------------------------------------------
    // Level Metadata & Constants
    // ------------------------------------------------------------------
    var LEVEL_DEFS = {
      lite: {
        id: 'lite',
        name: '轻量 lite',
        tag: '方案备选',
        desc: '按需构建，但用一行指出更懒的替代方案，由用户自行抉择。适合渐进式极简与日常编码。',
      },
      full: {
        id: 'full',
        name: '标准 full',
        tag: '推荐主力',
        desc: '严格践行极简阶梯：标准库与原生优先，最少文件，最短 Diff，绝不引入多余抽象与空架子。',
      },
      ultra: {
        id: 'ultra',
        name: '极限 ultra',
        tag: 'YAGNI 极客',
        desc: '极端 YAGNI：删除优先于新增，直接给出一行解法并质疑需求本身，彻底粉碎过度设计。',
      },
    }

    // ------------------------------------------------------------------
    // Settings Section UI: Full Control Center
    // ------------------------------------------------------------------
    function PonytailSection() {
      var state = React.useState(null)
      var value = state[0]
      var set = state[1]
      var busy = React.useState(false)
      var isBusy = busy[0]
      var setBusy = busy[1]

      React.useEffect(function () {
        fetchState().then(set).catch(function () {})
      }, [])

      function apply(patch) {
        setBusy(true)
        set(function (prev) {
          return prev ? Object.assign({}, prev, patch) : patch
        })
        writeState(patch).then(function (next) {
          set(next)
          setBusy(false)
        }).catch(function () {
          setBusy(false)
          fetchState().then(set).catch(function () {})
        })
      }

      if (value === null) {
        return React.createElement(
          'div',
          { style: { padding: '24px', fontSize: '13px', color: 'var(--dsw-alias-label-secondary, #cfd3d6)' } },
          '加载 Ponytail 配置中…'
        )
      }

      var isEnabled = !!value.enabled
      var activeLevel = value.level || 'full'

      // Card 1: Top Hero & Master Mode Switch (MUST start with PonytailNavIcon)
      var heroCard = React.createElement(
        'div',
        {
          style: {
            border: '1px solid ' + (isEnabled ? 'var(--dsw-alias-state-success-primary, #22c55e)' : 'var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l2, rgba(255,255,255,0.12)))'),
            borderRadius: '12px',
            padding: '18px 20px',
            backgroundColor: isEnabled
              ? 'color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 10%, var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2, #2c2c2e)))'
              : 'var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2, #2c2c2e))',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            transition: 'border-color 0.2s, background-color 0.2s',
          },
        },
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' } },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            React.createElement(PonytailNavIcon, {
              style: {
                width: '20px',
                height: '20px',
                color: isEnabled ? 'var(--dsw-alias-state-success-primary, #22c55e)' : 'var(--dsw-alias-label-secondary, #cfd3d6)',
              },
            }),
            React.createElement(
              'span',
              { style: { fontSize: '15px', fontWeight: '600', color: 'var(--dsw-alias-label-primary, currentColor)' } },
              '极简开发 (Ponytail Mode)'
            ),
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: isEnabled ? 'var(--dsw-alias-state-success-tertiary, rgba(34,197,94,0.18))' : 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.06))',
                  color: isEnabled ? 'var(--dsw-alias-state-success-primary, #22c55e)' : 'var(--dsw-alias-label-tertiary, #adb2b8)',
                  border: '1px solid ' + (isEnabled ? 'var(--dsw-alias-state-success-primary, #22c55e)' : 'var(--dsw-alias-border-l2, rgba(255,255,255,0.12))'),
                },
              },
              isEnabled ? '● 已开启' : '○ 已关闭'
            )
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              disabled: isBusy,
              onClick: function () { apply({ enabled: !isEnabled }) },
              className: 'dsw-button' + (isEnabled ? '' : ' dsw-button--primary'),
              style: {
                minWidth: '108px',
                fontWeight: '600',
                cursor: 'pointer',
              },
            },
            isEnabled ? '关闭极简模式' : '一键开启极简'
          )
        ),
        React.createElement(
          'div',
          { style: { fontSize: '12.5px', color: 'var(--dsw-alias-label-secondary, #cfd3d6)', lineHeight: '1.5' } },
          isEnabled
            ? '已向系统提示词注入极简开发规范（当前：' + (LEVEL_DEFS[activeLevel] ? LEVEL_DEFS[activeLevel].name : activeLevel) + '）。在处理任何开发、调试、重构与代码任务时，强制先调用 ponytail 技能，严格践行极简阶梯，拒绝过度设计，大幅减少代码量与上下文消耗。'
            : '开启后进入懒人高级开发者（Senior Lazy Dev）模式。崇尚「不写的代码就是最好的代码」，优先复用标准库与原生特性，代码优先、最少文件、最小 Diff，减少 40%~70% 的冗余代码与 Token 消耗。'
        )
      )

      // Card 2: Level Selection
      var levelKeys = ['lite', 'full', 'ultra']
      var levelCards = levelKeys.map(function (key) {
        var def = LEVEL_DEFS[key]
        var isActive = activeLevel === key && isEnabled
        return React.createElement(
          'div',
          {
            key: key,
            onClick: function () { if (!isBusy) apply({ level: key, enabled: true }) },
            style: {
              flex: '1 1 calc(33.3% - 8px)',
              minWidth: '180px',
              border: '1px solid ' + (isActive ? 'var(--dsw-alias-brand-primary-new-colorprimary-new-color, #5686fe)' : 'var(--dsw-alias-border-l2, rgba(255,255,255,0.12))'),
              borderRadius: '10px',
              padding: '14px 16px',
              backgroundColor: isActive
                ? 'color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #5686fe) 15%, var(--dsw-alias-bg-layer-1, #232324))'
                : 'var(--dsw-alias-bg-layer-1, #232324)',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? '0 0 0 1px var(--dsw-alias-brand-primary-new-colorprimary-new-color, #5686fe)' : 'none',
            },
          },
          React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement(
              'span',
              { style: { fontSize: '13px', fontWeight: '600', color: isActive ? 'var(--dsw-alias-brand-primary-new-colorprimary-new-color, #5686fe)' : 'var(--dsw-alias-label-primary, currentColor)' } },
              def.name
            ),
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '10.5px',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'var(--dsw-alias-brand-primary-new-colorprimary-new-color, #5686fe)' : 'var(--dsw-alias-bg-layer-3, rgba(255,255,255,0.08))',
                  color: isActive ? '#ffffff' : 'var(--dsw-alias-label-secondary, #adb2b8)',
                  fontWeight: '600',
                },
              },
              isActive ? '当前激活' : def.tag
            )
          ),
          React.createElement(
            'span',
            { style: { fontSize: '11.5px', color: 'var(--dsw-alias-label-secondary, #cfd3d6)', lineHeight: '1.4' } },
            def.desc
          )
        )
      })

      var levelCardSection = React.createElement(
        'div',
        {
          style: {
            border: '1px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l2, rgba(255,255,255,0.12)))',
            borderRadius: '12px',
            padding: '16px 20px',
            backgroundColor: 'var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2, #2c2c2e))',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          },
        },
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement(
            'span',
            { style: { fontSize: '14px', fontWeight: '600', color: 'var(--dsw-alias-label-primary, currentColor)' } },
            '档位选择 (Intensity Level)'
          ),
          React.createElement(
            'span',
            { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #adb2b8)' } },
            '点击卡片即可切换并激活对应档位'
          )
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', gap: '10px' } },
          levelCards
        )
      )

      // Card 3: Ladder Rules Card (The 7 Rungs)
      var ladderRungs = [
        { num: '1️⃣', title: '无需存在? (YAGNI)', desc: '投机性需求直接放弃，用一行说明跳过理由。不写的代码就是最好的代码。' },
        { num: '2️⃣', title: '库中已有?', desc: '优先复用当前代码库中已有的工具函数、类型或模式，严禁重复造轮子。' },
        { num: '3️⃣', title: '标准库能做?', desc: '能用 Python/Node/Go/Rust 标准库完成的，坚决手写或引入依赖。' },
        { num: '4️⃣', title: '原生特性?', desc: 'CSS 优于 JS，HTML 原生组件优于第三方组件库，数据库约束优于应用层代码校验。' },
        { num: '5️⃣', title: '已装依赖?', desc: '仅复用 package.json 中已安装依赖，绝不为几行代码新增外部包。' },
        { num: '6️⃣', title: '能一行解决?', desc: '能写成单行的逻辑绝不写成 50 行的包装类或工厂函数。' },
        { num: '7️⃣', title: '最简可用代码', desc: '只有当以上梯级都不满足时，才编写最少且能跑通的实用代码。' },
      ]

      var ladderElements = ladderRungs.map(function (item, idx) {
        return React.createElement(
          'div',
          {
            key: idx,
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--dsw-alias-bg-layer-1, rgba(0,0,0,0.2))',
              border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.06))',
            },
          },
          React.createElement('span', { style: { fontSize: '13px', flex: 'none', lineHeight: '1.4' } }, item.num),
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
            React.createElement(
              'span',
              { style: { fontSize: '12.5px', fontWeight: '600', color: 'var(--dsw-alias-label-primary, currentColor)' } },
              item.title
            ),
            React.createElement(
              'span',
              { style: { fontSize: '11.5px', color: 'var(--dsw-alias-label-secondary, #cfd3d6)', lineHeight: '1.4' } },
              item.desc
            )
          )
        )
      })

      var ladderCard = React.createElement(
        'div',
        {
          style: {
            border: '1px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l2, rgba(255,255,255,0.12)))',
            borderRadius: '12px',
            padding: '16px 20px',
            backgroundColor: 'var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2, #2c2c2e))',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          },
        },
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement(
            'span',
            { style: { fontSize: '14px', fontWeight: '600', color: 'var(--dsw-alias-label-primary, currentColor)' } },
            '🪜 极简阶梯 7 阶法则 (The 7 Rungs)'
          ),
          React.createElement(
            'span',
            { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #adb2b8)' } },
            '停留在第一个成立的梯级'
          )
        ),
        React.createElement(
          'div',
          { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #cfd3d6)', lineHeight: '1.5' } },
          '遇到任何编程、设计或重构问题，从最高阶梯依次检视，一旦命中立即停步：'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          ladderElements
        )
      )

      // Card 4: Slash Commands Reference Card
      var slashCommands = [
        { cmd: '/ponytail on', alt: '/ponytail-on', desc: '一键开启极简开发模式' },
        { cmd: '/ponytail off', alt: '/ponytail-off', desc: '一键关闭极简开发模式' },
        { cmd: '/ponytail level <mode>', alt: '/ponytail-level', desc: '切换档位：lite / full / ultra' },
        { cmd: '/ponytail status', alt: '/ponytail-status', desc: '查看极简开发当前运行状态与配置' },
        { cmd: '/ponytail-help', alt: '', desc: '查看所有 Ponytail 模式与命令说明' },
        { cmd: '/ponytail-audit', alt: '', desc: '全局扫描仓库过度设计与膨胀代码' },
        { cmd: '/ponytail-review', alt: '', desc: '针对代码 Diff 进行极简代码审查' },
        { cmd: '/ponytail-debt', alt: '', desc: '收集全库技术债务与 ponytail: 注释清单' },
      ]

      var slashElements = slashCommands.map(function (item, idx) {
        return React.createElement(
          'div',
          { key: idx, style: { display: 'flex', flexDirection: 'column', gap: '3px' } },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
            React.createElement(
              'code',
              {
                style: {
                  background: 'var(--dsw-alias-markdown-inline-code, rgba(255,255,255,0.08))',
                  color: 'var(--dsw-alias-label-primary, currentColor)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                },
              },
              item.cmd
            ),
            item.alt
              ? React.createElement(
                  'span',
                  { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #adb2b8)' } },
                  '或 ',
                  React.createElement(
                    'code',
                    {
                      style: {
                        background: 'var(--dsw-alias-markdown-inline-code, rgba(255,255,255,0.08))',
                        color: 'var(--dsw-alias-label-primary, currentColor)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontFamily: 'monospace',
                      },
                    },
                    item.alt
                  )
                )
              : null
          ),
          React.createElement(
            'span',
            { style: { fontSize: '11.5px', color: 'var(--dsw-alias-label-secondary, #cfd3d6)', lineHeight: '1.4' } },
            item.desc
          )
        )
      })

      var helpCard = React.createElement(
        'div',
        {
          style: {
            border: '1px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l2, rgba(255,255,255,0.12)))',
            borderRadius: '12px',
            padding: '16px 20px',
            backgroundColor: 'var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2, #2c2c2e))',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          },
        },
        React.createElement(
          'span',
          { style: { fontSize: '13.5px', fontWeight: '600', color: 'var(--dsw-alias-label-primary, currentColor)' } },
          '💬 对话斜杠命令 (Slash Commands)'
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
            },
          },
          slashElements
        )
      )

      return React.createElement(
        'section',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '820px',
            padding: '4px 0 24px',
          },
        },
        heroCard,
        levelCardSection,
        ladderCard,
        helpCard
      )
    }

    // ------------------------------------------------------------------
    // Registration & Hooks
    // ------------------------------------------------------------------
    var inject = ['slots']

    function apply(ctx) {
      // 1. Install custom SVG ponytail nav icon hook in settings dialog nav
      installSettingsNavIcon(ctx, function () { return 'ponytail' })

      // 2. Register top-level Settings section
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          {
            name: 'settings.section',
            id: 'ponytail',
            order: 46,
            label: function () { return 'ponytail' },
            icon: PonytailNavIcon,
            inject: function () { return {} },
          },
          PonytailSection
        )
      })
    }

    return { name: 'dsh-ponytail', inject: inject, apply: apply }
  }

  if (typeof window !== 'undefined' && window.__ModuleLoader__ && typeof window.__ModuleLoader__.load === 'function') {
    window.__ModuleLoader__.load({
      id: 'dsh-ponytail-skills',
      factory: factory,
    })
    window.__ModuleLoader__.load({
      id: 'dsh-ponytail',
      factory: factory,
    })
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory
  }
})()
