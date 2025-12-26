# POS API

Node.js API service for the Restaurant POS.

## Setup
1. Provision a PostgreSQL database.
2. Apply schema: `psql $DATABASE_URL -f db/schema.sql`
3. Seed data: `psql $DATABASE_URL -f db/seed.sql`
4. Start the server: `npm install && npm start`
