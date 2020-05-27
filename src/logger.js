const { createLogger, format, transports } = require('winston');

let logger = null;

function getLogger() {
  if (!logger) {
    logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
      ),
      defaultMeta: { service: 'Miniforum' },
      transports: [
        /**
         * Write all logs with level `info` and below to 'general.log'.
         * Write all logs error (and below) to 'error.log'.
         */
        new transports.File({ filename: 'errors.log', level: 'error' }),
        new transports.File({ filename: 'general.log' }),
      ],
    });

    /**
     * If we're not in production then **ALSO** log to the console
     * with the colorized simple format.
     */
    if (process.env.NODE_ENV !== 'production') {
      logger.add(new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple(),
        ),
      }));
    }
  }

  return logger;
}

exports.getLogger = getLogger;
