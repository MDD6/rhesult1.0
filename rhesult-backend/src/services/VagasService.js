class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

class VagasService {
  constructor(pool, dependencies = {}) {
    this.pool = pool;
    this.normalizeStatus = dependencies.normalizeStatus || ((status) => status || 'Ativa');
  }

  async getAllVagas() {
    const connection = await this.pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT id, titulo, tipo_contrato, modelo_trabalho, senioridade,
                cidade, descricao, salario_min, salario_max,
                status AS status_processo,
                created_at AS data_abertura,
                0 AS total_candidatos
         FROM vagas ORDER BY created_at DESC`
      );

      return rows;
    } finally {
      connection.release();
    }
  }

  async getVagaById(id) {
    const connection = await this.pool.getConnection();

    try {
      const [rows] = await connection.execute('SELECT * FROM vagas WHERE id = ?', [id]);

      if (!rows.length) {
        throw new HttpError(404, 'Vaga não encontrada.');
      }

      return rows[0];
    } finally {
      connection.release();
    }
  }

  async createVaga(payload) {
    const {
      titulo,
      tipo_contrato,
      modelo_trabalho,
      senioridade,
      cidade,
      descricao,
      salario_min,
      salario_max,
      total_candidatos,
      status_processo,
    } = payload;

    if (!titulo || !tipo_contrato || !modelo_trabalho) {
      throw new HttpError(400, 'Campos obrigatórios faltando.');
    }

    const normalizedStatus = this.normalizeStatus(status_processo);
    const connection = await this.pool.getConnection();

    try {
      const [result] = await connection.execute(
        `INSERT INTO vagas
         (titulo, tipo_contrato, modelo_trabalho, senioridade, cidade, descricao, salario_min, salario_max, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          titulo,
          tipo_contrato,
          modelo_trabalho,
          senioridade,
          cidade,
          descricao,
          salario_min ?? null,
          salario_max ?? null,
          normalizedStatus,
        ]
      );

      return {
        id: result.insertId,
        titulo,
        tipo_contrato,
        modelo_trabalho,
        senioridade,
        cidade,
        descricao,
        salario_min: salario_min ?? null,
        salario_max: salario_max ?? null,
        total_candidatos: total_candidatos || 0,
        status_processo: normalizedStatus,
      };
    } finally {
      connection.release();
    }
  }

  async updateVaga(id, payload) {
    const {
      titulo,
      tipo_contrato,
      modelo_trabalho,
      senioridade,
      cidade,
      descricao,
      salario_min,
      salario_max,
      total_candidatos,
      status_processo,
    } = payload;

    const normalizedStatus = this.normalizeStatus(status_processo);
    const connection = await this.pool.getConnection();

    try {
      const [result] = await connection.execute(
        `UPDATE vagas
         SET titulo = ?, tipo_contrato = ?, modelo_trabalho = ?, senioridade = ?,
             cidade = ?, descricao = ?, salario_min = ?, salario_max = ?, status = ?
         WHERE id = ?`,
        [
          titulo,
          tipo_contrato,
          modelo_trabalho,
          senioridade,
          cidade,
          descricao,
          salario_min ?? null,
          salario_max ?? null,
          normalizedStatus,
          id,
        ]
      );

      if (result.affectedRows === 0) {
        throw new HttpError(404, 'Vaga não encontrada.');
      }

      return {
        id,
        titulo,
        tipo_contrato,
        modelo_trabalho,
        senioridade,
        cidade,
        descricao,
        salario_min: salario_min ?? null,
        salario_max: salario_max ?? null,
        total_candidatos: total_candidatos || 0,
        status_processo: normalizedStatus,
      };
    } finally {
      connection.release();
    }
  }

  async deleteVaga(id) {
    const connection = await this.pool.getConnection();

    try {
      const [result] = await connection.execute('DELETE FROM vagas WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  async searchVagas(filters) {
    const conditions = [];
    const values = [];

    if (filters?.q) {
      conditions.push('(titulo LIKE ? OR descricao LIKE ?)');
      values.push(`%${filters.q}%`, `%${filters.q}%`);
    }

    if (filters?.cidade) {
      conditions.push('cidade = ?');
      values.push(filters.cidade);
    }

    if (filters?.modelo_trabalho) {
      conditions.push('modelo_trabalho = ?');
      values.push(filters.modelo_trabalho);
    }

    if (filters?.senioridade) {
      conditions.push('senioridade = ?');
      values.push(filters.senioridade);
    }

    if (filters?.status_processo) {
      conditions.push('status = ?');
      values.push(this.normalizeStatus(filters.status_processo));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const connection = await this.pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT id, titulo, tipo_contrato, modelo_trabalho, senioridade,
                cidade, descricao, salario_min, salario_max,
                status AS status_processo,
                created_at AS data_abertura,
                0 AS total_candidatos
         FROM vagas
         ${whereClause}
         ORDER BY created_at DESC`,
        values
      );

      return rows;
    } finally {
      connection.release();
    }
  }

  async getVagasStats() {
    const connection = await this.pool.getConnection();

    try {
      const [summaryRows] = await connection.execute(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'Ativa' THEN 1 ELSE 0 END) AS ativas,
          SUM(CASE WHEN status = 'Pausada' THEN 1 ELSE 0 END) AS pausadas,
          SUM(CASE WHEN status = 'Fechada' THEN 1 ELSE 0 END) AS fechadas
         FROM vagas`
      );

      const [statusRows] = await connection.execute(
        `SELECT status AS status_processo, COUNT(*) AS total
         FROM vagas
         GROUP BY status
         ORDER BY total DESC`
      );

      return {
        ...(summaryRows[0] || { total: 0, ativas: 0, pausadas: 0, fechadas: 0 }),
        por_status: statusRows,
      };
    } finally {
      connection.release();
    }
  }
}

function createVagasService(pool, dependencies) {
  return new VagasService(pool, dependencies);
}

module.exports = {
  HttpError,
  VagasService,
  createVagasService,
};
