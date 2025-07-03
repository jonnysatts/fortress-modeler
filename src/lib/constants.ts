export const productTypes = [
  { value: 'WeeklyEvent', label: 'Weekly Event' },
] as const;

export type ProductType = typeof productTypes[number]['value'];