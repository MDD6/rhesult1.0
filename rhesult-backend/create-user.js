const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createUser() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '12345678',
      database: 'rhesult',
    });

    console.log('✅ Conectado ao banco de dados\n');

    // Hash bcrypt da senha '134679'
    const email = 'matheusddresch@hotmail.com';
    const senha = '134679';
    const senhaHash = await bcrypt.hash(senha, 12);

    console.log(`📝 Criando usuário:`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${senha}`);
    console.log(`   Hash: ${senhaHash}\n`);

    const [result] = await connection.execute(
      `INSERT INTO usuarios (nome, email, senha_hash, role) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       nome = VALUES(nome), 
       senha_hash = VALUES(senha_hash), 
       role = VALUES(role)`,
      ['Matheus Dresch', email, senhaHash, 'RH']
    );

    console.log('✅ Usuário inserido/atualizado com sucesso!');
    console.log(`   Rows affected: ${result.affectedRows}\n`);

    // Verificar que foi inserido
    const [users] = await connection.execute(
      'SELECT id, nome, email, role FROM usuarios WHERE email = ?',
      [email]
    );

    if (users.length > 0) {
      console.log('✓ Verificação - Usuário encontrado no banco:');
      console.log(`  ID: ${users[0].id}`);
      console.log(`  Nome: ${users[0].nome}`);
      console.log(`  Email: ${users[0].email}`);
      console.log(`  Role: ${users[0].role}`);
    }

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

createUser();
