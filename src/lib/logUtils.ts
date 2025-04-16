// export function devLog(...args: any[]) {
//   if (process.env.NODE_ENV === 'development') {
//     // eslint-disable-next-line no-console
//     console.log('[DEV]', ...args);
//   }
// }

export function appError(...args: any[]) {
  console.error(...args);
}
