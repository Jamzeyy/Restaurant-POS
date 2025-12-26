import { query } from './db.js';

export const getUserPermissions = async (userId) => {
  const result = await query(
    `SELECT permissions.name
     FROM permissions
     JOIN role_permissions ON role_permissions.permission_id = permissions.id
     JOIN user_roles ON user_roles.role_id = role_permissions.role_id
     WHERE user_roles.user_id = $1`,
    [userId]
  );

  return result.rows.map((row) => row.name);
};

export const requireAuth = (getUserFromRequest) => async (req, res, next) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = user;
  next();
};

export const authorizePermissions = (permissions) => async (req, res, next) => {
  const userPermissions = await getUserPermissions(req.user.id);
  const hasAll = permissions.every((permission) => userPermissions.includes(permission));

  if (!hasAll) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
};
