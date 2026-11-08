/** Y scale that starts at zero and tops out at the series peak, in whole numbers. */
export function wholeNumberYAxis(values: number[]) {
  const peak = values.reduce((highest, value) => Math.max(highest, value), 0);
  if (peak <= 4) {
    return {
      beginAtZero: true as const,
      max: Math.max(peak, 1),
      ticks: { precision: 0, stepSize: 1 },
    };
  }

  const roughStep = peak / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  const stepSize = Math.max(1, nice * magnitude);

  return {
    beginAtZero: true as const,
    max: Math.ceil(peak / stepSize) * stepSize,
    ticks: { precision: 0, stepSize },
  };
}
