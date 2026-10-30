import { createRequire } from 'node:module';
import pino from 'pino';
import { env } from '~~/env';

const require = createRequire(import.meta.url);

const options: pino.LoggerOptions = {
  level: 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'la-persona',
    // NODE_ENV is "production" on staging too, so prefer the deploy environment.
    env: env.RAILWAY_ENVIRONMENT_NAME || env.NODE_ENV,
    version: env.RAILWAY_GIT_COMMIT_SHA || undefined,
  },
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'secret',
      '*.secret',
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[redacted]',
  },
};

function createLogger() {
  if (env.NODE_ENV === 'production') {
    // Railway filters and colors by a string `level`; pino defaults to numbers.
    return pino({
      ...options,
      formatters: { level: (label) => ({ level: label }) },
    });
  }

  try {
    const prettyName = 'pino-pretty';
    const pretty = require(prettyName) as (
      opts: object
    ) => pino.DestinationStream;
    return pino(
      options,
      pretty({
        colorize: true,
        singleLine: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      })
    );
  } catch {
    return pino(options);
  }
}

export const logger = createLogger();
