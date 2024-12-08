const winston = require('winston');

const { LogLevels } = require("./constant")

const Logger = winston.createLogger({
    levels: LogLevels.levels,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ],
});

winston.addColors(LogLevels.colors);

module.exports = Logger

