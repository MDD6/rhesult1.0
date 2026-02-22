const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const config = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
  console.log('🔌 Using Database URL connection...');
  const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  pool = mysql.createPool({
    uri: connectionUrl,
    ...config,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log('🔌 Using individual DB parameters...');
  pool = mysql.createPool({
    ...config,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rhesult',
    port: process.env.DB_PORT || 3306,
  });
}

module.exports = pool;
