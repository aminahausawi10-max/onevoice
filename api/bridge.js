const handler = require('../dev-server.js');

module.exports = (req, res) => {
    const qIdx = (req.url || '').indexOf('?');
    const query = qIdx >= 0 ? req.url.slice(qIdx) : '';
    req.url = '/api/bridge' + query;
    return handler(req, res);
};
