-- Schema do Banco de Dados para o Backend Rhesult
-- Tabela de Usuários (para autenticação e controle de acesso)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN','RH','GESTOR','COLABORADOR') DEFAULT 'RH',
    cargo VARCHAR(255) NULL,
  avatar_url MEDIUMTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  scope TEXT NULL,
  token_type VARCHAR(30) NULL,
  expiry_date BIGINT NULL,
  calendar_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_google_oauth_user (user_id),
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Tabela de Vagas (Job Openings)
CREATE TABLE IF NOT EXISTS vagas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    tipo_contrato VARCHAR(100) NOT NULL, -- Ex: CLT, PJ, Estágio
    modelo_trabalho VARCHAR(100) NOT NULL, -- Ex: Presencial, Remoto, Híbrido
    senioridade VARCHAR(100) NULL, -- Ex: Júnior, Pleno, Sênior, Especialista
    cidade VARCHAR(255) NULL,
    salario_min DECIMAL(10, 2) NULL,
    salario_max DECIMAL(10, 2) NULL,
    status ENUM('Ativa', 'Pausada', 'Fechada') DEFAULT 'Ativa',
    descricao TEXT NULL,
    descricao_curta VARCHAR(500) NULL,
    responsavel VARCHAR(255) NULL,
    area VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Candidatos
CREATE TABLE IF NOT EXISTS candidatos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    telefone VARCHAR(50) NULL,
    cidade VARCHAR(255) NULL,
    senioridade VARCHAR(100) NULL,
    cargo_desejado VARCHAR(255) NULL,
    vaga_id INT NULL, -- Chave estrangeira para a vaga que o candidato se inscreveu
    etapa VARCHAR(100) DEFAULT 'Inscricao', -- Ex: Inscricao, Triagem, Entrevista RH, Entrevista Técnica, Oferta, Contratado, Rejeitado
    curriculum_url VARCHAR(512) NULL,
    curriculum_text MEDIUMTEXT NULL,
    linkedin VARCHAR(512) NULL,
    pretensao DECIMAL(10, 2) NULL,
    historico TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidato_curriculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidato_id INT NOT NULL,
    public_token VARCHAR(128) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size INT NOT NULL,
    file_data MEDIUMBLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_candidato_curriculos_candidato
      FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
    UNIQUE KEY uq_candidato_curriculos_candidato (candidato_id),
    UNIQUE KEY uq_candidato_curriculos_public_token (public_token),
    INDEX idx_candidato_curriculos_candidato_id (candidato_id),
    INDEX idx_candidato_curriculos_public_token (public_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS entrevistas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidato_id INT NOT NULL,
    vaga_id INT NOT NULL,
    recrutador_id INT NULL,
    tipo ENUM('RH','Tecnica','Gestor') DEFAULT 'RH',
    status ENUM('Agendada','Confirmada','Reagendada','Cancelada','Realizada') DEFAULT 'Agendada',
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME NOT NULL,
    observacoes TEXT NULL,
    meet_link VARCHAR(500) NULL,
    google_event_id VARCHAR(255) NULL,
    google_calendar_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
    FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE CASCADE,
    FOREIGN KEY (recrutador_id) REFERENCES usuarios(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Pareceres (Avaliações de Candidatos)
CREATE TABLE IF NOT EXISTS pareceres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidato_id INT NOT NULL,
    vaga_id INT NOT NULL,
    avaliador_id INT NULL, -- Chave estrangeira para o usuário que fez a avaliação
    conteudo TEXT NOT NULL,
    status ENUM('pendente', 'aprovado', 'reprovado') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
    FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE CASCADE,
    FOREIGN KEY (avaliador_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemplo de dados iniciais (Opcional)
INSERT IGNORE INTO usuarios (nome, email, senha_hash, role) VALUES
('Admin Rhesult', 'admin@rhesult.com', 'hash_seguro_aqui', 'ADMIN');

-- NOTA: Crie usuários via painel admin ou via create-user.js. Nunca commite senhas no repositório.

INSERT IGNORE INTO vagas (id, titulo, tipo_contrato, modelo_trabalho, senioridade, cidade, descricao) VALUES
(1, 'Desenvolvedor Full Stack Pleno', 'CLT', 'Híbrido', 'Pleno', 'São Paulo - SP', 'Desenvolvimento e manutenção de aplicações web.'),
(2, 'Analista de RH Júnior', 'CLT', 'Presencial', 'Júnior', 'Rio de Janeiro - RJ', 'Suporte nos processos de recrutamento e seleção.');

INSERT IGNORE INTO candidatos (id, nome, email, vaga_id, etapa) VALUES
(1, 'João da Silva', 'joao@email.com', 1, 'Entrevista RH'),
(2, 'Maria Souza', 'maria@email.com', 2, 'Triagem');

-- Tabela de Empresas (ERP)
CREATE TABLE IF NOT EXISTS empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(255) NOT NULL,
    cnpj        VARCHAR(30),
    segmento    VARCHAR(120),
    email       VARCHAR(255),
    phone       VARCHAR(50),
    cidade      VARCHAR(120),
    status      VARCHAR(40) DEFAULT 'Ativa',
    descricao   TEXT,
    plan_json         JSON NULL,
    governance_json   JSON NULL,
    security_json     JSON NULL,
    integrations_json JSON NULL,
    mock_json         JSON NULL,
    units_json   JSON NULL,
    depts_json   JSON NULL,
    users_json   JSON NULL,
    audit_json   JSON NULL,
    billing_json JSON NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================
-- Extensoes: qualidade, LGPD, automacao, auditoria
-- =============================
/* Idempotent upgrades for candidatos: add columns only if they don't exist */

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='origem');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN origem VARCHAR(100) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='consentimento');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN consentimento TINYINT(1) DEFAULT 0','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='consentimento_em');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN consentimento_em DATETIME NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='retencao_ate');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN retencao_ate DATETIME NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='anonimizacao_em');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN anonimizacao_em DATETIME NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='excluido_em');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN excluido_em DATETIME NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='duplicado_de');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN duplicado_de INT NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='duplicado_em');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN duplicado_em DATETIME NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='responsavel_id');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN responsavel_id INT NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='primeiro_contato_em');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN primeiro_contato_em DATETIME NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='ultimo_contato_em');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN ultimo_contato_em DATETIME NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='tags_json');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN tags_json JSON NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='curriculum_text');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN curriculum_text MEDIUMTEXT NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Add updated_at column if missing */
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='updated_at');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Add FK for responsavel_id if not exists */
SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='responsavel_id' AND REFERENCED_TABLE_NAME='usuarios');
SET @s := IF(@fk=0,'ALTER TABLE candidatos ADD CONSTRAINT fk_candidatos_responsavel_id FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS candidato_etapas_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidato_id INT NOT NULL,
  etapa VARCHAR(100) NOT NULL,
  user_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX (candidato_id),
  INDEX (etapa),
  INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity VARCHAR(40) NOT NULL,
  entity_id INT NULL,
  action VARCHAR(40) NOT NULL,
  user_id INT NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  payload JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (entity),
  INDEX (entity_id),
  INDEX (user_id),
  INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comunicacoes_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  canal ENUM('email','whatsapp') DEFAULT 'email',
  etapa VARCHAR(100) NULL,
  assunto VARCHAR(255) NULL,
  corpo TEXT NOT NULL,
  ativo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (canal),
  INDEX (etapa),
  INDEX (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comunicacoes_outbox (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidato_id INT NOT NULL,
  canal ENUM('email','whatsapp') DEFAULT 'email',
  assunto VARCHAR(255) NULL,
  corpo TEXT NOT NULL,
  status ENUM('pendente','enviado','erro','cancelado') DEFAULT 'pendente',
  scheduled_at DATETIME NULL,
  sent_at DATETIME NULL,
  error_msg VARCHAR(255) NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX (status),
  INDEX (scheduled_at),
  INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Create indexes if they don't exist */
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND INDEX_NAME='idx_candidatos_duplicado_de');
SET @s := IF(@idx=0,'CREATE INDEX idx_candidatos_duplicado_de ON candidatos (duplicado_de)','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND INDEX_NAME='idx_candidatos_responsavel_id');
SET @s := IF(@idx=0,'CREATE INDEX idx_candidatos_responsavel_id ON candidatos (responsavel_id)','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND INDEX_NAME='idx_candidatos_excluido_em');
SET @s := IF(@idx=0,'CREATE INDEX idx_candidatos_excluido_em ON candidatos (excluido_em)','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND INDEX_NAME='idx_candidatos_consentimento');
SET @s := IF(@idx=0,'CREATE INDEX idx_candidatos_consentimento ON candidatos (consentimento)','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================
-- Extensoes ATS: scoring, agenda integrada e onboarding
-- =============================

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='score_total');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN score_total DECIMAL(5,2) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='score_tecnico');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN score_tecnico DECIMAL(5,2) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='score_comportamental');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN score_comportamental DECIMAL(5,2) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='score_salarial');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN score_salarial DECIMAL(5,2) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='score_prioridade');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN score_prioridade VARCHAR(20) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidatos' AND COLUMN_NAME='score_detalhes_json');
SET @s := IF(@c=0,'ALTER TABLE candidatos ADD COLUMN score_detalhes_json JSON NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='entrevistas' AND COLUMN_NAME='confirmacao_token');
SET @s := IF(@c=0,'ALTER TABLE entrevistas ADD COLUMN confirmacao_token VARCHAR(80) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='entrevistas' AND COLUMN_NAME='confirmacao_status');
SET @s := IF(@c=0,'ALTER TABLE entrevistas ADD COLUMN confirmacao_status VARCHAR(40) DEFAULT ''Pendente''','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='entrevistas' AND COLUMN_NAME='confirmado_em');
SET @s := IF(@c=0,'ALTER TABLE entrevistas ADD COLUMN confirmado_em DATETIME NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='entrevistas' AND COLUMN_NAME='provider_integracao');
SET @s := IF(@c=0,'ALTER TABLE entrevistas ADD COLUMN provider_integracao VARCHAR(40) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='entrevistas' AND COLUMN_NAME='provider_event_id');
SET @s := IF(@c=0,'ALTER TABLE entrevistas ADD COLUMN provider_event_id VARCHAR(255) NULL','SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS agenda_integracoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entrevista_id INT NOT NULL,
  provider ENUM('google','microsoft') NOT NULL,
  external_event_id VARCHAR(255) NOT NULL,
  external_calendar_id VARCHAR(255) NULL,
  sync_status ENUM('pendente','sincronizado','erro') DEFAULT 'pendente',
  payload_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (entrevista_id) REFERENCES entrevistas(id) ON DELETE CASCADE,
  INDEX idx_agenda_integracoes_entrevista (entrevista_id),
  INDEX idx_agenda_integracoes_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comunicacoes_automacoes_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidato_id INT NOT NULL,
  etapa VARCHAR(100) NOT NULL,
  template_id INT NOT NULL,
  outbox_id INT NULL,
  canal ENUM('email','whatsapp') DEFAULT 'email',
  status VARCHAR(40) DEFAULT 'gerado',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES comunicacoes_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (outbox_id) REFERENCES comunicacoes_outbox(id) ON DELETE SET NULL,
  INDEX idx_auto_log_candidato (candidato_id),
  INDEX idx_auto_log_etapa (etapa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS onboarding_processos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidato_id INT NOT NULL,
  vaga_id INT NULL,
  responsavel_id INT NULL,
  colaborador_nome VARCHAR(255) NOT NULL,
  colaborador_email VARCHAR(255) NULL,
  data_admissao DATE NULL,
  status ENUM('ativo','concluido','cancelado') DEFAULT 'ativo',
  progresso_percentual DECIMAL(5,2) DEFAULT 0,
  dp_integracao_status ENUM('pendente','integrado','erro') DEFAULT 'pendente',
  assinatura_status ENUM('pendente','parcial','concluida') DEFAULT 'pendente',
  observacoes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_onboarding_processo_candidato (candidato_id),
  INDEX idx_onboarding_processo_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS onboarding_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  processo_id INT NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NULL,
  obrigatorio TINYINT(1) DEFAULT 1,
  status ENUM('pendente','em_andamento','concluido','bloqueado') DEFAULT 'pendente',
  concluido_em DATETIME NULL,
  responsavel_nome VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (processo_id) REFERENCES onboarding_processos(id) ON DELETE CASCADE,
  INDEX idx_onboarding_item_processo (processo_id),
  INDEX idx_onboarding_item_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS onboarding_documentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  processo_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(80) NULL,
  arquivo_url VARCHAR(600) NULL,
  assinatura_status ENUM('pendente','assinado') DEFAULT 'pendente',
  assinado_por VARCHAR(255) NULL,
  assinado_em DATETIME NULL,
  dp_sync_status ENUM('pendente','sincronizado','erro') DEFAULT 'pendente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (processo_id) REFERENCES onboarding_processos(id) ON DELETE CASCADE,
  INDEX idx_onboarding_doc_processo (processo_id),
  INDEX idx_onboarding_doc_assinatura (assinatura_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
