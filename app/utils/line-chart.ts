import { type TooltipItem } from 'chart.js';

type LinePalette = {
  ink: string;
  tick: string;
  grid: string;
  tooltipBackground: string;
  tooltipBorder: string;
};

type LineYAxis = {
  beginAtZero?: boolean;
  max?: number;
  ticks?: { precision?: number; stepSize?: number };
};

const tickFont = { family: 'Red Hat Display', size: 11, weight: 500 };

const curve = {
  tension: 0.42,
  cubicInterpolationMode: 'monotone' as const,
  borderCapStyle: 'round' as const,
  borderJoinStyle: 'round' as const,
};

export function lineSeries(
  colors: { ink: string },
  data: number[],
  options?: { label?: string; color?: string }
) {
  const color = options?.color ?? colors.ink;

  return {
    label: options?.label,
    data,
    borderColor: color,
    backgroundColor: color,
    fill: false,
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 4,
    pointBackgroundColor: color,
    pointBorderWidth: 0,
    pointHoverBackgroundColor: color,
    pointHoverBorderWidth: 0,
    pointHitRadius: 16,
    clip: false as const,
    ...curve,
  };
}

export function lineChartOptions(
  colors: LinePalette,
  options?: {
    y?: LineYAxis;
    tooltipLabel?: (value: number) => string;
    legend?: boolean;
  }
) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 16, right: 8 } },
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { color: colors.grid },
        ticks: {
          color: colors.tick,
          font: tickFont,
          padding: 8,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ...options?.y,
        grid: { color: colors.grid, drawTicks: false },
        ticks: {
          ...options?.y?.ticks,
          color: colors.tick,
          font: tickFont,
          padding: 10,
        },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        display: options?.legend ?? false,
        labels: {
          color: colors.tick,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          font: { family: 'Red Hat Display', size: 11 },
        },
      },
      tooltip: {
        enabled: true,
        displayColors: false,
        backgroundColor: colors.tooltipBackground,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        titleColor: colors.tick,
        bodyColor: colors.ink,
        titleFont: tickFont,
        bodyFont: { family: 'Red Hat Display', size: 13, weight: 600 },
        padding: 12,
        cornerRadius: 8,
        caretPadding: 8,
        callbacks: {
          label: (item: TooltipItem<'line'>) => {
            const value = item.parsed.y ?? 0;
            const formatted =
              options?.tooltipLabel?.(value) ?? value.toLocaleString();
            if (options?.legend && item.dataset.label) {
              return `${item.dataset.label}: ${formatted}`;
            }
            return formatted;
          },
        },
      },
    },
  };
}
