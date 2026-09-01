import { Grid } from 'antd'

/**
 * Single responsive split for the app: `< lg` (992px) is the mobile/tablet layout,
 * `>= lg` is the original desktop layout. Wraps antd's own `Grid.useBreakpoint()`
 * so there is no separate media-query code to keep in sync.
 */
export function useResponsive() {
  const screens = Grid.useBreakpoint()
  const isDesktop = !!screens.lg
  return { screens, isDesktop, isMobile: !isDesktop }
}
