# Como fazer Deploy do Backend no Railway 🚀

O projeto `rhesult-backend` está configurado para deploy fácil no Railway.

## Pré-requisitos
- Conta no [Railway](https://railway.app?referralCode=rhesult).
- Código enviado para um repositório Git (GitHub).
- Banco de Dados MySQL criado no Railway.

## Passo 1: Configuração do Projeto
1. Verifique se o arquivo `railway.json` contém as configurações de build e start.
2. Certifique-se de que o `Procfile` define o comando de execução.

## Passo 2: Environment Variables
No dashboard do Railway, configure as variáveis de ambiente necessárias:
- `DATABASE_URL` ou `MYSQL_URL`: A string de conexão completa do seu banco de dados MySQL no Railway (formato: `mysql://USER:PASSWORD@HOST:PORT/DATABASE`).
- `PORT`: (Opcional, o Railway define automaticamente, mas certifique-se de que o código lê `process.env.PORT`).

## Passo 3: Deploy via GitHub
1. Conecte sua conta do GitHub ao Railway.
2. Crie um novo projeto no Railway e selecione "Deploy from GitHub repo".
3. Escolha o repositório `rhesult-backend` (ou o repositório raiz se estiver tudo junto).
4. O Railway detectará o arquivo `Procfile` ou `railway.json` e iniciará o deploy.

## Passo 4: Migração do Banco de Dados
Após o deploy, você precisará criar as tabelas no banco de dados.
Opção A (Local):
- Configure o `.env` local com a connection string do Railway.
- Execute `npm run import:schema`.

Opção B (Via Railway CLI):
- Se tiver o CLI instalado: `railway run npm run import:schema`.

Opção C (Console):
- Conecte-se ao banco via client MySQL (DBeaver, Workbench) usando as credenciais do Railway e execute o script `database/rhesult_schema.sql` (disponível no frontend do projeto).

## Verificação
Após o deploy, verifique os logs no dashboard do Railway para confirmar que o servidor iniciou corretamento na porta definida.
