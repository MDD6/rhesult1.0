const express = require('express');
const cors = require('cors');
const http = require('http'); // HTTP server
const { Server } = require("socket.io"); // Socket.IO
const bodyParser = require('body-parser');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // Trust Railway reverse proxy
const server = http.createServer(app); // Create HTTP server
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim()).filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

// Attach io to req for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  const userData = getTokenData(token);
  if (!userData) {
    return next(new Error('Invalid or expired token'));
  }
  socket.authUser = userData;
  next();
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('🔌 Client connected via Socket.IO:', socket.id, '- user:', socket.authUser?.nome);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const pool = require('./database');
const { createVagasService } = require('./src/services/VagasService');
const { createVagasController } = require('./src/controllers/VagasController');

const UPLOADS_ROOT = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
const CURRICULA_DIR = path.join(UPLOADS_ROOT, 'curriculos');
const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');

fs.mkdirSync(CURRICULA_DIR, { recursive: true });
fs.mkdirSync(AVATARS_DIR, { recursive: true });

const ALLOWED_FILE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_FILE_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

const curriculumStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CURRICULA_DIR);
  },
  filename: (req, file, cb) => {
    const originalExtension = path.extname(file.originalname || '').toLowerCase();
    const safeExtension = ALLOWED_FILE_EXTENSIONS.has(originalExtension) ? originalExtension : '.bin';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExtension}`;
    cb(null, uniqueName);
  },
});

const curriculumUpload = multer({
  storage: curriculumStorage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const allowedByMime = ALLOWED_FILE_MIME_TYPES.has(file.mimetype);
    const allowedByExtension = ALLOWED_FILE_EXTENSIONS.has(extension);

    if (allowedByMime && allowedByExtension) {
      return cb(null, true);
    }

    return cb(new Error('Formato de arquivo inválido. Envie PDF, DOC ou DOCX.'));
  },
});

const AVATAR_ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATARS_DIR);
  },
  filename: (req, file, cb) => {
    const originalExtension = path.extname(file.originalname || '').toLowerCase();
    const normalizedExtension = originalExtension === '.jpeg' ? '.jpg' : originalExtension;
    const safeExtension = AVATAR_ALLOWED_EXTENSIONS.has(normalizedExtension) ? normalizedExtension : '.jpg';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExtension}`;
    cb(null, uniqueName);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    console.log('Avatar upload file:', file);
    const extension = path.extname(file.originalname || '').toLowerCase();
    const normalizedExtension = extension === '.jpeg' ? '.jpg' : extension;
    const allowedByMime = AVATAR_ALLOWED_MIME_TYPES.has(file.mimetype);
    const allowedByExtension = AVATAR_ALLOWED_EXTENSIONS.has(normalizedExtension);

    if (allowedByMime && allowedByExtension) {
      return cb(null, true);
    }

    return cb(new Error('Formato de avatar inválido. Envie JPG, PNG ou WEBP.'));
  },
});

function handleCurriculumUpload(req, res) {
  return new Promise((resolve, reject) => {
    curriculumUpload.single('curriculum_file')(req, res, (error) => {
      if (!error) {
        resolve();
        return;
      }

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          reject({ status: 400, message: 'Arquivo muito grande. Limite de 8MB.' });
          return;
        }

        reject({ status: 400, message: `Falha no upload: ${error.message}` });
        return;
      }

      reject({ status: 400, message: error.message || 'Falha ao processar upload de currículo.' });
    });
  });
}

function handleAvatarUpload(req, res) {
  return new Promise((resolve, reject) => {
    avatarUpload.single('avatar_file')(req, res, (error) => {
      if (!error) {
        resolve();
        return;
      }

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          reject({ status: 400, message: 'Avatar muito grande. Limite de 5MB.' });
          return;
        }

        reject({ status: 400, message: `Falha no upload do avatar: ${error.message}` });
        return;
      }

      reject({ status: 400, message: error.message || 'Falha ao processar upload de avatar.' });
    });
  });
}

// Middleware
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.text());
app.use('/uploads', express.static(UPLOADS_ROOT));


const PORT = process.env.PORT || 4000;

// ==================== TOKEN STORAGE / JWT ====================

// In-memory token storage (for development - use Redis/DB in production)
const tokenStore = new Map();
// Track revoked tokens to make logout effective even with JWT fallback
const revokedTokens = new Map();

const TOKEN_TTL_HOURS = Number(process.env.TOKEN_TTL_HOURS || 24);
const TOKEN_TTL_MS = TOKEN_TTL_HOURS * 60 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || 'rhesult_secret_key_2024';

function storeToken(token, userData) {
  tokenStore.set(token, {
    ...userData,
    createdAt: Date.now(),
  });
  revokedTokens.delete(token);
}

function signToken(userData) {
  return jwt.sign(
    {
      id: userData.id,
      nome: userData.nome,
      email: userData.email,
      role: userData.role,
      avatar_url: userData.avatar_url || null,
      cargo: userData.cargo || null,
    },
    JWT_SECRET,
    { expiresIn: `${TOKEN_TTL_HOURS}h` }
  );
}

function getTokenData(token) {
  const data = tokenStore.get(token);
  if (data) {
    if (Date.now() - data.createdAt > TOKEN_TTL_MS) {
      tokenStore.delete(token);
    } else {
      return data;
    }
  }

  // If token was revoked, block even if JWT is still within exp
  const revokedAt = revokedTokens.get(token);
  if (revokedAt) {
    if (Date.now() - revokedAt > TOKEN_TTL_MS) {
      revokedTokens.delete(token);
    } else {
      return null;
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch (err) {
    return null;
  }
}

function revokeToken(token) {
  tokenStore.delete(token);
  revokedTokens.set(token, Date.now());
  return true;
}

// Purge expired tokens every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now - data.createdAt > TOKEN_TTL_MS) {
      tokenStore.delete(token);
    }
  }

  for (const [token, revokedAt] of revokedTokens.entries()) {
    if (now - revokedAt > TOKEN_TTL_MS) {
      revokedTokens.delete(token);
    }
  }
}, 30 * 60 * 1000);

function extractToken(authHeader, cookiesHeader) {
  // Prefer Authorization header
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
      return parts[1];
    }
  }

  // Fallback: read from cookie (aligns with frontend cookie name)
  if (cookiesHeader) {
    const cookieName = process.env.AUTH_COOKIE_NAME || 'rhesult_token';
    const cookies = cookiesHeader.split(';').map((c) => c.trim());
    const match = cookies.find((c) => c.startsWith(`${cookieName}=`));
    if (match) {
      return match.substring(cookieName.length + 1);
    }
  }

  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization, req.headers.cookie);

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const userData = getTokenData(token);
  if (!userData) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  req.authToken = token;
  req.authUser = userData;
  return next();
}

function requireRoles(roles = []) {
  const allowed = new Set(roles.map((role) => String(role || '').toLowerCase()));

  return (req, res, next) => {
    const currentRole = String(req.authUser?.role || '').toLowerCase();
    if (!allowed.has(currentRole)) {
      return res.status(403).json({ error: 'Sem permissão para executar esta ação.' });
    }

    return next();
  };
}

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
  },
});

// ==================== HELPERS ====================

const parsedBcryptRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
const BCRYPT_SALT_ROUNDS = Number.isInteger(parsedBcryptRounds) && parsedBcryptRounds >= 8 && parsedBcryptRounds <= 15
  ? parsedBcryptRounds
  : 12;

function hashPasswordLegacySha256(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

function isBcryptHash(hash) {
  return /^\$2[aby]\$\d{2}\$/.test(String(hash || ''));
}

async function verifyPassword(senha, hash) {
  const safeHash = String(hash || '').trim();

  if (!safeHash) {
    return { valid: false, needsRehash: false };
  }

  if (isBcryptHash(safeHash)) {
    const valid = await bcrypt.compare(String(senha), safeHash);
    return { valid, needsRehash: false };
  }

  const valid = hashPasswordLegacySha256(String(senha)) === safeHash;
  return { valid, needsRehash: valid };
}

function normalizeStatus(statusInput) {
  const value = String(statusInput || '').trim().toLowerCase();

  if (value === 'pausada') return 'Pausada';
  if (value === 'fechada') return 'Fechada';

  return 'Ativa';
}

function normalizeEtapa(etapaInput) {
  const value = String(etapaInput || '').trim();
  if (!value) return 'Inscricao';
  return value;
}

function normalizeCanal(canalInput) {
  const value = String(canalInput || '').trim().toLowerCase();
  return value === 'whatsapp' ? 'whatsapp' : 'email';
}

function normalizeWhatsappPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;

  return digits;
}

function getWhatsappProviderConfig() {
  const endpoint = String(process.env.WHATSAPP_API_URL || '').trim();
  const token = String(process.env.WHATSAPP_API_TOKEN || '').trim();
  const authHeader = String(process.env.WHATSAPP_API_AUTH_HEADER || 'Authorization').trim();
  const toField = String(process.env.WHATSAPP_TO_FIELD || 'phone').trim();
  const messageField = String(process.env.WHATSAPP_MESSAGE_FIELD || 'message').trim();
  const timeoutMs = Number(process.env.WHATSAPP_API_TIMEOUT_MS || 12000);
  const instance = String(process.env.WHATSAPP_INSTANCE || '').trim();
  const extraJson = String(process.env.WHATSAPP_API_EXTRA_JSON || '').trim();

  let extraPayload = null;
  if (extraJson) {
    try {
      extraPayload = JSON.parse(extraJson);
    } catch {
      extraPayload = null;
    }
  }

  return {
    endpoint,
    token,
    authHeader,
    toField: toField || 'phone',
    messageField: messageField || 'message',
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 12000,
    instance,
    extraPayload: extraPayload && typeof extraPayload === 'object' ? extraPayload : null,
  };
}

async function sendWhatsappMessage({ phone, body }) {
  const config = getWhatsappProviderConfig();
  if (!config.endpoint) {
    return {
      attempted: false,
      delivered: false,
      message: 'WHATSAPP_API_URL não configurada.',
    };
  }

  const normalizedPhone = normalizeWhatsappPhone(phone);
  if (!normalizedPhone) {
    return {
      attempted: true,
      delivered: false,
      message: 'Telefone do candidato ausente ou inválido para WhatsApp.',
    };
  }

  const payload = {
    [config.toField]: normalizedPhone,
    [config.messageField]: String(body || '').trim(),
  };

  if (config.instance) {
    payload.instance = config.instance;
  }

  if (config.extraPayload) {
    Object.assign(payload, config.extraPayload);
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (config.token) {
    headers[config.authHeader] = config.token;
  }

  let response;
  try {
    response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    return {
      attempted: true,
      delivered: false,
      message: error?.message || 'Falha ao conectar com a API de WhatsApp.',
    };
  }

  const rawText = await response.text();
  if (!response.ok) {
    return {
      attempted: true,
      delivered: false,
      message: `API WhatsApp retornou ${response.status}: ${rawText || 'sem detalhes'}`,
    };
  }

  return {
    attempted: true,
    delivered: true,
    message: 'Mensagem enviada via WhatsApp com sucesso.',
    providerResponse: rawText || null,
  };
}

function toMySqlDateTime(input) {
  if (!input) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeInterviewType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'tecnica' || normalized === 'técnica') return 'Tecnica';
  if (normalized === 'gestor') return 'Gestor';
  return 'RH';
}

function normalizeInterviewStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'confirmada') return 'Confirmada';
  if (normalized === 'reagendada') return 'Reagendada';
  if (normalized === 'cancelada') return 'Cancelada';
  if (normalized === 'realizada') return 'Realizada';
  return 'Agendada';
}

function combineDateAndTime(date, time) {
  if (!date || !time) return null;
  return toMySqlDateTime(`${date}T${time}:00`);
}

let parecerTablesReady = false;

async function ensureParecerSupportTables(connection) {
  if (parecerTablesReady) return;

  await connection.execute(
    `CREATE TABLE IF NOT EXISTS pareceres_comentarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parecer_id INT NOT NULL,
      usuario_id INT NULL,
      texto TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parecer_id) REFERENCES pareceres(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
      INDEX (parecer_id),
      INDEX (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await connection.execute(
    `CREATE TABLE IF NOT EXISTS pareceres_versoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parecer_id INT NOT NULL,
      conteudo LONGTEXT NOT NULL,
      status VARCHAR(40) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parecer_id) REFERENCES pareceres(id) ON DELETE CASCADE,
      INDEX (parecer_id),
      INDEX (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  parecerTablesReady = true;
}

let hiringAutomationTablesReady = false;
let onboardingTablesReady = false;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function scorePriority(scoreTotal) {
  if (scoreTotal >= 80) return 'Alta';
  if (scoreTotal >= 60) return 'Media';
  return 'Baixa';
}

function roundScore(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
}

function scoreSenioridade(candidateSenioridade, vagaSenioridade) {
  const c = normalizeText(candidateSenioridade);
  const v = normalizeText(vagaSenioridade);
  if (!c || !v) return 60;
  if (c === v) return 100;

  const levels = ['estagiario', 'junior', 'pleno', 'senior', 'especialista'];
  const cIndex = levels.findIndex((item) => c.includes(item));
  const vIndex = levels.findIndex((item) => v.includes(item));

  if (cIndex === -1 || vIndex === -1) return 65;
  const distance = Math.abs(cIndex - vIndex);
  if (distance === 1) return 80;
  if (distance === 2) return 60;
  return 40;
}

function scoreCargoAderencia(cargoDesejado, vagaTitulo) {
  const cargo = normalizeText(cargoDesejado);
  const titulo = normalizeText(vagaTitulo);
  if (!cargo || !titulo) return 60;

  const cargoTokens = cargo.split(/\s+/).filter((token) => token.length > 3);
  if (!cargoTokens.length) return 60;

  const matchedTokens = cargoTokens.filter((token) => titulo.includes(token));
  const ratio = matchedTokens.length / cargoTokens.length;

  if (ratio >= 0.7) return 100;
  if (ratio >= 0.4) return 80;
  if (ratio > 0) return 65;
  return 45;
}

function scoreComportamental(candidate) {
  let points = 0;
  if (String(candidate.linkedin || '').trim()) points += 25;
  if (String(candidate.historico || '').trim()) points += 30;
  if (String(candidate.telefone || '').trim()) points += 20;
  if (String(candidate.cidade || '').trim()) points += 15;
  if (String(candidate.curriculum_url || '').trim() || String(candidate.curriculum_text || '').trim()) points += 10;
  return Math.min(100, points);
}

function scoreSalarial(pretensao, salarioMin, salarioMax) {
  const pret = Number(pretensao);
  const min = Number(salarioMin);
  const max = Number(salarioMax);

  if (!Number.isFinite(pret)) return 60;
  if (!Number.isFinite(min) && !Number.isFinite(max)) return 60;

  if (Number.isFinite(min) && Number.isFinite(max) && pret >= min && pret <= max) {
    return 100;
  }

  const lower = Number.isFinite(min) ? min : max;
  const upper = Number.isFinite(max) ? max : min;

  let diff = 0;
  let base = 1;
  if (pret < lower) {
    diff = lower - pret;
    base = Math.max(1, lower);
  } else if (pret > upper) {
    diff = pret - upper;
    base = Math.max(1, upper);
  }

  const ratio = diff / base;
  const score = Math.max(0, 100 - ratio * 100);
  return roundScore(score);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyTemplateVariables(template, variables) {
  return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, rawKey) => {
    const key = String(rawKey || '').trim();
    const value = variables[key];
    if (value === undefined || value === null) return '';
    return escapeHtml(String(value));
  });
}

function createPublicInterviewToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getPublicAppBase() {
  const configured = String(
    process.env.PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || ''
  ).trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

function buildInterviewActionUrl(interviewId, token, action) {
  const base = getPublicAppBase();
  return `${base}/api/public/entrevistas/${interviewId}/${action}?token=${token}`;
}

async function ensureHiringAutomationTables(connection) {
  if (hiringAutomationTablesReady) return;

  const addColumnIfMissing = async (tableName, columnName, columnDefinition) => {
    const [columnRows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );

    const exists = Number(columnRows?.[0]?.total || 0) > 0;
    if (exists) return;

    await connection.execute(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
    );
  };

  await addColumnIfMissing('candidatos', 'score_total', 'DECIMAL(5,2) NULL');
  await addColumnIfMissing('candidatos', 'score_tecnico', 'DECIMAL(5,2) NULL');
  await addColumnIfMissing('candidatos', 'score_comportamental', 'DECIMAL(5,2) NULL');
  await addColumnIfMissing('candidatos', 'score_salarial', 'DECIMAL(5,2) NULL');
  await addColumnIfMissing('candidatos', 'score_prioridade', 'VARCHAR(20) NULL');
  await addColumnIfMissing('candidatos', 'score_detalhes_json', 'JSON NULL');

  await addColumnIfMissing('entrevistas', 'confirmacao_token', 'VARCHAR(80) NULL');
  await addColumnIfMissing('entrevistas', 'confirmacao_status', "VARCHAR(40) DEFAULT 'Pendente'");
  await addColumnIfMissing('entrevistas', 'confirmado_em', 'DATETIME NULL');
  await addColumnIfMissing('entrevistas', 'provider_integracao', 'VARCHAR(40) NULL');
  await addColumnIfMissing('entrevistas', 'provider_event_id', 'VARCHAR(255) NULL');

  await connection.execute(`
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
      CONSTRAINT fk_agenda_integracoes_entrevista FOREIGN KEY (entrevista_id) REFERENCES entrevistas(id) ON DELETE CASCADE,
      INDEX idx_agenda_integracoes_entrevista (entrevista_id),
      INDEX idx_agenda_integracoes_provider (provider)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.execute(`
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
      INDEX idx_comunicacoes_auto_candidato (candidato_id),
      INDEX idx_comunicacoes_auto_etapa (etapa)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  hiringAutomationTablesReady = true;
}

async function ensureOnboardingTables(connection) {
  if (onboardingTablesReady) return;

  await connection.execute(`
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
      INDEX idx_onboarding_candidato (candidato_id),
      INDEX idx_onboarding_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.execute(`
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
      INDEX idx_onboarding_itens_processo (processo_id),
      INDEX idx_onboarding_itens_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.execute(`
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
      INDEX idx_onboarding_docs_processo (processo_id),
      INDEX idx_onboarding_docs_assinatura (assinatura_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  onboardingTablesReady = true;
}

// ==================== DB / ROUTE HELPERS ====================

/**
 * Ensures all dynamic tables exist once at startup (or lazily on first use).
 * Returns the connection used so the caller can release it.
 */
async function ensureAllTables() {
  let connection;
  try {
    connection = await pool.getConnection();
    // Ensure 'cargo' column exists on usuarios
    const [cols] = await connection.execute(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'cargo'`
    );
    if (cols[0].c === 0) {
      await connection.execute('ALTER TABLE usuarios ADD COLUMN cargo VARCHAR(255) NULL');
    }
    await ensureHiringAutomationTables(connection);
    await ensureOnboardingTables(connection);
    await ensureParecerSupportTables(connection);
    console.log('✅ Todas as tabelas dinâmicas garantidas.');
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Higher-order function that wraps a route handler with:
 *  - Automatic connection acquire / release
 *  - Centralized error handling with console.error + 500 response
 *
 * The handler receives `(req, res, connection)`.
 */
function withConnection(handler) {
  return async (req, res, next) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await handler(req, res, connection);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        const statusCode = Number.isInteger(error?.status) ? error.status : 500;
        const message = statusCode < 500 && error?.message
          ? error.message
          : 'Erro interno do servidor.';
        res.status(statusCode).json({ error: message });
      }
    } finally {
      if (connection) connection.release();
    }
  };
}

/**
 * Throws an error with a given status code.
 * Used inside `withConnection` handlers to trigger 4xx responses.
 */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

// ==================== SQL QUERY CONSTANTS ====================

const CANDIDATE_SELECT = `
  SELECT c.id, c.nome, c.email, c.telefone, c.cidade, c.senioridade,
         c.cargo_desejado, c.vaga_id, c.etapa,
         c.curriculum_url, c.linkedin, c.historico, c.origem, c.pretensao,
         c.score_total, c.score_tecnico, c.score_comportamental, c.score_salarial,
         c.score_prioridade, c.score_detalhes_json,
         c.created_at AS criado_em,
         v.titulo AS vaga_titulo
  FROM candidatos c
  LEFT JOIN vagas v ON v.id = c.vaga_id`;

async function fetchCandidateById(connection, id) {
  const [rows] = await connection.execute(
    `${CANDIDATE_SELECT} WHERE c.id = ? LIMIT 1`, [id]
  );
  return rows[0] || null;
}

const ENTREVISTA_SELECT = `
  SELECT e.id, e.candidato_id, e.vaga_id, e.recrutador_id, e.tipo, e.status,
         e.data_inicio, e.data_fim, e.observacoes, e.meet_link,
         e.google_event_id, e.google_calendar_id,
         e.confirmacao_status, e.confirmado_em, e.provider_integracao, e.provider_event_id,
         e.created_at, e.updated_at,
         c.nome AS candidato_nome, c.telefone AS candidato_telefone,
         v.titulo AS vaga_titulo
  FROM entrevistas e
  INNER JOIN candidatos c ON c.id = e.candidato_id
  INNER JOIN vagas v ON v.id = e.vaga_id`;

const PARECER_SELECT = `
  SELECT p.id, p.candidato_id, p.vaga_id, p.avaliador_id, p.conteudo, p.status,
         p.created_at,
         p.created_at AS updated_at,
         c.nome AS candidato_nome,
         v.titulo AS vaga_titulo,
         u.nome AS avaliador_nome
  FROM pareceres p
  LEFT JOIN candidatos c ON c.id = p.candidato_id
  LEFT JOIN vagas v ON v.id = p.vaga_id
  LEFT JOIN usuarios u ON u.id = p.avaliador_id`;

const TEMPLATE_COLUMNS = 'id, nome, canal, etapa, assunto, corpo, ativo, created_at, updated_at';

// ==================== DOMAIN HELPERS ====================

/**
 * Handles the etapa transition side-effects:
 *  - Queues automation messages when the stage changes
 *  - Creates an onboarding process when candidate reaches "contratado"
 */
async function handleEtapaTransition(connection, { candidatoId, vagaId, etapaAnterior, etapaNova }) {
  if (normalizeText(etapaAnterior) !== normalizeText(etapaNova)) {
    await queueAutomationByEtapa(connection, {
      candidatoId,
      etapa: etapaNova,
    });
  }

  if (normalizeText(etapaNova).includes('contratado')) {
    await createOnboardingProcessForCandidate(connection, {
      candidatoId,
      vagaId: vagaId || null,
    });
  }
}

/**
 * Handles interview confirmation or cancellation (public action).
 */
async function handleInterviewAction(action, req, res) {
  const { id } = req.params;
  const token = String(req.query.token || '').trim();

  if (!token) {
    return res.status(400).json({ error: 'Token de confirmação é obrigatório.' });
  }

  const isConfirm = action === 'confirmar';
  const confirmStatus = isConfirm ? 'Confirmada' : 'Cancelada pelo candidato';
  const entrevistaStatus = isConfirm ? 'Confirmada' : 'Cancelada';
  const automationEtapa = isConfirm ? 'Entrevista Confirmada' : 'Entrevista Cancelada';
  const successMessage = isConfirm ? 'Entrevista confirmada com sucesso.' : 'Entrevista cancelada com sucesso.';

  let connection;
  try {
    connection = await pool.getConnection();

    const [rows] = await connection.execute(
      `SELECT id, candidato_id, confirmacao_token FROM entrevistas WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Entrevista não encontrada.' });
    }

    if (String(rows[0].confirmacao_token || '') !== token) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    const updateFields = isConfirm
      ? `confirmacao_status = '${confirmStatus}', status = '${entrevistaStatus}', confirmado_em = NOW()`
      : `confirmacao_status = '${confirmStatus}', status = '${entrevistaStatus}'`;

    await connection.execute(`UPDATE entrevistas SET ${updateFields} WHERE id = ?`, [id]);

    await queueAutomationByEtapa(connection, {
      candidatoId: rows[0].candidato_id,
      etapa: automationEtapa,
      extraVariables: { entrevista_id: id },
    });

    res.json({ ok: true, message: successMessage });
  } catch (error) {
    console.error(`Erro ao ${action} entrevista:`, error);
    res.status(500).json({ error: `Erro ao ${action} entrevista.` });
  } finally {
    if (connection) connection.release();
  }
}

async function fetchCandidateWithVaga(connection, candidatoId) {
  const [rows] = await connection.execute(
    `SELECT c.id, c.nome, c.email, c.telefone, c.cidade, c.senioridade, c.cargo_desejado,
            c.vaga_id, c.etapa, c.curriculum_url, c.curriculum_text, c.linkedin, c.historico,
            c.pretensao, c.origem,
            v.titulo AS vaga_titulo, v.senioridade AS vaga_senioridade,
            v.salario_min, v.salario_max
     FROM candidatos c
     LEFT JOIN vagas v ON v.id = c.vaga_id
     WHERE c.id = ?
     LIMIT 1`,
    [candidatoId]
  );

  return rows[0] || null;
}

async function computeAndPersistCandidateScore(connection, candidatoId) {
  const candidate = await fetchCandidateWithVaga(connection, candidatoId);
  if (!candidate) return null;

  const senioridadeScore = scoreSenioridade(candidate.senioridade, candidate.vaga_senioridade);
  const cargoScore = scoreCargoAderencia(candidate.cargo_desejado, candidate.vaga_titulo);
  const tecnico = roundScore((senioridadeScore * 0.65) + (cargoScore * 0.35));
  const comportamental = roundScore(scoreComportamental(candidate));
  const salarial = roundScore(scoreSalarial(candidate.pretensao, candidate.salario_min, candidate.salario_max));

  const total = roundScore((tecnico * 0.4) + (comportamental * 0.3) + (salarial * 0.3));
  const prioridade = scorePriority(total);

  const detalhes = {
    pesos: {
      tecnico: 0.4,
      comportamental: 0.3,
      salarial: 0.3,
    },
    componentes: {
      senioridade: roundScore(senioridadeScore),
      cargo: roundScore(cargoScore),
      comportamental,
      salarial,
    },
  };

  await connection.execute(
    `UPDATE candidatos
     SET score_total = ?,
         score_tecnico = ?,
         score_comportamental = ?,
         score_salarial = ?,
         score_prioridade = ?,
         score_detalhes_json = ?
     WHERE id = ?`,
    [
      total,
      tecnico,
      comportamental,
      salarial,
      prioridade,
      JSON.stringify(detalhes),
      candidatoId,
    ]
  );

  return {
    total,
    tecnico,
    comportamental,
    salarial,
    prioridade,
    detalhes,
  };
}

async function queueAutomationByEtapa(connection, { candidatoId, etapa, extraVariables = {}, createdBy = null }) {
  const etapaNormalizada = String(etapa || '').trim();
  if (!etapaNormalizada) return [];

  const candidate = await fetchCandidateWithVaga(connection, candidatoId);
  if (!candidate) return [];

  const [templates] = await connection.execute(
    `SELECT id, nome, canal, etapa, assunto, corpo, ativo
     FROM comunicacoes_templates
     WHERE ativo = 1
       AND LOWER(TRIM(etapa)) = LOWER(TRIM(?))
     ORDER BY id ASC`,
    [etapaNormalizada]
  );

  if (!templates.length) return [];

  const variables = {
    nome: candidate.nome || '',
    email: candidate.email || '',
    telefone: candidate.telefone || '',
    etapa: etapaNormalizada,
    vaga_titulo: candidate.vaga_titulo || 'Banco de Talentos',
    cidade: candidate.cidade || '',
    ...extraVariables,
  };

  const createdOutboxIds = [];

  for (const template of templates) {
    const renderedSubject = template.assunto
      ? applyTemplateVariables(template.assunto, variables)
      : null;
    const renderedBody = applyTemplateVariables(template.corpo, variables);

    const [outboxInsert] = await connection.execute(
      `INSERT INTO comunicacoes_outbox
       (candidato_id, canal, assunto, corpo, status, created_by)
       VALUES (?, ?, ?, ?, 'pendente', ?)`,
      [candidate.id, normalizeCanal(template.canal), renderedSubject, renderedBody, createdBy]
    );

    let outboxStatus = 'pendente';
    let errorMsg = null;
    let sentAt = null;

    if (normalizeCanal(template.canal) === 'whatsapp') {
      const dispatch = await sendWhatsappMessage({
        phone: candidate.telefone,
        body: renderedBody,
      });

      outboxStatus = dispatch.delivered ? 'enviado' : 'erro';
      errorMsg = dispatch.delivered ? null : dispatch.message;
      sentAt = dispatch.delivered ? toMySqlDateTime(new Date().toISOString()) : null;
    } else if (normalizeCanal(template.canal) === 'email') {
      const dispatch = await sendEmailMessage({
        to: candidate.email,
        subject: renderedSubject,
        html: renderedBody,
      });

      outboxStatus = dispatch.delivered ? 'enviado' : 'erro';
      errorMsg = dispatch.delivered ? null : dispatch.message;
      sentAt = dispatch.delivered ? toMySqlDateTime(new Date().toISOString()) : null;
    }

    await connection.execute(
      `UPDATE comunicacoes_outbox
       SET status = ?, sent_at = ?, error_msg = ?
       WHERE id = ?`,
      [outboxStatus, sentAt, errorMsg, outboxInsert.insertId]
    );

    await connection.execute(
      `INSERT INTO comunicacoes_automacoes_log
       (candidato_id, etapa, template_id, outbox_id, canal, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [candidate.id, etapaNormalizada, template.id, outboxInsert.insertId, normalizeCanal(template.canal), outboxStatus]
    );

    createdOutboxIds.push(outboxInsert.insertId);
  }

  return createdOutboxIds;
}

async function createDefaultOnboardingChecklist(connection, processoId) {
  const defaultItems = [
    { categoria: 'Documentos', titulo: 'Enviar documentos pessoais', descricao: 'RG, CPF, comprovante de residência e dados bancários.' },
    { categoria: 'Documentos', titulo: 'Assinar contrato digital', descricao: 'Assinatura eletrônica do contrato de trabalho.' },
    { categoria: 'DP', titulo: 'Cadastro no sistema de folha', descricao: 'Integração com departamento pessoal.' },
    { categoria: 'Acessos', titulo: 'Criar acessos corporativos', descricao: 'E-mail, sistemas internos e ferramentas de trabalho.' },
    { categoria: 'Integração', titulo: 'Agendar onboarding de cultura', descricao: 'Apresentação da empresa e alinhamento inicial.' },
  ];

  for (const item of defaultItems) {
    await connection.execute(
      `INSERT INTO onboarding_itens
       (processo_id, categoria, titulo, descricao, obrigatorio, status)
       VALUES (?, ?, ?, ?, 1, 'pendente')`,
      [processoId, item.categoria, item.titulo, item.descricao]
    );
  }
}

async function createOnboardingProcessForCandidate(connection, { candidatoId, vagaId = null, responsavelId = null }) {
  const [candidateRows] = await connection.execute(
    `SELECT id, nome, email
     FROM candidatos
     WHERE id = ?
     LIMIT 1`,
    [candidatoId]
  );

  if (!candidateRows.length) {
    throw new Error('Candidato não encontrado para onboarding.');
  }

  const candidate = candidateRows[0];

  const [existingRows] = await connection.execute(
    `SELECT id
     FROM onboarding_processos
     WHERE candidato_id = ?
       AND status <> 'cancelado'
     ORDER BY id DESC
     LIMIT 1`,
    [candidatoId]
  );

  if (existingRows.length) {
    return existingRows[0];
  }

  const [insertResult] = await connection.execute(
    `INSERT INTO onboarding_processos
     (candidato_id, vaga_id, responsavel_id, colaborador_nome, colaborador_email, status, progresso_percentual)
     VALUES (?, ?, ?, ?, ?, 'ativo', 0)`,
    [candidatoId, vagaId, responsavelId, candidate.nome, candidate.email || null]
  );

  await createDefaultOnboardingChecklist(connection, insertResult.insertId);

  const [rows] = await connection.execute(
    `SELECT *
     FROM onboarding_processos
     WHERE id = ?
     LIMIT 1`,
    [insertResult.insertId]
  );

  return rows[0] || null;
}

async function recalculateOnboardingProgress(connection, processoId) {
  const [rows] = await connection.execute(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) AS concluidos
     FROM onboarding_itens
     WHERE processo_id = ?`,
    [processoId]
  );

  const total = Number(rows?.[0]?.total || 0);
  const concluidos = Number(rows?.[0]?.concluidos || 0);
  const progresso = total > 0 ? roundScore((concluidos / total) * 100) : 0;

  await connection.execute(
    `UPDATE onboarding_processos
     SET progresso_percentual = ?,
         status = CASE
           WHEN ? >= 100 THEN 'concluido'
           WHEN status = 'cancelado' THEN 'cancelado'
           ELSE 'ativo'
         END
     WHERE id = ?`,
    [progresso, progresso, processoId]
  );

  return progresso;
}

async function dispatchInterviewAutomation(connection, entrevistaId) {
  const [rows] = await connection.execute(
    `SELECT e.id, e.candidato_id, e.status, e.data_inicio, e.data_fim, e.confirmacao_token,
            c.nome AS candidato_nome, c.email AS candidato_email, c.telefone AS candidato_telefone,
            v.titulo AS vaga_titulo
     FROM entrevistas e
     INNER JOIN candidatos c ON c.id = e.candidato_id
     INNER JOIN vagas v ON v.id = e.vaga_id
     WHERE e.id = ?
     LIMIT 1`,
    [entrevistaId]
  );

  if (!rows.length) return [];

  const entrevista = rows[0];
  const token = entrevista.confirmacao_token || createPublicInterviewToken();

  if (!entrevista.confirmacao_token) {
    await connection.execute(
      `UPDATE entrevistas
       SET confirmacao_token = ?
       WHERE id = ?`,
      [token, entrevistaId]
    );
  }

  const dataInicio = new Date(entrevista.data_inicio);
  const dataInicioFormatada = Number.isNaN(dataInicio.getTime())
    ? ''
    : dataInicio.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const confirmarUrl = buildInterviewActionUrl(entrevista.id, token, 'confirmar');
  const cancelarUrl = buildInterviewActionUrl(entrevista.id, token, 'cancelar');

  return queueAutomationByEtapa(connection, {
    candidatoId: entrevista.candidato_id,
    etapa: 'Entrevista',
    extraVariables: {
      vaga_titulo: entrevista.vaga_titulo || '',
      data_entrevista: dataInicioFormatada,
      link_confirmacao: confirmarUrl,
      link_cancelamento: cancelarUrl,
      candidato_nome: entrevista.candidato_nome || '',
      entrevista_id: entrevista.id,
      entrevista_status: entrevista.status || 'Agendada',
      telefone: entrevista.candidato_telefone || '',
      email: entrevista.candidato_email || '',
    },
  });
}

// ==================== EMAIL SENDER ====================

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass',
  },
});

async function sendEmailMessage({ to, subject, html, text }) {
  if (!to) {
    console.warn('⚠️ Tentativa de enviar e-mail sem destinatário.');
    return { delivered: false, message: 'Destinatário ausente.' };
  }

  if (process.env.ENABLE_EMAIL_SENDING !== 'true') {
    console.log(`📪 [SIMULAÇÃO EMAIL] Para: ${to} | Assunto: ${subject}`);
    return { delivered: true, message: 'Simulado' };
  }

  try {
    const info = await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || '"RHesult" <no-reply@rhesult.com.br>',
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback text
      html,
    });

    console.log(`📧 E-mail enviado: ${info.messageId}`);
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
    return { delivered: false, message: error.message };
  }
}

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// ==================== AUTH ROUTES ====================

app.post('/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, nome, email, senha_hash, role, avatar_url, cargo FROM usuarios WHERE email = ?',
      [email]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const user = rows[0];

    const passwordCheck = await verifyPassword(senha, user.senha_hash);

    if (!passwordCheck.valid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (passwordCheck.needsRehash) {
      try {
        const upgradedHash = await hashPassword(senha);
        const updateConnection = await pool.getConnection();
        try {
          await updateConnection.execute(
            'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
            [upgradedHash, user.id]
          );
        } finally {
          updateConnection.release();
        }
      } catch (rehashError) {
        console.warn('Falha ao atualizar hash legado para bcrypt:', rehashError?.message || rehashError);
      }
    }

    // Gera um token JWT (stateless, sobrevive a restart)
    const token = signToken({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url || null,
      cargo: user.cargo || null,
    });

    // Store token with user data
    const userData = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url || null,
      cargo: user.cargo || null,
    };
    storeToken(token, userData);

    res.json({
      token,
      access_token: token,
      user: userData,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao processar login.' });
  }
});

app.post('/auth/logout', requireAuth, (req, res) => {
  try {
    revokeToken(req.authToken);
    return res.json({ ok: true });
  } catch (error) {
    console.error('Erro no logout:', error);
    return res.status(500).json({ error: 'Erro ao processar logout.' });
  }
});

// Get current user profile
app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader, req.headers.cookie);

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }

    const userData = getTokenData(token);

    if (!userData) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    res.json(userData);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

// Update current user profile
app.put('/auth/me', async (req, res) => {
  try {
    if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
      try {
        await handleAvatarUpload(req, res);
      } catch (uploadError) {
        const status = Number.isInteger(uploadError?.status) ? uploadError.status : 400;
        return res.status(status).json({ error: uploadError.message || 'Falha no upload do avatar.' });
      }
    }

    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader, req.headers.cookie);

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }

    const userData = getTokenData(token);

    if (!userData) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    const { nome, email, cargo, avatar_url, senha } = req.body;
    const userId = userData.id;

    const uploadedAvatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;
    const resolvedAvatarUrl = uploadedAvatarUrl !== undefined ? uploadedAvatarUrl : avatar_url;

    const connection = await pool.getConnection();

    let updateQuery = 'UPDATE usuarios SET ';
    const updateParams = [];
    const updates = [];

    if (nome !== undefined) {
      updates.push('nome = ?');
      updateParams.push(nome);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      updateParams.push(email);
    }
    if (cargo !== undefined) {
      updates.push('cargo = ?');
      updateParams.push(cargo);
    }
    if (resolvedAvatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      updateParams.push(resolvedAvatarUrl);
    }
    if (senha !== undefined) {
      const hashedSenha = await hashPassword(senha);
      updates.push('senha_hash = ?');
      updateParams.push(hashedSenha);
    }

    if (updates.length === 0) {
      connection.release();
      return res.json(userData);
    }

    updateQuery += updates.join(', ') + ' WHERE id = ?';
    updateParams.push(userId);

    await connection.execute(updateQuery, updateParams);

    // Fetch updated user data
    const [rows] = await connection.execute(
      'SELECT id, nome, email, role, avatar_url, cargo FROM usuarios WHERE id = ?',
      [userId]
    );
    connection.release();

    const updatedUser = rows[0];

    // Update token storage
    const updatedData = {
      id: updatedUser.id,
      nome: updatedUser.nome,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar_url: updatedUser.avatar_url || null,
      cargo: updatedUser.cargo || null,
    };
    storeToken(token, updatedData);

    res.json(updatedData);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// ==================== VAGAS ROUTES ====================

const vagasService = createVagasService(pool, { normalizeStatus });
const vagasController = createVagasController(vagasService);

app.get('/api/vagas', vagasController.index.bind(vagasController));
app.get('/api/vagas/search', vagasController.search.bind(vagasController));
app.get('/api/vagas/stats', requireAuth, vagasController.stats.bind(vagasController));
app.get('/api/vagas/:id', vagasController.show.bind(vagasController));
app.post('/api/vagas', requireAuth, requireRoles(['admin', 'rh', 'recruiter']), vagasController.store.bind(vagasController));
app.put('/api/vagas/:id', requireAuth, requireRoles(['admin', 'rh', 'recruiter']), vagasController.update.bind(vagasController));
app.delete('/api/vagas/:id', requireAuth, requireRoles(['admin', 'rh', 'recruiter']), vagasController.destroy.bind(vagasController));

// ==================== CANDIDATOS ROUTES ====================

app.get('/api/candidatos', requireAuth, async (req, res) => {
  const vagaIdRaw = req.query.vaga_id;
  const hasVagaFilter = vagaIdRaw !== undefined && String(vagaIdRaw).trim() !== '';
  const vagaId = hasVagaFilter ? Number(vagaIdRaw) : null;

  if (hasVagaFilter && !Number.isInteger(vagaId)) {
    return res.status(400).json({ error: 'vaga_id inválido.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);
    const whereClause = hasVagaFilter ? 'WHERE c.vaga_id = ?' : '';
    const params = hasVagaFilter ? [vagaId] : [];

    const [rows] = await connection.execute(
      `SELECT c.id, c.nome, c.email, c.telefone, c.cidade, c.senioridade,
              c.cargo_desejado, c.vaga_id, c.etapa,
              c.curriculum_url, c.linkedin, c.historico, c.origem, c.pretensao,
              c.score_total, c.score_tecnico, c.score_comportamental, c.score_salarial,
              c.score_prioridade, c.score_detalhes_json,
              c.created_at AS criado_em,
              v.titulo AS vaga_titulo
       FROM candidatos c
       LEFT JOIN vagas v ON v.id = c.vaga_id
       ${whereClause}
       ORDER BY c.created_at DESC`
      ,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar candidatos:', error);
    res.status(500).json({ error: 'Erro ao listar candidatos.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/candidatos', requireAuth, async (req, res) => {
  const {
    nome,
    email,
    telefone,
    cidade,
    senioridade,
    cargo_desejado,
    vaga_id,
    etapa,
    curriculum_url,
    linkedin,
    historico,
    origem,
    pretensao,
  } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);
    await ensureOnboardingTables(connection);

    const [result] = await connection.execute(
      `INSERT INTO candidatos
       (nome, email, telefone, cidade, senioridade, cargo_desejado, vaga_id, etapa, curriculum_url, linkedin, historico, origem, pretensao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nome).trim(),
        email || null,
        telefone || null,
        cidade || null,
        senioridade || null,
        cargo_desejado || null,
        vaga_id || null,
        normalizeEtapa(etapa),
        curriculum_url || null,
        linkedin || null,
        historico || null,
        origem || null,
        pretensao || null,
      ]
    );

    await computeAndPersistCandidateScore(connection, result.insertId);

    const etapaAtual = normalizeEtapa(etapa);
    await queueAutomationByEtapa(connection, {
      candidatoId: result.insertId,
      etapa: etapaAtual,
    });

    if (normalizeText(etapaAtual).includes('contratado')) {
      await createOnboardingProcessForCandidate(connection, {
        candidatoId: result.insertId,
        vagaId: vaga_id || null,
      });
    }

    const newCandidate = await fetchCandidateById(connection, result.insertId);
    if (newCandidate && req.io) {
       req.io.emit('candidate:created', newCandidate);
       req.io.emit('notification', {
           title: 'Novo Candidato',
           message: `Novo candidato: ${newCandidate.nome}`,
           type: 'success'
       });
    }

    res.status(201).json(newCandidate);
  } catch (error) {
    console.error('Erro ao criar candidato:', error);
    res.status(500).json({ error: 'Erro ao criar candidato.' });
  } finally {
    if (connection) connection.release();
  }
});

app.patch('/api/candidatos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { etapa } = req.body;

  if (!etapa || !String(etapa).trim()) {
    return res.status(400).json({ error: 'Etapa é obrigatória.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);
    await ensureOnboardingTables(connection);

    const [beforeRows] = await connection.execute(
      `SELECT id, etapa, vaga_id
       FROM candidatos
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!beforeRows.length) {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }

    const etapaAnterior = String(beforeRows[0].etapa || '');

    const [result] = await connection.execute(
      'UPDATE candidatos SET etapa = ? WHERE id = ?',
      [normalizeEtapa(etapa), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }

    const etapaNova = normalizeEtapa(etapa);

    if (normalizeText(etapaAnterior) !== normalizeText(etapaNova)) {
      await queueAutomationByEtapa(connection, {
        candidatoId: Number(id),
        etapa: etapaNova,
      });
    }

    if (normalizeText(etapaNova).includes('contratado')) {
      await createOnboardingProcessForCandidate(connection, {
        candidatoId: Number(id),
        vagaId: beforeRows[0].vaga_id || null,
      });
    }

    await computeAndPersistCandidateScore(connection, Number(id));

    const [rows] = await connection.execute(
      `SELECT c.id, c.nome, c.email, c.telefone, c.cidade, c.senioridade,
              c.cargo_desejado, c.vaga_id, c.etapa,
              c.curriculum_url, c.linkedin, c.historico, c.origem, c.pretensao,
              c.score_total, c.score_tecnico, c.score_comportamental, c.score_salarial,
              c.score_prioridade, c.score_detalhes_json,
              c.created_at AS criado_em,
              v.titulo AS vaga_titulo
       FROM candidatos c
       LEFT JOIN vagas v ON v.id = c.vaga_id
       WHERE c.id = ?
       LIMIT 1`,
      [id]
    );

    const updatedCandidate = rows[0] || null;
    if (updatedCandidate && req.io) {
      req.io.emit('candidate:updated', updatedCandidate);
      req.io.emit('notification', {
        title: 'Candidato Atualizado',
        message: `${updatedCandidate.nome} movido para ${updatedCandidate.etapa}`,
        type: 'info'
      });
    }

    res.json(updatedCandidate);
  } catch (error) {
    console.error('Erro ao atualizar etapa do candidato:', error);
    res.status(500).json({ error: 'Erro ao atualizar candidato.' });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/candidatos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    email,
    telefone,
    cidade,
    senioridade,
    cargo_desejado,
    vaga_id,
    etapa,
    curriculum_url,
    linkedin,
    historico,
    origem,
    pretensao,
  } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);
    await ensureOnboardingTables(connection);

    const [beforeRows] = await connection.execute(
      `SELECT id, etapa, vaga_id
       FROM candidatos
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!beforeRows.length) {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }

    const etapaAnterior = String(beforeRows[0].etapa || '');
    const etapaNormalizada = normalizeEtapa(etapa);

    const [result] = await connection.execute(
      `UPDATE candidatos
       SET nome = ?, email = ?, telefone = ?, cidade = ?, senioridade = ?,
           cargo_desejado = ?, vaga_id = ?, etapa = ?, curriculum_url = ?,
           linkedin = ?, historico = ?, origem = ?, pretensao = ?
       WHERE id = ?`,
      [
        String(nome).trim(),
        email || null,
        telefone || null,
        cidade || null,
        senioridade || null,
        cargo_desejado || null,
        vaga_id || null,
        normalizeEtapa(etapa),
        curriculum_url || null,
        linkedin || null,
        historico || null,
        origem || null,
        pretensao || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }

    await computeAndPersistCandidateScore(connection, Number(id));

    await handleEtapaTransition(connection, {
      candidatoId: Number(id),
      vagaId: vaga_id || null,
      etapaAnterior,
      etapaNova: etapaNormalizada,
    });

    res.json(await fetchCandidateById(connection, id));
  } catch (error) {
    console.error('Erro ao atualizar candidato:', error);
    res.status(500).json({ error: 'Erro ao atualizar candidato.' });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/candidatos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute('DELETE FROM candidatos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }

    res.json({ message: 'Candidato removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir candidato:', error);
    res.status(500).json({ error: 'Erro ao excluir candidato.' });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== COMUNICACOES ROUTES ====================

app.get('/api/comunicacoes/templates', requireAuth, async (req, res) => {
  const canal = req.query.canal ? normalizeCanal(req.query.canal) : null;
  const ativo = req.query.ativo;

  const filters = [];
  const params = [];

  if (canal) {
    filters.push('canal = ?');
    params.push(canal);
  }

  if (ativo !== undefined) {
    const ativoBool = String(ativo).toLowerCase() === 'true' || String(ativo) === '1';
    filters.push('ativo = ?');
    params.push(ativoBool ? 1 : 0);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT ${TEMPLATE_COLUMNS}
       FROM comunicacoes_templates
       ${whereClause}
       ORDER BY updated_at DESC, id DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ error: 'Erro ao listar templates.' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/comunicacoes/templates/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT ${TEMPLATE_COLUMNS}
       FROM comunicacoes_templates
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    res.status(500).json({ error: 'Erro ao buscar template.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/comunicacoes/templates', requireAuth, async (req, res) => {
  const { nome, canal, etapa, assunto, corpo, ativo } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ error: 'Nome do template é obrigatório.' });
  }

  if (!corpo || !String(corpo).trim()) {
    return res.status(400).json({ error: 'Corpo do template é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute(
      `INSERT INTO comunicacoes_templates
       (nome, canal, etapa, assunto, corpo, ativo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(nome).trim(),
        normalizeCanal(canal),
        etapa ? String(etapa).trim() : null,
        assunto ? String(assunto).trim() : null,
        String(corpo).trim(),
        ativo ? 1 : 0,
      ]
    );

    const [rows] = await connection.execute(
      `SELECT ${TEMPLATE_COLUMNS}
       FROM comunicacoes_templates
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.status(500).json({ error: 'Erro ao criar template.' });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/comunicacoes/templates/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nome, canal, etapa, assunto, corpo, ativo } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ error: 'Nome do template é obrigatório.' });
  }

  if (!corpo || !String(corpo).trim()) {
    return res.status(400).json({ error: 'Corpo do template é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute(
      `UPDATE comunicacoes_templates
       SET nome = ?, canal = ?, etapa = ?, assunto = ?, corpo = ?, ativo = ?
       WHERE id = ?`,
      [
        String(nome).trim(),
        normalizeCanal(canal),
        etapa ? String(etapa).trim() : null,
        assunto ? String(assunto).trim() : null,
        String(corpo).trim(),
        ativo ? 1 : 0,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }

    const [rows] = await connection.execute(
      `SELECT ${TEMPLATE_COLUMNS}
       FROM comunicacoes_templates
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({ error: 'Erro ao atualizar template.' });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/comunicacoes/templates/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute('DELETE FROM comunicacoes_templates WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }

    res.json({ message: 'Template excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir template:', error);
    res.status(500).json({ error: 'Erro ao excluir template.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/comunicacoes/templates/seed-defaults', requireAuth, async (_req, res) => {
  const defaultTemplates = [
    {
      nome: 'Recebido - confirmação',
      canal: 'email',
      etapa: 'Inscricao',
      assunto: 'Recebemos sua inscrição para {{vaga_titulo}}',
      corpo: 'Olá, {{nome}}! Sua inscrição foi recebida com sucesso para {{vaga_titulo}}. Em breve nosso time fará a triagem.',
    },
    {
      nome: 'Triagem - atualização',
      canal: 'email',
      etapa: 'Triagem',
      assunto: 'Seu perfil entrou em triagem: {{vaga_titulo}}',
      corpo: 'Olá, {{nome}}! Seu perfil está em triagem para a vaga {{vaga_titulo}}.',
    },
    {
      nome: 'Entrevista - convite WhatsApp',
      canal: 'whatsapp',
      etapa: 'Entrevista',
      assunto: null,
      corpo: 'Olá, {{nome}}! Sua entrevista para {{vaga_titulo}} está agendada em {{data_entrevista}}. Confirme em {{link_confirmacao}} ou cancele em {{link_cancelamento}}.',
    },
    {
      nome: 'Proposta - comunicação',
      canal: 'email',
      etapa: 'Proposta',
      assunto: 'Temos uma proposta para você - {{vaga_titulo}}',
      corpo: 'Olá, {{nome}}! Temos uma proposta para a vaga {{vaga_titulo}}. Retorne este e-mail para alinharmos os próximos passos.',
    },
    {
      nome: 'Reprovação - retorno',
      canal: 'email',
      etapa: 'Reprovado',
      assunto: 'Atualização do seu processo seletivo',
      corpo: 'Olá, {{nome}}. Seguimos com outro perfil nesta etapa, mas manteremos seu currículo em nosso banco de talentos.',
    },
  ];

  let connection;
  try {
    connection = await pool.getConnection();

    const inserted = [];

    for (const template of defaultTemplates) {
      const [existingRows] = await connection.execute(
        `SELECT id
         FROM comunicacoes_templates
         WHERE nome = ?
         LIMIT 1`,
        [template.nome]
      );

      if (existingRows.length) {
        continue;
      }

      const [result] = await connection.execute(
        `INSERT INTO comunicacoes_templates
         (nome, canal, etapa, assunto, corpo, ativo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [template.nome, template.canal, template.etapa, template.assunto, template.corpo]
      );

      inserted.push(result.insertId);
    }

    res.json({
      ok: true,
      inserted_count: inserted.length,
      inserted_ids: inserted,
    });
  } catch (error) {
    console.error('Erro ao semear templates padrão:', error);
    res.status(500).json({ error: 'Erro ao semear templates padrão.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/candidatos/recalcular-score', requireAuth, async (req, res) => {
  const candidatoId = req.body?.candidato_id ? Number(req.body.candidato_id) : null;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);

    let targetIds = [];
    if (candidatoId) {
      targetIds = [candidatoId];
    } else {
      const [rows] = await connection.execute('SELECT id FROM candidatos');
      targetIds = rows.map((item) => Number(item.id));
    }

    const updated = [];
    for (const id of targetIds) {
      const score = await computeAndPersistCandidateScore(connection, id);
      if (score) {
        updated.push({ candidato_id: id, ...score });
      }
    }

    res.json({ ok: true, updated_count: updated.length, updated });
  } catch (error) {
    console.error('Erro ao recalcular score:', error);
    res.status(500).json({ error: 'Erro ao recalcular score.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/comunicacoes/outbox', requireAuth, async (req, res) => {
  const { candidato_id, canal, assunto, corpo, scheduled_at } = req.body;

  if (!candidato_id) {
    return res.status(400).json({ error: 'candidato_id é obrigatório.' });
  }

  if (!corpo || !String(corpo).trim()) {
    return res.status(400).json({ error: 'corpo é obrigatório.' });
  }

  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader, req.headers.cookie);
  const tokenData = token ? getTokenData(token) : null;
  const createdBy = tokenData?.id || null;

  let connection;
  try {
    const canalNormalizado = normalizeCanal(canal);
    const corpoNormalizado = String(corpo).trim();

    connection = await pool.getConnection();
    const [result] = await connection.execute(
      `INSERT INTO comunicacoes_outbox
       (candidato_id, canal, assunto, corpo, status, scheduled_at, created_by)
       VALUES (?, ?, ?, ?, 'pendente', ?, ?)`,
      [
        candidato_id,
        canalNormalizado,
        assunto ? String(assunto).trim() : null,
        corpoNormalizado,
        toMySqlDateTime(scheduled_at),
        createdBy,
      ]
    );

    let dispatch = {
      attempted: false,
      delivered: false,
      message: 'Comunicação registrada na outbox.',
    };

    if (canalNormalizado === 'whatsapp') {
      const [candRows] = await connection.execute(
        `SELECT telefone
         FROM candidatos
         WHERE id = ?
         LIMIT 1`,
        [candidato_id]
      );

      const candidatePhone = candRows?.[0]?.telefone || '';
      dispatch = await sendWhatsappMessage({
        phone: candidatePhone,
        body: corpoNormalizado,
      });

      await connection.execute(
        `UPDATE comunicacoes_outbox
         SET status = ?, sent_at = ?, error_msg = ?
         WHERE id = ?`,
        [
          dispatch.delivered ? 'enviado' : 'erro',
          dispatch.delivered ? toMySqlDateTime(new Date().toISOString()) : null,
          dispatch.delivered ? null : dispatch.message,
          result.insertId,
        ]
      );
    }

    const [rows] = await connection.execute(
      `SELECT id, candidato_id, canal, assunto, corpo, status, scheduled_at, sent_at, error_msg, created_by, created_at
       FROM comunicacoes_outbox
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json({
      ...(rows[0] || null),
      dispatch,
    });
  } catch (error) {
    console.error('Erro ao inserir outbox:', error);
    res.status(500).json({ error: 'Erro ao inserir comunicação na outbox.' });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== ENTREVISTAS ROUTES ====================

app.get('/api/entrevistas', requireAuth, async (req, res) => {
  const { start, end } = req.query;
  const filters = [];
  const params = [];

  if (start) {
    filters.push('e.data_inicio >= ?');
    params.push(toMySqlDateTime(start));
  }

  if (end) {
    filters.push('e.data_inicio < ?');
    params.push(toMySqlDateTime(end));
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);
    const [rows] = await connection.execute(
      `${ENTREVISTA_SELECT}
       ${whereClause}
       ORDER BY e.data_inicio ASC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar entrevistas:', error);
    res.status(500).json({ error: 'Erro ao listar entrevistas.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/entrevistas', requireAuth, async (req, res) => {
  const {
    candidato_id,
    vaga_id,
    recrutador_id,
    data,
    hora_inicio,
    hora_fim,
    tipo,
    status,
    observacoes,
    meet_link,
  } = req.body;

  if (!candidato_id || !vaga_id || !data || !hora_inicio || !hora_fim) {
    return res.status(400).json({ error: 'candidato_id, vaga_id, data, hora_inicio e hora_fim são obrigatórios.' });
  }

  const dataInicio = combineDateAndTime(data, hora_inicio);
  const dataFim = combineDateAndTime(data, hora_fim);
  if (!dataInicio || !dataFim) {
    return res.status(400).json({ error: 'Data e horário inválidos.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);

    const confirmationToken = createPublicInterviewToken();

    const [result] = await connection.execute(
      `INSERT INTO entrevistas
       (candidato_id, vaga_id, recrutador_id, tipo, status, data_inicio, data_fim, observacoes, meet_link, confirmacao_token, confirmacao_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')`,
      [
        Number(candidato_id),
        Number(vaga_id),
        recrutador_id ? Number(recrutador_id) : null,
        normalizeInterviewType(tipo),
        normalizeInterviewStatus(status),
        dataInicio,
        dataFim,
        observacoes || null,
        meet_link || null,
        confirmationToken,
      ]
    );

    await dispatchInterviewAutomation(connection, result.insertId);

    const [rows] = await connection.execute(
      `${ENTREVISTA_SELECT} WHERE e.id = ? LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao criar entrevista:', error);
    res.status(500).json({ error: 'Erro ao criar entrevista.' });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/entrevistas/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    candidato_id,
    vaga_id,
    recrutador_id,
    data,
    hora_inicio,
    hora_fim,
    tipo,
    status,
    observacoes,
    meet_link,
  } = req.body;

  const updates = [];
  const params = [];

  if (candidato_id !== undefined) {
    updates.push('candidato_id = ?');
    params.push(Number(candidato_id));
  }

  if (vaga_id !== undefined) {
    updates.push('vaga_id = ?');
    params.push(Number(vaga_id));
  }

  if (recrutador_id !== undefined) {
    updates.push('recrutador_id = ?');
    params.push(recrutador_id ? Number(recrutador_id) : null);
  }

  if (tipo !== undefined) {
    updates.push('tipo = ?');
    params.push(normalizeInterviewType(tipo));
  }

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(normalizeInterviewStatus(status));
  }

  if (observacoes !== undefined) {
    updates.push('observacoes = ?');
    params.push(observacoes || null);
  }

  if (meet_link !== undefined) {
    updates.push('meet_link = ?');
    params.push(meet_link || null);
  }

  if (data && hora_inicio) {
    updates.push('data_inicio = ?');
    params.push(combineDateAndTime(data, hora_inicio));
  }

  if (data && hora_fim) {
    updates.push('data_fim = ?');
    params.push(combineDateAndTime(data, hora_fim));
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);

    const shouldDispatchAutomation =
      status !== undefined ||
      meet_link !== undefined ||
      (data !== undefined && hora_inicio !== undefined) ||
      (data !== undefined && hora_fim !== undefined);

    const [result] = await connection.execute(
      `UPDATE entrevistas SET ${updates.join(', ')} WHERE id = ?`,
      [...params, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entrevista não encontrada.' });
    }

    if (shouldDispatchAutomation) {
      await dispatchInterviewAutomation(connection, Number(id));
    }

    const [rows] = await connection.execute(
      `${ENTREVISTA_SELECT} WHERE e.id = ? LIMIT 1`,
      [id]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao atualizar entrevista:', error);
    res.status(500).json({ error: 'Erro ao atualizar entrevista.' });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/entrevistas/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute('DELETE FROM entrevistas WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entrevista não encontrada.' });
    }

    res.json({ message: 'Entrevista removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir entrevista:', error);
    res.status(500).json({ error: 'Erro ao excluir entrevista.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/entrevistas/:id/integracoes/:provider', requireAuth, async (req, res) => {
  const { id, provider } = req.params;
  const { event_id, calendar_id, meet_link, payload_json, sync_status } = req.body;

  const providerNormalized = normalizeText(provider);
  if (providerNormalized !== 'google' && providerNormalized !== 'microsoft') {
    return res.status(400).json({ error: 'Provider inválido. Use google ou microsoft.' });
  }

  if (!event_id || !String(event_id).trim()) {
    return res.status(400).json({ error: 'event_id é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);

    const [updateResult] = await connection.execute(
      `UPDATE entrevistas
       SET provider_integracao = ?,
           provider_event_id = ?,
           google_event_id = ?,
           google_calendar_id = ?,
           meet_link = COALESCE(?, meet_link)
       WHERE id = ?`,
      [
        providerNormalized,
        String(event_id).trim(),
        providerNormalized === 'google' ? String(event_id).trim() : null,
        providerNormalized === 'google' ? (calendar_id ? String(calendar_id).trim() : null) : null,
        meet_link ? String(meet_link).trim() : null,
        id,
      ]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Entrevista não encontrada.' });
    }

    await connection.execute(
      `INSERT INTO agenda_integracoes
       (entrevista_id, provider, external_event_id, external_calendar_id, sync_status, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(id),
        providerNormalized,
        String(event_id).trim(),
        calendar_id ? String(calendar_id).trim() : null,
        String(sync_status || 'sincronizado').trim().toLowerCase() === 'erro' ? 'erro' : 'sincronizado',
        payload_json ? JSON.stringify(payload_json) : null,
      ]
    );

    const [rows] = await connection.execute(
      `SELECT id, candidato_id, vaga_id, tipo, status, data_inicio, data_fim, meet_link,
              provider_integracao, provider_event_id, google_event_id, google_calendar_id,
              confirmacao_status, confirmado_em
       FROM entrevistas
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao registrar integração de agenda:', error);
    res.status(500).json({ error: 'Erro ao registrar integração de agenda.' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/public/entrevistas/:id/confirmar', (req, res) => handleInterviewAction('confirmar', req, res));
app.get('/api/public/entrevistas/:id/cancelar', (req, res) => handleInterviewAction('cancelar', req, res));

// ==================== ONBOARDING ROUTES ====================

app.get('/api/onboarding/processos', requireAuth, async (req, res) => {
  const status = req.query.status ? String(req.query.status).trim().toLowerCase() : null;
  const whereClause = status ? 'WHERE p.status = ?' : '';
  const params = status ? [status] : [];

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureOnboardingTables(connection);

    const [rows] = await connection.execute(
      `SELECT p.id, p.candidato_id, p.vaga_id, p.responsavel_id, p.colaborador_nome,
              p.colaborador_email, p.data_admissao, p.status, p.progresso_percentual,
              p.dp_integracao_status, p.assinatura_status, p.observacoes,
              p.created_at, p.updated_at,
              c.nome AS candidato_nome,
              v.titulo AS vaga_titulo
       FROM onboarding_processos p
       INNER JOIN candidatos c ON c.id = p.candidato_id
       LEFT JOIN vagas v ON v.id = p.vaga_id
       ${whereClause}
       ORDER BY p.updated_at DESC, p.id DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar processos de onboarding:', error);
    res.status(500).json({ error: 'Erro ao listar processos de onboarding.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/onboarding/processos', requireAuth, async (req, res) => {
  const { candidato_id, vaga_id, responsavel_id, data_admissao, observacoes } = req.body;

  if (!candidato_id) {
    return res.status(400).json({ error: 'candidato_id é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureOnboardingTables(connection);

    const processo = await createOnboardingProcessForCandidate(connection, {
      candidatoId: Number(candidato_id),
      vagaId: vaga_id ? Number(vaga_id) : null,
      responsavelId: responsavel_id ? Number(responsavel_id) : null,
    });

    if (data_admissao || observacoes !== undefined) {
      await connection.execute(
        `UPDATE onboarding_processos
         SET data_admissao = COALESCE(?, data_admissao),
             observacoes = COALESCE(?, observacoes)
         WHERE id = ?`,
        [
          data_admissao ? String(data_admissao).slice(0, 10) : null,
          observacoes !== undefined ? (observacoes || null) : null,
          processo.id,
        ]
      );
    }

    const [rows] = await connection.execute(
      `SELECT *
       FROM onboarding_processos
       WHERE id = ?
       LIMIT 1`,
      [processo.id]
    );

    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao criar processo de onboarding:', error);
    res.status(500).json({ error: 'Erro ao criar processo de onboarding.' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/onboarding/processos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureOnboardingTables(connection);

    const [processRows] = await connection.execute(
      `SELECT p.*, c.nome AS candidato_nome, v.titulo AS vaga_titulo
       FROM onboarding_processos p
       INNER JOIN candidatos c ON c.id = p.candidato_id
       LEFT JOIN vagas v ON v.id = p.vaga_id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );

    if (!processRows.length) {
      return res.status(404).json({ error: 'Processo de onboarding não encontrado.' });
    }

    const [itens] = await connection.execute(
      `SELECT id, processo_id, categoria, titulo, descricao, obrigatorio, status,
              concluido_em, responsavel_nome, created_at, updated_at
       FROM onboarding_itens
       WHERE processo_id = ?
       ORDER BY id ASC`,
      [id]
    );

    const [documentos] = await connection.execute(
      `SELECT id, processo_id, nome, tipo, arquivo_url, assinatura_status,
              assinado_por, assinado_em, dp_sync_status, created_at, updated_at
       FROM onboarding_documentos
       WHERE processo_id = ?
       ORDER BY id ASC`,
      [id]
    );

    res.json({
      ...processRows[0],
      itens,
      documentos,
    });
  } catch (error) {
    console.error('Erro ao buscar processo de onboarding:', error);
    res.status(500).json({ error: 'Erro ao buscar processo de onboarding.' });
  } finally {
    if (connection) connection.release();
  }
});

app.patch('/api/onboarding/processos/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, dp_integracao_status, assinatura_status, observacoes } = req.body;

  if (!status && !dp_integracao_status && !assinatura_status && observacoes === undefined) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(String(status).trim().toLowerCase());
  }

  if (dp_integracao_status) {
    updates.push('dp_integracao_status = ?');
    params.push(String(dp_integracao_status).trim().toLowerCase());
  }

  if (assinatura_status) {
    updates.push('assinatura_status = ?');
    params.push(String(assinatura_status).trim().toLowerCase());
  }

  if (observacoes !== undefined) {
    updates.push('observacoes = ?');
    params.push(observacoes || null);
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureOnboardingTables(connection);

    const [result] = await connection.execute(
      `UPDATE onboarding_processos
       SET ${updates.join(', ')}
       WHERE id = ?`,
      [...params, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Processo de onboarding não encontrado.' });
    }

    const [rows] = await connection.execute(
      `SELECT *
       FROM onboarding_processos
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao atualizar processo de onboarding:', error);
    res.status(500).json({ error: 'Erro ao atualizar processo de onboarding.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/onboarding/processos/:id/itens', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { categoria, titulo, descricao, obrigatorio, responsavel_nome } = req.body;

  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ error: 'titulo é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureOnboardingTables(connection);

    const [result] = await connection.execute(
      `INSERT INTO onboarding_itens
       (processo_id, categoria, titulo, descricao, obrigatorio, status, responsavel_nome)
       VALUES (?, ?, ?, ?, ?, 'pendente', ?)`,
      [
        Number(id),
        categoria ? String(categoria).trim() : 'Geral',
        String(titulo).trim(),
        descricao || null,
        obrigatorio === false ? 0 : 1,
        responsavel_nome ? String(responsavel_nome).trim() : null,
      ]
    );

    await recalculateOnboardingProgress(connection, Number(id));

    const [rows] = await connection.execute(
      `SELECT *
       FROM onboarding_itens
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao criar item de onboarding:', error);
    res.status(500).json({ error: 'Erro ao criar item de onboarding.' });
  } finally {
    if (connection) connection.release();
  }
});

app.patch('/api/onboarding/itens/:itemId', requireAuth, async (req, res) => {
  const { itemId } = req.params;
  const { status, responsavel_nome, descricao } = req.body;

  if (!status && responsavel_nome === undefined && descricao === undefined) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  const updates = [];
  const params = [];

  if (status) {
    const statusNormalized = String(status).trim().toLowerCase();
    updates.push('status = ?');
    params.push(statusNormalized);
    updates.push('concluido_em = ?');
    params.push(statusNormalized === 'concluido' ? toMySqlDateTime(new Date().toISOString()) : null);
  }

  if (responsavel_nome !== undefined) {
    updates.push('responsavel_nome = ?');
    params.push(responsavel_nome || null);
  }

  if (descricao !== undefined) {
    updates.push('descricao = ?');
    params.push(descricao || null);
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureOnboardingTables(connection);

    const [itemRows] = await connection.execute(
      `SELECT id, processo_id
       FROM onboarding_itens
       WHERE id = ?
       LIMIT 1`,
      [itemId]
    );

    if (!itemRows.length) {
      return res.status(404).json({ error: 'Item de onboarding não encontrado.' });
    }

    await connection.execute(
      `UPDATE onboarding_itens
       SET ${updates.join(', ')}
       WHERE id = ?`,
      [...params, itemId]
    );

    await recalculateOnboardingProgress(connection, Number(itemRows[0].processo_id));

    const [rows] = await connection.execute(
      `SELECT *
       FROM onboarding_itens
       WHERE id = ?
       LIMIT 1`,
      [itemId]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao atualizar item de onboarding:', error);
    res.status(500).json({ error: 'Erro ao atualizar item de onboarding.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/onboarding/processos/:id/documentos', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nome, tipo, arquivo_url } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ error: 'nome é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureOnboardingTables(connection);

    const [result] = await connection.execute(
      `INSERT INTO onboarding_documentos
       (processo_id, nome, tipo, arquivo_url, assinatura_status, dp_sync_status)
       VALUES (?, ?, ?, ?, 'pendente', 'pendente')`,
      [Number(id), String(nome).trim(), tipo || null, arquivo_url || null]
    );

    const [rows] = await connection.execute(
      `SELECT *
       FROM onboarding_documentos
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao criar documento de onboarding:', error);
    res.status(500).json({ error: 'Erro ao criar documento de onboarding.' });
  } finally {
    if (connection) connection.release();
  }
});

app.patch('/api/onboarding/documentos/:docId/assinar', requireAuth, async (req, res) => {
  const { docId } = req.params;
  const { assinado_por, dp_sync_status } = req.body;

  if (!assinado_por || !String(assinado_por).trim()) {
    return res.status(400).json({ error: 'assinado_por é obrigatório.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureOnboardingTables(connection);

    const [docRows] = await connection.execute(
      `SELECT id, processo_id
       FROM onboarding_documentos
       WHERE id = ?
       LIMIT 1`,
      [docId]
    );

    if (!docRows.length) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    await connection.execute(
      `UPDATE onboarding_documentos
       SET assinatura_status = 'assinado',
           assinado_por = ?,
           assinado_em = ?,
           dp_sync_status = ?
       WHERE id = ?`,
      [
        String(assinado_por).trim(),
        toMySqlDateTime(new Date().toISOString()),
        dp_sync_status ? String(dp_sync_status).trim().toLowerCase() : 'pendente',
        docId,
      ]
    );

    const [processRows] = await connection.execute(
      `SELECT
         COUNT(*) AS total_docs,
         SUM(CASE WHEN assinatura_status = 'assinado' THEN 1 ELSE 0 END) AS assinados
       FROM onboarding_documentos
       WHERE processo_id = ?`,
      [docRows[0].processo_id]
    );

    const totalDocs = Number(processRows[0]?.total_docs || 0);
    const assinados = Number(processRows[0]?.assinados || 0);
    const assinaturaStatus = totalDocs > 0 && assinados === totalDocs ? 'concluida' : (assinados > 0 ? 'parcial' : 'pendente');

    await connection.execute(
      `UPDATE onboarding_processos
       SET assinatura_status = ?
       WHERE id = ?`,
      [assinaturaStatus, docRows[0].processo_id]
    );

    const [rows] = await connection.execute(
      `SELECT *
       FROM onboarding_documentos
       WHERE id = ?
       LIMIT 1`,
      [docId]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao assinar documento de onboarding:', error);
    res.status(500).json({ error: 'Erro ao assinar documento de onboarding.' });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== PARECERES ROUTES ====================

app.get('/api/pareceres', requireAuth, async (req, res) => {
  const { candidatoId, vagaId } = req.query;
  const filters = [];
  const params = [];

  if (candidatoId) {
    filters.push('p.candidato_id = ?');
    params.push(Number(candidatoId));
  }

  if (vagaId) {
    filters.push('p.vaga_id = ?');
    params.push(Number(vagaId));
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureParecerSupportTables(connection);

    const [rows] = await connection.execute(
      `${PARECER_SELECT}
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar pareceres:', error);
    res.status(500).json({ error: 'Erro ao listar pareceres.' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/pareceres/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureParecerSupportTables(connection);

    const [rows] = await connection.execute(
      `${PARECER_SELECT} WHERE p.id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Parecer não encontrado.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar parecer:', error);
    res.status(500).json({ error: 'Erro ao buscar parecer.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/pareceres', requireAuth, async (req, res) => {
  const { candidato_id, vaga_id, avaliador_id, conteudo, status } = req.body;

  if (!candidato_id || !vaga_id || !conteudo) {
    return res.status(400).json({ error: 'candidato_id, vaga_id e conteudo são obrigatórios.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureParecerSupportTables(connection);

    const [result] = await connection.execute(
      `INSERT INTO pareceres (candidato_id, vaga_id, avaliador_id, conteudo, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(candidato_id),
        Number(vaga_id),
        avaliador_id ? Number(avaliador_id) : null,
        String(conteudo),
        status || 'pendente',
      ]
    );

    await connection.execute(
      `INSERT INTO pareceres_versoes (parecer_id, conteudo, status)
       VALUES (?, ?, ?)`,
      [result.insertId, String(conteudo), status || 'pendente']
    );

    const [rows] = await connection.execute(
      `${PARECER_SELECT} WHERE p.id = ? LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao criar parecer:', error);
    res.status(500).json({ error: 'Erro ao criar parecer.' });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/pareceres/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { conteudo, status } = req.body;

  if (conteudo === undefined && status === undefined) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  const updates = [];
  const params = [];

  if (conteudo !== undefined) {
    updates.push('conteudo = ?');
    params.push(String(conteudo));
  }

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(String(status));
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureParecerSupportTables(connection);

    const [result] = await connection.execute(
      `UPDATE pareceres SET ${updates.join(', ')} WHERE id = ?`,
      [...params, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Parecer não encontrado.' });
    }

    const [parecerRows] = await connection.execute(
      `SELECT conteudo, status FROM pareceres WHERE id = ? LIMIT 1`,
      [id]
    );

    if (parecerRows.length) {
      await connection.execute(
        `INSERT INTO pareceres_versoes (parecer_id, conteudo, status)
         VALUES (?, ?, ?)`,
        [id, parecerRows[0].conteudo || '', parecerRows[0].status || null]
      );
    }

    const [rows] = await connection.execute(
      `${PARECER_SELECT} WHERE p.id = ? LIMIT 1`,
      [id]
    );

    res.json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao atualizar parecer:', error);
    res.status(500).json({ error: 'Erro ao atualizar parecer.' });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/pareceres/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();

    // Check if parecer exists
    const [existing] = await connection.execute(
      'SELECT id FROM pareceres WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ error: 'Parecer não encontrado.' });
    }

    // Delete cascaded children (comments & versions) then the parecer
    await connection.execute('DELETE FROM pareceres_comentarios WHERE parecer_id = ?', [id]);
    await connection.execute('DELETE FROM pareceres_versoes WHERE parecer_id = ?', [id]);
    await connection.execute('DELETE FROM pareceres WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir parecer:', error);
    res.status(500).json({ error: 'Erro ao excluir parecer.' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/pareceres/:id/comentarios', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureParecerSupportTables(connection);

    const [rows] = await connection.execute(
      `SELECT c.id, c.parecer_id, c.usuario_id, c.texto, c.created_at,
              u.nome AS usuario_nome
       FROM pareceres_comentarios c
       LEFT JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.parecer_id = ?
       ORDER BY c.created_at DESC`,
      [id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar comentários do parecer:', error);
    res.status(500).json({ error: 'Erro ao listar comentários do parecer.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/pareceres/:id/comentarios', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { texto } = req.body;

  if (!texto || !String(texto).trim()) {
    return res.status(400).json({ error: 'texto é obrigatório.' });
  }

  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader, req.headers.cookie);
  const tokenData = token ? getTokenData(token) : null;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureParecerSupportTables(connection);

    const [result] = await connection.execute(
      `INSERT INTO pareceres_comentarios (parecer_id, usuario_id, texto)
       VALUES (?, ?, ?)`,
      [Number(id), tokenData?.id || null, String(texto).trim()]
    );

    const [rows] = await connection.execute(
      `SELECT c.id, c.parecer_id, c.usuario_id, c.texto, c.created_at,
              u.nome AS usuario_nome
       FROM pareceres_comentarios c
       LEFT JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('Erro ao criar comentário do parecer:', error);
    res.status(500).json({ error: 'Erro ao criar comentário do parecer.' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/pareceres/:id/versoes', requireAuth, async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureParecerSupportTables(connection);

    const [rows] = await connection.execute(
      `SELECT id, parecer_id, status, created_at
       FROM pareceres_versoes
       WHERE parecer_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar versões do parecer:', error);
    res.status(500).json({ error: 'Erro ao listar versões do parecer.' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/pareceres/:id/versoes/:versionId', requireAuth, async (req, res) => {
  const { id, versionId } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureParecerSupportTables(connection);

    const [rows] = await connection.execute(
      `SELECT id, parecer_id, conteudo, status, created_at
       FROM pareceres_versoes
       WHERE parecer_id = ? AND id = ?
       LIMIT 1`,
      [id, versionId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Versão não encontrada.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar versão do parecer:', error);
    res.status(500).json({ error: 'Erro ao buscar versão do parecer.' });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== PUBLIC ROUTES ====================

// Submissão pública de candidatura (Landing Page)
app.post('/public/candidatos', async (req, res) => {
  if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
    try {
      await handleCurriculumUpload(req, res);
    } catch (uploadError) {
      const status = Number.isInteger(uploadError?.status) ? uploadError.status : 400;
      return res.status(status).json({ error: uploadError.message || 'Falha no upload do currículo.' });
    }
  }

  console.log('[POST /public/candidatos] Body recebido:', JSON.stringify(req.body, null, 2));
  
  const {
    nome,
    email,
    telefone,
    cidade,
    senioridade,
    cargo_desejado,
    vaga_id,
    curriculum_url,
    linkedin,
    historico,
    consentimento,
    pretensao,
  } = req.body;

  console.log('[POST /public/candidatos] Campos extraídos:', { nome: !!nome, email: !!email, telefone: !!telefone });

  if (!nome || !String(nome).trim()) {
    console.warn('[POST /public/candidatos] Validação falhou: Nome vazio');
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }

  if (!email || !String(email).trim()) {
    console.warn('[POST /public/candidatos] Validação falhou: Email vazio');
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  let connection;
  try {
    const uploadedCurriculumUrl = req.file ? `/uploads/curriculos/${req.file.filename}` : null;
    const resolvedCurriculumUrl = uploadedCurriculumUrl || curriculum_url || null;

    connection = await pool.getConnection();
    await ensureHiringAutomationTables(connection);
    const [result] = await connection.execute(
      `INSERT INTO candidatos
       (nome, email, telefone, cidade, senioridade, cargo_desejado, vaga_id, etapa, curriculum_url, linkedin, historico, origem, pretensao, consentimento, consentimento_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(nome).trim(),
        String(email).trim(),
        telefone || null,
        cidade || null,
        senioridade || null,
        cargo_desejado || null,
        vaga_id || null,
        'Inscricao',
        resolvedCurriculumUrl,
        linkedin || null,
        historico || null,
        'Landing Page',
        pretensao || null,
        consentimento ? 1 : 0,
        consentimento ? toMySqlDateTime(new Date().toISOString()) : null,
      ]
    );

    await computeAndPersistCandidateScore(connection, result.insertId);

    await queueAutomationByEtapa(connection, {
      candidatoId: result.insertId,
      etapa: 'Inscricao',
      extraVariables: {
        origem: 'Landing Page',
      },
    });

    const [rows] = await connection.execute(
      `SELECT c.id, c.nome, c.email, c.telefone, c.cidade, c.senioridade,
              c.cargo_desejado, c.vaga_id, c.etapa,
              c.curriculum_url, c.linkedin, c.historico, c.origem,
              c.created_at AS criado_em,
              v.titulo AS vaga_titulo
       FROM candidatos c
       LEFT JOIN vagas v ON v.id = c.vaga_id
       WHERE c.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    console.log('[POST /public/candidatos] ✓ Candidato criado:', rows[0]?.id);
    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('[POST /public/candidatos] Erro:', error);
    res.status(500).json({ error: 'Erro ao processar candidatura. Tente novamente mais tarde.' });
  } finally {
    if (connection) connection.release();
  }
});

const { parseCV } = require('./src/services/CVParserService');

// ==================== CANDIDATE PARSING ====================
app.post('/api/candidatos/parse-cv', requireAuth, curriculumUpload.single('curriculo'), async (req, res) => {
    try {
        console.log('[POST /api/candidatos/parse-cv] Request received');
        if (!req.file) {
            console.error('[POST /api/candidatos/parse-cv] No file uploaded');
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        
        const filePath = req.file.path;
        console.log(`📄 Analisando CV: ${filePath}`);

        const parsedData = await parseCV(filePath);
        console.log('[POST /api/candidatos/parse-cv] Parse success:', parsedData);
        
        const fileUrl = `/uploads/curriculos/${req.file.filename}`;
        
        res.json({
            ...parsedData,
            curriculum_url: fileUrl
        });

    } catch (error) {
        console.error('Erro ao analisar CV:', error);
        res.status(500).json({ error: 'Falha ao processar o currículo.' });
    }
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  const statusCode = Number.isInteger(err?.status) ? err.status : 500;
  // Only return the original message for known client errors (4xx), 
  // never leak internal details for server errors
  const message = statusCode < 500 && err?.message
    ? err.message
    : 'Erro interno do servidor.';
  res.status(statusCode).json({ error: message });
});

// ==================== START SERVER ====================

ensureAllTables()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Backend rodando em http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error('❌ Falha ao garantir tabelas no startup:', err);
    // Start anyway — the ensure* guards will retry on first request
    server.listen(PORT, () => {
      console.log(`⚠️ Backend rodando (sem pre-check de tabelas) em http://localhost:${PORT}`);
    });
  });
