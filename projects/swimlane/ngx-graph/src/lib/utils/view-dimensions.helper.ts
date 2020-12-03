export interface ViewDimensions {
  width: number;
  height: number;
}

export function calculateViewDimensions({ width, height }): ViewDimensions {
  let chartWidth = width;
  let chartHeight = height;

  chartWidth = Math.max(0, chartWidth);
  chartHeight = Math.max(0, chartHeight);

  return {
    width: Math.floor(chartWidth),
    height: Math.floor(chartHeight)
  };
}
