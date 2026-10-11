module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        url: req.url,
        headers: req.headers,
        env: {
            VERCEL: process.env.VERCEL,
            NOW_REGION: process.env.NOW_REGION
        }
    }, null, 2));
};
