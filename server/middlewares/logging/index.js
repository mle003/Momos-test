const Logger = require("../../utils/logger")

const LoggingMiddleware = (req, res, next) => {
    Logger.info(`${req.method} ${req.url}`);
    next()
};

module.exports = {
    LoggingMiddleware
}