/**
 * Chart.js colors for the active color mode. Chart.js draws on a canvas,
 * so it cannot read the CSS theme tokens.
 */
export function useChartColors() {
  const colorMode = useColorMode();

  return computed(() =>
    colorMode.value === 'light'
      ? {
          ink: '#121212',
          secondary: '#8e8e96',
          tick: '#6b6b74',
          grid: 'rgba(0, 0, 0, 0.06)',
          axis: 'rgba(0, 0, 0, 0.15)',
          tooltipBackground: '#f6f6f8',
          tooltipBorder: '#dcdce1',
        }
      : {
          ink: '#ffffff',
          secondary: '#a8a8a8',
          tick: '#8b8b8b',
          grid: 'rgba(255, 255, 255, 0.06)',
          axis: 'rgba(255, 255, 255, 0.15)',
          tooltipBackground: '#171717',
          tooltipBorder: '#2a2a2a',
        }
  );
}
