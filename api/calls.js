let demoCalls = [
  {
    id: 1,
    destination_number: "+44 20 7946 0991",
    destination_country: "United Kingdom",
    duration_seconds: 142,
    cost: 0.0426,
    status: "completed",
    created_at: new Date(Date.now() - 1800000).toLocaleString()
  },
  {
    id: 2,
    destination_number: "+234 803 123 4567",
    destination_country: "Nigeria",
    duration_seconds: 85,
    cost: 0.1062,
    status: "completed",
    created_at: new Date(Date.now() - 86400000).toLocaleString()
  }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, calls: demoCalls });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const destNumber = body.destination_number || 'Unknown';
    const destCountry = body.destination_country || 'International';
    const duration = parseInt(body.duration_seconds || 0);
    const ratePerMin = parseFloat(body.rate_per_minute || 0.05);
    const cost = Math.max(0.001, Math.round(((duration / 60) * ratePerMin) * 10000) / 10000);

    const callRecord = {
      id: demoCalls.length + 1,
      destination_number: destNumber,
      destination_country: destCountry,
      duration_seconds: duration,
      cost: cost,
      status: 'completed',
      created_at: new Date().toLocaleString()
    };
    demoCalls.unshift(callRecord);

    return res.status(200).json({
      success: true,
      call_id: callRecord.id,
      duration_seconds: duration,
      cost: cost,
      new_balance: 14.95
    });
  }
};
