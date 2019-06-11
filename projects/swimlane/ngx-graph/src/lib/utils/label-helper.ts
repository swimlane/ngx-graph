/**
 * Formats a label given a date, number or string.
 * 
 * @export
 * @param {*} label
 * @returns {string}
 */
export function formatLabel(label: any): string {
  // TODO: Refactor using switch case.
  if (label instanceof Date) {
    label = label.toLocaleDateString();
  } else {
    label = label.toLocaleString();
  }
  return label;
}