export const productTypes = [
  { value: 'WeeklyEvent', label: 'Weekly Event' },
  { value: 'SpecialEvent', label: 'Special Event' },
] as const;

export type ProductType = typeof productTypes[number]['value'];

export const eventTypes = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'special', label: 'Special Event' }
] as const;

export type EventType = typeof eventTypes[number]['value'];
