export const productTypes = [
  { value: 'SaaS', label: 'Software as a Service' },
  { value: 'Mobile App', label: 'Mobile Application' },
  { value: 'E-commerce', label: 'E-commerce Platform' },
  { value: 'Marketplace', label: 'Marketplace' },
  { value: 'WeeklyEvent', label: 'Weekly Event' },
  { value: 'Subscription', label: 'Subscription Service' },
  { value: 'Consulting', label: 'Consulting Service' },
  { value: 'Other', label: 'Other' },
] as const;

export type ProductType = typeof productTypes[number]['value'];