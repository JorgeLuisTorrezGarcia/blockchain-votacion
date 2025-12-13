const { Op } = require('sequelize');
const { authorizeWhitelist } = require('../services/blockchain.service');
const AdminAction = require('../models/AdminAction');

/**
 * @route POST /api/admin/elections/:id/authorize
 * @desc Autoriza una lista de wallets en VotingSystem llamando a authorizeVoters.
 *       Requiere header X-Admin-Api-Key con el token configurado en .env.
 */
const authorizeElectionVoters = async (req, res) => {
  try {
    const { id } = req.params;
    const { voter_addresses } = req.body;
    const performedBy = req.headers['x-admin-identity'] || req.user?.email || null;

    if (!Array.isArray(voter_addresses) || voter_addresses.length === 0) {
      return res.status(400).json({ message: 'Debes enviar un arreglo voter_addresses con al menos una dirección.' });
    }

    const receipt = await authorizeWhitelist(id, voter_addresses);

    await AdminAction.create({
      action_type: 'AUTHORIZE_WHITELIST',
      election_id: id,
      performed_by: performedBy,
      request_ip: req.ip,
      metadata: {
        voterCount: voter_addresses.length,
        voterAddresses: voter_addresses,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
      },
    });

    res.status(200).json({
      message: 'Votantes autorizados on-chain correctamente.',
      receipt,
    });
  } catch (error) {
    console.error('Error al autorizar votantes:', error);
    try {
      await AdminAction.create({
        action_type: 'AUTHORIZE_WHITELIST_FAILED',
        election_id: req.params.id,
        performed_by: req.headers['x-admin-identity'] || null,
        request_ip: req.ip,
        metadata: {
          error: error.message,
        },
      });
    } catch (logError) {
      console.error('No se pudo registrar la acción administrativa fallida:', logError);
    }
    res.status(500).json({ message: error.message || 'No fue posible autorizar votantes. Revisa la configuración on-chain.' });
  }
};

const listAdminActions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const where = {};

    if (req.query.action_type) {
      where.action_type = req.query.action_type;
    }
    if (req.query.election_id) {
      where.election_id = req.query.election_id;
    }
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) {
        where.createdAt[Op.gte] = new Date(req.query.from);
      }
      if (req.query.to) {
        where.createdAt[Op.lte] = new Date(req.query.to);
      }
    }

    const { rows, count } = await AdminAction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.status(200).json({
      page,
      limit,
      total: count,
      results: rows,
    });
  } catch (error) {
    console.error('Error al listar acciones administrativas:', error);
    res.status(500).json({ message: 'No fue posible obtener la bitácora administrativa.' });
  }
};

module.exports = { authorizeElectionVoters, listAdminActions };
