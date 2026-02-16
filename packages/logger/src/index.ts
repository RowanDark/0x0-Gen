export type Logger = {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
};

const format = (level: string, message: string, context?: Record<string, unknown>) => {
  const payload = {
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(payload);
};

export const createLogger = (scope: string): Logger => ({
  info: (message, context) => console.info(format('info', message, { scope, ...context })),
  warn: (message, context) => console.warn(format('warn', message, { scope, ...context })),
  error: (message, context) => console.error(format('error', message, { scope, ...context })),
});
