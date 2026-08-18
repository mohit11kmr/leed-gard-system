import winston from "winston";

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} [${level}] ${message}${metaStr}`;
      })
    ),
  }),
];

if (process.env.NODE_ENV === "production" && process.env.LOG_DIR) {
  transports.push(
    new winston.transports.File({
      filename: `${process.env.LOG_DIR}/error.log`,
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: `${process.env.LOG_DIR}/combined.log`,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  transports,
});