const basicAuth = require('basic-auth');

const template = require("../../modules/utils/response_template")

const Auth = (req, res, next) => {
    const user = basicAuth(req);
    if (!user || user.name !== 'admin' || user.pass !== 'password') {
        res.set('WWW-Authenticate', 'Basic realm="example"');
        return res.status(401).send('Authentication required.');
    }
    next();
};

module.exports = {
    Auth
}
