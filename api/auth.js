let demoUser = {
  id: 1,
  name: "Alex Morgan",
  phone: "+1 (415) 555-2671",
  email: "demo@onevoice.app"
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, user: demoUser });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (body.phone) demoUser.phone = body.phone;
    if (body.name) demoUser.name = body.name;

    return res.status(200).json({
      success: true,
      message: 'OTP Verified. Welcome back!',
      token: 'ov_jwt_' + Math.random().toString(36).substring(2),
      user: demoUser
    });
  }
};
