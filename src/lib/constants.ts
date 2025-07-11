export const productTypes = [
  { value: 'WeeklyEvent', label: 'Weekly Event' },
  { value: 'SpecialEvent', label: 'Special Event' },
] as const;

export type ProductType = typeof productTypes[number]['value'];
