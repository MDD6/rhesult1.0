const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'rhesult'
  });

  // Change status from ENUM to VARCHAR to accept all recruitment statuses
  await c.execute("ALTER TABLE vagas MODIFY COLUMN status VARCHAR(100) DEFAULT 'Recebendo Currículos'");

  // Also make senioridade and cidade nullable (frontend may not always send them)
  await c.execute("ALTER TABLE vagas MODIFY COLUMN senioridade VARCHAR(100) NULL DEFAULT NULL");
  await c.execute("ALTER TABLE vagas MODIFY COLUMN cidade VARCHAR(255) NULL DEFAULT NULL");

  const [cols] = await c.execute("DESCRIBE vagas");
  for (const col of cols) {
    console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} default=${col.Default}`);
  }

  // Update existing rows with old ENUM values
  await c.execute("UPDATE vagas SET status = 'Recebendo Currículos' WHERE status = 'Ativa'");
  await c.execute("UPDATE vagas SET status = 'Encerrada' WHERE status = 'Fechada'");

  console.log('\nSchema updated successfully.');
  await c.end();
})();
