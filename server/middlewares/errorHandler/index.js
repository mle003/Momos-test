const Logger = require("../../utils/logger")

const ErrorHandler = (err, req, res, next) => {
    Logger.error(err.stack);
    res.status(500).send('Something went wrong!');
};

module.exports = {
    ErrorHandler
}
