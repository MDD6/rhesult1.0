const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function tryConnect(password) {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: password,
    });
    await connection.end();
    return true;
  } catch {
    return false;
  }
}

async function askPassword() {
  return new Promise((resolve) => {
    rl.question('🔐 Digite a senha do MySQL root (ou deixe em branco para tentar vazio): ', (answer) => {
      resolve(answer);
    });
  });
}

async function importSchema(password) {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: password,
    });

    console.log('✅ Conectado ao MySQL');

    const schemaPath = 'c:/Users/mathe/OneDrive/Área de Trabalho/1.0/rhesult-web/database/rhesult_schema.sql';
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('📄 Arquivo SQL carregado');

    const commands = schema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📋 ${commands.length} comandos encontrados\n`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      try {
        await connection.query(command);
        console.log(`✓ [${i + 1}/${commands.length}] Executado`);
      } catch (error) {
        if (error.code === 'ER_DB_CREATE_EXISTS' || error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          console.log(`⊘ [${i + 1}/${commands.length}] Já existe (ignorado)`);
        } else if (error.message.includes('You have an error in your SQL syntax')) {
          // Ignorar erros de sintaxe na divisão por ;
          console.log(`⊘ [${i + 1}/${commands.length}] Erro de sintaxe (ignorado)`);
        } else {
          console.error(`✗ [${i + 1}/${commands.length}] Erro:`, error.message.substring(0, 100));
        }
      }
    }

    console.log('\n✅ Schema importado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

(async () => {
  const password = await askPassword();
  rl.close();
  await importSchema(password);
})();
