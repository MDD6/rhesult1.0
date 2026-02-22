/**
 * VagasController (Refatorado) - HTTP Handler
 * Implementa Single Responsibility - apenas HTTP
 * Recebe Service via injeção (Dependency Inversion)
 */

class VagasController {
  constructor(vagasService) {
    this.vagasService = vagasService;
  }

  /**
   * GET /vagas - Lista todas as vagas
   */
  async index(req, res, next) {
    try {
      const vagas = await this.vagasService.getAllVagas();
      res.json(vagas);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vagas/:id - Obtém uma vaga específica
   */
  async show(req, res, next) {
    try {
      const vaga = await this.vagasService.getVagaById(req.params.id);
      res.json(vaga);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vagas - Cria nova vaga
   */
  async store(req, res, next) {
    try {
      const vaga = await this.vagasService.createVaga(req.body);
      res.status(201).json(vaga);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /vagas/:id - Atualiza vaga
   */
  async update(req, res, next) {
    try {
      const vaga = await this.vagasService.updateVaga(req.params.id, req.body);
      res.json(vaga);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /vagas/:id - Deleta vaga
   */
  async destroy(req, res, next) {
    try {
      const deleted = await this.vagasService.deleteVaga(req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: 'Vaga não encontrada' });
      }

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vagas/search - Busca com filtros
   */
  async search(req, res, next) {
    try {
      const vagas = await this.vagasService.searchVagas(req.query);
      res.json(vagas);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vagas/stats - Estatísticas
   */
  async stats(req, res, next) {
    try {
      const stats = await this.vagasService.getVagasStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Factory para criar o controller com injeção de dependência
 */
function createVagasController(vagasService) {
  return new VagasController(vagasService);
}

module.exports = {
  VagasController,
  createVagasController,
};
