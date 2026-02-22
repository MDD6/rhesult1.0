const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importSchema() {
  let connection;
  
  try {
    let connection;
    console.log(`🔌 Tentando conectar...`);

    if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
      const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
      // mysql2 expects the connection string as the first argument if provided, or we can parse it.
      // But let's use the object form with the dedicated 'uri' property if supported, or just pass the string.
      // createConnection(string) is supported.
      connection = await mysql.createConnection(url);
    } else {
      const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        multipleStatements: true,
      };
      connection = await mysql.createConnection(dbConfig);
    }
    
    console.log(`✅ Conectado ao MySQL`);

    // Ler arquivo SQL
    const schemaPath = path.join(__dirname, '../rhesult-web/database/rhesult_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('📄 Arquivo SQL carregado de:', schemaPath);
    
    // Conectar ao DB especifico (não mais necessario se passamos database no config)
    // await connection.query(`USE ${process.env.DB_NAME}`);
    
    // Dividir comandos (simplificado - não lida com strings complexas)
    const commands = schema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📋 ${commands.length} comandos encontrados\n`);

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      try {
        await connection.query(command);
        console.log(`✓ [${i + 1}/${commands.length}] Executado`);
      } catch (error) {
        // Ignorar erros de "já existe" (DUPLICATE KEY, etc)
        if (error.code === 'ER_DB_CREATE_EXISTS' || error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          console.log(`⊘ [${i + 1}/${commands.length}] Já existe (ignorado)`);
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

importSchema();
