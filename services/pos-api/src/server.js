import express from 'express';
import { authenticate, createSession, destroySession, getSessionUser } from './auth.js';
import { authorizePermissions, requireAuth } from './rbac.js';
import { query } from './db.js';

const app = express();
app.use(express.json());

const getTokenFromRequest = (req) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.replace('Bearer ', '').trim();
  }

  return req.headers['x-session-token'];
};

const getUserFromRequest = async (req) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }

  return getSessionUser(token);
};

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await authenticate(email, password);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const session = await createSession(user.id);
  res.json({ user, token: session.token, expiresAt: session.expiresAt });
});

app.post('/auth/logout', requireAuth(getUserFromRequest), async (req, res) => {
  const token = getTokenFromRequest(req);
  if (token) {
    await destroySession(token);
  }

  res.status(204).send();
});

app.get('/auth/me', requireAuth(getUserFromRequest), async (req, res) => {
  res.json({ user: req.user });
});

app.get(
  '/menu',
  requireAuth(getUserFromRequest),
  authorizePermissions(['menu:read']),
  async (req, res) => {
    const result = await query(
      'SELECT id, name, description, category, price_cents FROM menu_items WHERE is_active = TRUE ORDER BY category, name'
    );
    res.json({ items: result.rows });
  }
);

app.get(
  '/orders',
  requireAuth(getUserFromRequest),
  authorizePermissions(['orders:read']),
  async (req, res) => {
    const result = await query(
      `SELECT orders.id, orders.status, orders.total_cents, tables.label AS table_label
       FROM orders
       LEFT JOIN "tables" ON tables.id = orders.table_id
       ORDER BY orders.created_at DESC`
    );
    res.json({ orders: result.rows });
  }
);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`POS API listening on port ${port}`);
});
