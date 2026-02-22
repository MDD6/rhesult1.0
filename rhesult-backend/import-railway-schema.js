const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const MYSQL_PUBLIC_URL = 'mysql://root:PdKzxNahiLMNeiLHFhECffjRfoZPOLtF@tramway.proxy.rlwy.net:32893/railway';

async function importSchema() {
  console.log('Connecting to Railway MySQL...');
  const connection = await mysql.createConnection({
    uri: MYSQL_PUBLIC_URL,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
  });

  console.log('Connected! Reading schema...');
  const schemaPath = path.join(__dirname, '..', 'rhesult-web', 'database', 'rhesult_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('Executing full schema with multipleStatements...');
  try {
    await connection.query(schema);
    console.log('✅ Schema imported successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  // Verify tables
  const [tables] = await connection.query('SHOW TABLES');
  console.log('\nTables in database:');
  tables.forEach(t => {
    const name = Object.values(t)[0];
    console.log(`  - ${name}`);
  });

  await connection.end();
  console.log('\nDone!');
}

importSchema().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
