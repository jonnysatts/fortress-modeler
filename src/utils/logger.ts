const loggingEnabled = import.meta.env.VITE_ENABLE_LOGGING === 'true';

export const logger = {
  log: (...args: unknown[]) => {
    if (loggingEnabled) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (loggingEnabled) {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  },
};

export default logger;
