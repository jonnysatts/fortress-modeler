export function devLog(...args: unknown[]): void {
  if (import.meta.env.MODE === 'development') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
