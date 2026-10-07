import { createRequire } from 'node:module';
import pino from 'pino';

const require = createRequire(import.meta.url);

const options: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'la-persona',
    env: process.env.NODE_ENV || 'development',
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
  if (process.env.NODE_ENV === 'production') {
    return pino(options);
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
      })
    );
  } catch {
    return pino(options);
  }
}

export const logger = createLogger();
