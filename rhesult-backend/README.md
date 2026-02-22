# Rhesult Backend

Backend Express.js para a plataforma Rhesult de gestão de RH.

## Pré-requisitos

- Node.js 16+
- MySQL 8+ com banco de dados `rhesult` já criado
- Schema importado: `database/rhesult_schema.sql`

## Instalação

```bash
npm install
```

## Configuração

Edite o arquivo `.env` com suas credenciais de banco de dados:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=rhesult
PORT=4000
```

### Envio WhatsApp (retorno de entrevistados)

Para envio automático via API externa de WhatsApp (ex.: MyZap/WPPConnect), configure:

```env
WHATSAPP_API_URL=https://sua-api-whatsapp/send
WHATSAPP_API_TOKEN=Bearer seu_token_aqui
WHATSAPP_API_AUTH_HEADER=Authorization
WHATSAPP_TO_FIELD=phone
WHATSAPP_MESSAGE_FIELD=message
WHATSAPP_INSTANCE=opcional
WHATSAPP_API_TIMEOUT_MS=12000
WHATSAPP_API_EXTRA_JSON={"isGroup":false}
```

Observações:
- Se `WHATSAPP_API_URL` não estiver definida, o sistema apenas registra na outbox.
- O telefone do candidato é normalizado para formato numérico (com prefixo `55` quando aplicável).
- O status na `comunicacoes_outbox` passa a `enviado` (sucesso) ou `erro` (falha no provider).

## Executar

```bash
npm start
```

O servidor estará disponível em: **http://localhost:4000**

## API Endpoints

### Autenticação
- `POST /auth/login` - Fazer login
  - Body: `{ email, senha }`

### Vagas
- `GET /api/vagas` - Listar todas as vagas
- `GET /api/vagas/:id` - Obter uma vaga específica
- `POST /api/vagas` - Criar nova vaga
- `PUT /api/vagas/:id` - Atualizar vaga
- `DELETE /api/vagas/:id` - Deletar vaga

### Health
- `GET /health` - Verificar status do servidor

## Credenciais de Teste

```
Email: matheusddresch@hotmail.com
Senha: 134679
```
