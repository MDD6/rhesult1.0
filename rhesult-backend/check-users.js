const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  try {
    const connectionConfig = process.env.DATABASE_URL || process.env.MYSQL_URL
      ? (process.env.DATABASE_URL || process.env.MYSQL_URL)
      : {
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'rhesult',
          port: Number(process.env.DB_PORT || 3306),
        };

    const connection = await mysql.createConnection(connectionConfig);

    console.log('✅ Conectado ao banco de dados\n');

    const [users] = await connection.execute(
      'SELECT id, nome, email, senha_hash, role FROM usuarios'
    );

    console.log('📋 Usuários no banco de dados:');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    users.forEach((user, index) => {
      console.log(`[${index + 1}] ID: ${user.id}`);
      console.log(`    Nome: ${user.nome}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Hash: ${user.senha_hash.substring(0, 32)}...`);
      console.log('');
    });

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkUsers();
