// database.js
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sports_scheduler',
    password: '1811',
    port: 5432,
});

module.exports = pool;
