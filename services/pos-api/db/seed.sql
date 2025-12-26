-- Seed data for a Chinese restaurant
INSERT INTO roles (name, description)
VALUES
  ('admin', 'Full system access'),
  ('server', 'Manage tables and orders'),
  ('cashier', 'Process payments');

INSERT INTO permissions (name, description)
VALUES
  ('orders:read', 'View orders'),
  ('orders:write', 'Create/update orders'),
  ('payments:write', 'Process payments'),
  ('menu:read', 'View menu items'),
  ('admin:manage', 'Administer users and roles');

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.name IN ('orders:read', 'orders:write', 'payments:write', 'menu:read')
WHERE roles.name IN ('server', 'cashier');

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.name IN ('orders:read', 'orders:write', 'payments:write', 'menu:read', 'admin:manage')
WHERE roles.name = 'admin';

INSERT INTO users (email, full_name, password_hash)
VALUES
  ('admin@dragonpalace.local', 'Dragon Palace Admin', crypt('changeme', gen_salt('bf'))),
  ('server@dragonpalace.local', 'Dining Server', crypt('changeme', gen_salt('bf'))),
  ('cashier@dragonpalace.local', 'Front Cashier', crypt('changeme', gen_salt('bf')));

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.name = 'admin'
WHERE users.email = 'admin@dragonpalace.local';

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.name = 'server'
WHERE users.email = 'server@dragonpalace.local';

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.name = 'cashier'
WHERE users.email = 'cashier@dragonpalace.local';

INSERT INTO "tables" (label, seats, status)
VALUES
  ('T1', 4, 'available'),
  ('T2', 4, 'available'),
  ('VIP1', 8, 'available');

INSERT INTO menu_items (name, description, category, price_cents)
VALUES
  ('Har Gow', 'Steamed shrimp dumplings', 'Dimsum', 650),
  ('Siu Mai', 'Pork and shrimp dumplings', 'Dimsum', 600),
  ('Char Siu Bao', 'BBQ pork bun', 'Dimsum', 550),
  ('Mapo Tofu', 'Spicy tofu with minced pork', 'Lunch', 1299),
  ('Beef Chow Fun', 'Stir-fried flat noodles with beef', 'Lunch', 1399),
  ('Kung Pao Chicken', 'Stir-fried chicken with peanuts', 'Lunch', 1299),
  ('Peking Duck', 'Roasted duck with pancakes', 'Dinner', 2899),
  ('Steamed Whole Fish', 'Ginger scallion soy', 'Dinner', 2599),
  ('Yangzhou Fried Rice', 'Classic fried rice', 'Dinner', 1499);
