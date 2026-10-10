let demoWallet = {
  balance: 15.00,
  currency: 'USD'
};

let demoTransactions = [
  {
    id: 1,
    type: 'topup',
    amount: 15.00,
    balance_after: 15.00,
    description: 'Initial Welcome Calling Credit',
    created_at: new Date(Date.now() - 3600000).toLocaleString()
  }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Connect to Neon if DATABASE_URL is configured
  if (process.env.DATABASE_URL) {
    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();

      if (req.method === 'GET') {
        const wRes = await client.query('SELECT balance, currency FROM wallets WHERE user_id = 1');
        const tRes = await client.query('SELECT id, type, amount, balance_after, description, created_at FROM transactions WHERE user_id = 1 ORDER BY created_at DESC LIMIT 10');
        await client.end();
        return res.status(200).json({
          success: true,
          balance: parseFloat(wRes.rows[0]?.balance || 15.00),
          currency: wRes.rows[0]?.currency || 'USD',
          transactions: tRes.rows
        });
      }

      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const amount = parseFloat(body.amount || 0);
        if (amount <= 0) {
          await client.end();
          return res.status(400).json({ success: false, message: 'Invalid top-up amount' });
        }

        const curr = await client.query('SELECT balance FROM wallets WHERE user_id = 1');
        const newBal = (parseFloat(curr.rows[0]?.balance || 0) + amount).toFixed(2);
        await client.query('UPDATE wallets SET balance = $1 WHERE user_id = 1', [newBal]);
        const ref = 'TX-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        await client.query('INSERT INTO transactions (user_id, type, amount, balance_after, description, reference) VALUES (1, $1, $2, $3, $4, $5)', ['topup', amount, newBal, 'Wallet Top-Up via Card', ref]);
        await client.end();

        return res.status(200).json({
          success: true,
          message: `Top-up of $${amount.toFixed(2)} successful!`,
          balance: parseFloat(newBal),
          reference: ref
        });
      }
    } catch (e) {
      console.warn('Neon connection fallback to in-memory:', e.message);
    }
  }

  // Fallback
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      balance: demoWallet.balance,
      currency: demoWallet.currency,
      transactions: demoTransactions
    });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const amount = parseFloat(body.amount || 0);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid top-up amount' });
    }
    demoWallet.balance = Math.round((demoWallet.balance + amount) * 100) / 100;
    const ref = 'TX-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    demoTransactions.unshift({
      id: demoTransactions.length + 1,
      type: 'topup',
      amount: amount,
      balance_after: demoWallet.balance,
      description: 'Wallet Top-Up via Card',
      created_at: new Date().toLocaleString()
    });

    return res.status(200).json({
      success: true,
      message: `Top-up of $${amount.toFixed(2)} successful!`,
      balance: demoWallet.balance,
      reference: ref
    });
  }
};
