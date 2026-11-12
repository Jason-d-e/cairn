import {
  ActionIcon, Alert, Button, Checkbox, createTheme, Input, InputWrapper, Loader, Menu, SegmentedControl, Tooltip,
  type CSSVariablesResolver, type MantineColorsTuple,
} from '@mantine/core'

/*
 * Visual system: Hallmark theme "Refract", chosen by the team on 2026-11-09 from twelve samples (over Terrazzo).
 * Sunlit paper, deep pool-blue ink, Funnel Display at a light weight, clear panels with a lit top edge and shadows
 * tinted by the water, pills for controls, and one water signal (the accent) on the primary, focus, the present
 * marker and links on hover. The light itself is generated live (components/Light.tsx). The OKLCH tokens live in
 * styles/tokens.css; Mantine needs hex tuples, so the same tokens are converted here
 * (contrast: ink on paper 15:1, ink-2 9.5:1, muted 5.6:1, accent on white 5.5:1).
 */

// Cool neutrals from paper (0) to ink (9). Used as Mantine's "gray" so every neutral is the paper's.
const ink: MantineColorsTuple = ['#faf9f5', '#f4f3ef', '#ebeae4', '#d7dde1', '#b9c3ca', '#8e9ba4', '#576570', '#3e4f5e', '#2e3f4f', '#0e1f2c']
// Pool blue, light to deep. 6 is the accent, 7 the hover, 1 the soft tint.
const pool: MantineColorsTuple = ['#eef7fa', '#daf0f7', '#acdae4', '#77b6ca', '#3f93b6', '#1f7ea8', '#006c9c', '#005a8b', '#004a74', '#00395a']

export const cssVariablesResolver: CSSVariablesResolver = () => {
  // One scheme only (Refract has no dark colourway); everything reads the tokens.
  const shared = {
    '--mantine-color-body': 'var(--color-paper)',
    '--mantine-color-text': 'var(--color-ink)',
    '--mantine-color-dimmed': 'var(--color-muted)',
    '--mantine-color-default': 'var(--color-light)',
    '--mantine-color-default-hover': 'var(--color-paper-2)',
    '--mantine-color-default-border': 'var(--color-rule)',
    '--mantine-color-default-color': 'var(--color-ink)',
    '--mantine-color-placeholder': 'var(--color-muted)',
    '--mantine-color-anchor': 'var(--color-ink)',
    '--mantine-color-pool-filled': 'var(--color-accent)',
    '--mantine-color-pool-filled-hover': 'var(--color-accent-hi)',
    '--mantine-color-pool-light': 'var(--color-accent-soft)',
    '--mantine-color-pool-light-hover': 'var(--color-accent-soft)',
    '--mantine-color-pool-light-color': 'var(--color-ink)',
    '--mantine-color-ink-filled': 'var(--color-ink)',
    '--mantine-color-ink-filled-hover': 'var(--color-ink-2)',
    '--mantine-color-gray-light': 'var(--color-paper-2)',
    '--mantine-color-gray-light-hover': 'var(--color-paper-3)',
    '--mantine-color-gray-light-color': 'var(--color-ink)',
    '--mantine-color-red-light': 'var(--color-light)',
    '--mantine-color-red-light-color': 'var(--color-error)',
    '--mantine-color-red-filled': 'var(--color-error)',
    '--mantine-color-red-outline': 'var(--color-error)',
  }
  return { variables: {}, light: shared, dark: shared }
}

// Chinese has no glyphs in Funnel Sans, so it falls to Noto Sans SC (loaded as a web font, never the system face).
const FONT = '"Funnel Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif'
const DISPLAY = '"Funnel Display", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif'

export const theme = createTheme({
  colors: { ink, pool, gray: ink },
  primaryColor: 'pool',
  primaryShade: 6,
  white: '#fffefb',
  black: '#0e1f2c',
  defaultRadius: 'md',
  radius: { xs: '6px', sm: '8px', md: '12px', lg: '16px', xl: '999px' },
  fontFamily: FONT,
  fontSizes: { xs: '0.8125rem', sm: '0.875rem', md: '1.0625rem', lg: '1.25rem', xl: '1.5625rem' },
  headings: { fontFamily: DISPLAY, fontWeight: '400' },
  focusRing: 'auto',
  respectReducedMotion: true,
  cursorType: 'pointer',
  components: {
    // Mantine writes a variant's colours as inline variables, so the token colours are set the same way (inline wins over styles.css).
    Button: Button.extend({
      defaultProps: { radius: 'xl' },
      classNames: { root: 'cn-press' },
      // 500 is the heaviest weight index.html loads; Mantine's default 600 was drawn at 500 anyway.
      styles: { label: { fontWeight: 500 } },
      vars: (_theme, props) => {
        const variant = props.variant ?? 'filled'
        if (variant === 'filled') return { root: { '--button-bg': 'var(--color-accent)', '--button-hover': 'var(--color-accent-hi)', '--button-color': 'var(--color-accent-ink)', '--button-bd': '0' } }
        if (variant === 'default') return { root: { '--button-bg': 'color-mix(in oklab, var(--color-light) 80%, transparent)', '--button-hover': 'var(--color-light)', '--button-color': 'var(--color-ink)', '--button-bd': '0' } }
        if (variant === 'subtle') return { root: { '--button-bg': 'transparent', '--button-hover': 'var(--color-accent-soft)', '--button-color': 'var(--color-ink-2)', '--button-hover-color': 'var(--color-ink)' } }
        return { root: {} }
      },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { radius: 'xl' },
      vars: (_theme, props) =>
        props.variant === 'default'
          ? { root: { '--ai-bg': 'var(--color-light)', '--ai-hover': 'var(--color-paper-2)', '--ai-color': 'var(--color-ink)', '--ai-bd': '0' } }
          : { root: {} },
    }),
    Alert: Alert.extend({
      defaultProps: { variant: 'light', radius: 'md' },
      styles: { root: { background: 'var(--color-light)', boxShadow: 'var(--edge-light), 0 0 0 1px var(--color-rule)' }, title: { fontWeight: 500 } },
    }),
    // Fields are white wells with a 1px edge and a soft focus ring (styles.css; inline styles would hide the ring).
    Input: Input.extend({ classNames: { input: 'cn-field' } }),
    InputWrapper: InputWrapper.extend({ styles: { label: { fontWeight: 500 } } }),
    Checkbox: Checkbox.extend({ defaultProps: { color: 'pool', radius: 'xs' }, classNames: { input: 'cn-check' } }),
    // A choice of two to four: a clear pill, the chosen segment white inside a thin accent ring.
    SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: 'xl' }, classNames: { root: 'cn-cells', indicator: 'cn-cells-on', label: 'cn-cells-label', control: 'cn-cells-cell' } }),
    Loader: Loader.extend({ defaultProps: { color: 'pool', type: 'dots' } }),
    Menu: Menu.extend({ defaultProps: { radius: 'md', shadow: 'none' }, classNames: { dropdown: 'cn-dropdown', item: 'cn-menuitem' } }),
    Tooltip: Tooltip.extend({ defaultProps: { radius: 'sm', color: 'ink' } }),
  },
})
