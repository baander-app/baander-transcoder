import winston from 'winston';
import 'winston-daily-rotate-file';
import { LoggingOptions } from '../config';
import * as path from 'path';

// Create a default logger that logs to console only initially
export const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export function configureLogger(options: LoggingOptions) {
  logger.configure({
    level: options.level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.DailyRotateFile({
        filename: path.join(options.directory, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: options.maxSize,
        maxFiles: options.maxFiles,
      }),
    ],
  });
}
