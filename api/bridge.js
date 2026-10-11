/**
 * ONE VOICE - Vercel Serverless Function Bridge
 * Dispatches all incoming /api/* calls directly to the unified requestHandler
 */

const requestHandler = require('../server.js');

module.exports = (req, res) => {
    return requestHandler(req, res);
};
