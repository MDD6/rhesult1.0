# RHesult 2.0

A RHesult 2.0 é uma plataforma web moderna de recrutamento e seleção que conecta empresas e candidatos por meio de um ecossistema digital inteligente, automatizado e orientado por dados.

## 🎯 Objetivo da aplicação

Desenvolver uma plataforma ATS (Applicant Tracking System) com:

- Publicação dinâmica de vagas
- Banco de talentos centralizado
- Candidatura online com upload de currículo
- Automação de triagem
- Dashboards analíticos
- Integrações com APIs externas (WhatsApp, Google, etc.)
- Interface moderna com UX premium (glassmorphism + Tailwind)

## 🧩 Principais módulos

### 1) Landing institucional

- Apresentação da RHesult
- Seções de serviços e liderança
- Prova social com logos em marquee
- CTAs estratégicos
- Design responsivo com visual premium

### 2) Módulo de Vagas

Funcionalidades:

- Listagem dinâmica de vagas via API
- Filtros por cidade, modelo, senioridade e contrato
- Badge de vaga nova
- Faixa salarial
- Modal de candidatura
- Atualização automática (polling)

Status considerados ativos:

- Ativa
- Aberta
- Recebendo Currículos
- Triagem
- Entrevista RH
- Entrevista Gestor

### 3) Candidatura online

Fluxo do candidato:

- Preenchimento de dados pessoais
- Upload de currículo (`multipart/form-data`)
- Consentimento LGPD
- Envio para endpoint `/public/candidatos`
- Feedback visual de sucesso/erro

Objetivo: reduzir fricção e aumentar conversão de candidatos qualificados.

### 4) Banco de Talentos

- Centralização de candidatos
- Reuso da base para vagas futuras
- Estrutura preparada para scoring/classificação por IA
- Integração futura com People Analytics

### 5) Camada de integração

Plataforma preparada para integração com:

- API própria de vagas
- WhatsApp automation
- Google Calendar (entrevistas)
- Ferramentas ATS
- OpenAI para triagem inteligente (futuro)

## 🏗️ Arquitetura técnica

### Frontend

- Next.js (App Router)
- React
- Tailwind CSS
- Glassmorphism UI
- Componentização modular
- Polling de dados
- Service Worker (PWA-ready)

### Backend (esperado)

- API REST
- Endpoint de vagas
- Endpoint de candidatos (multipart)
- Estrutura preparada para autenticação futura

## 🎨 Diferenciais de UX/UI

- Visual premium e corporativo
- Hero com overlay profissional
- Componentes glass
- Marquee de clientes
- Cards interativos de vagas
- Microinterações suaves
- Responsividade total
- Performance otimizada

## 📈 Objetivo estratégico

A RHesult 2.0 não é apenas um site de vagas, mas uma plataforma de inteligência em recrutamento para:

- Reduzir o time-to-hire
- Aumentar a qualidade das contratações
- Melhorar a experiência do candidato
- Dar previsibilidade ao RH
- Escalar operações de recrutamento

---

## 🚀 Executando o projeto

### 1) Frontend

```bash
cd rhesult-web
npm install
npm run dev
```

### 2) Configurar backend no frontend

No arquivo `.env.local` do frontend:

```env
API_BASE=http://localhost:4000
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### 3) Backend

```bash
cd rhesult-backend
npm install
npm start
```

### 4) Banco de dados

Schema SQL disponível em [database/rhesult_schema.sql](database/rhesult_schema.sql).

Aplicação (MySQL):

```bash
mysql -u seu_usuario -p seu_banco < database/rhesult_schema.sql
```
