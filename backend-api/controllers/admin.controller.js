const { Op } = require('sequelize');
const User = require('../models/User');
const Election = require('../models/Election');
const {
  authorizeWhitelist,
  createElectionOnChain,
} = require('../services/blockchain.service');
const AdminAction = require('../models/AdminAction');
const { queueElectionAnnouncement } = require('../services/notification.service');
require('dotenv').config();

/**
 * @route GET /api/admin/verify
 * @desc Verifica si el usuario autenticado es admin
 */
const verifyAdmin = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso no autorizado' });
    }

    res.json({ 
      message: 'Usuario verificado como admin',
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Error verificando admin:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

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

const createElection = async (req, res) => {
  try {
    const performedBy = req.headers['x-admin-identity'] || req.user?.email || null;
    const apiPayload = normalizeElectionPayload(req.body || {});

    const receipt = await createElectionOnChain(apiPayload);

    const startDate = receipt.startTime && receipt.startTime > 0 ? new Date(receipt.startTime * 1000) : null;
    const endDate = receipt.endTime && receipt.endTime > 0 ? new Date(receipt.endTime * 1000) : null;

    let durationMinutes = apiPayload.durationMinutes ?? null;
    if (!durationMinutes && startDate && endDate) {
      durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    }

    const [electionRecord] = await Election.upsert({
      on_chain_id: receipt.electionId,
      title: apiPayload.title?.trim() || '',
      description: apiPayload.description?.trim() || '',
      start_time: startDate,
      end_time: endDate,
      duration_minutes: durationMinutes ?? null,
      options: apiPayload.options,
      initial_voters: apiPayload.initialVoters,
      tx_hash: receipt.transactionHash,
      created_by_user_id: req.user?.id || null,
    }, { returning: true });

    const electionPlain = electionRecord.get({ plain: true });

    let queueResult = { targetedUsers: 0, unmatchedWallets: [] };
    try {
      queueResult = await queueElectionAnnouncement({
        election: electionPlain,
        voterWallets: apiPayload.initialVoters,
        performedBy,
      });
    } catch (notificationError) {
      console.error('No se pudo encolar notificaciones de elección:', notificationError);
      queueResult = {
        targetedUsers: 0,
        unmatchedWallets: apiPayload.initialVoters || [],
        error: notificationError.message,
      };
    }

    await AdminAction.create({
      action_type: 'CREATE_ELECTION',
      election_id: receipt.electionId,
      performed_by: performedBy,
      request_ip: req.ip,
      metadata: {
        title: apiPayload.title,
        options: apiPayload.options,
        initialVoters: apiPayload.initialVoters,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        startTime: receipt.startTime,
        endTime: receipt.endTime,
        dbElectionId: electionPlain.id,
        queueResult,
      },
    });

    res.status(201).json({
      message: 'Elección creada on-chain y registrada correctamente.',
      electionId: receipt.electionId,
      election: electionPlain,
      queueSummary: queueResult,
      receipt,
    });
  } catch (error) {
    console.error('Error al crear elección:', error);
    try {
      await AdminAction.create({
        action_type: 'CREATE_ELECTION_FAILED',
        election_id: null,
        performed_by: req.headers['x-admin-identity'] || req.user?.email || null,
        request_ip: req.ip,
        metadata: {
          payload: req.body,
          error: error.message,
        },
      });
    } catch (logError) {
      console.error('No se pudo registrar la acción administrativa fallida (create election):', logError);
    }

    res.status(500).json({ message: error.message || 'No fue posible crear la elección on-chain.' });
  }
};

function normalizeElectionPayload(body) {
  const title = body.title;
  const description = body.description;

  const rawStart = body.start_time ?? body.startTime ?? null;
  const rawEnd = body.end_time ?? body.endTime ?? null;
  const rawDuration = body.duration ?? body.duration_minutes ?? null;

  const rawOptions = body.options ?? body.option_list ?? [];
  const rawInitialVoters = body.initial_voters ?? body.initialVoters ?? [];

  const optionList = Array.isArray(rawOptions)
    ? rawOptions
    : typeof rawOptions === 'string'
    ? rawOptions.split(/\r?\n|,/)
    : [];

  const voterList = Array.isArray(rawInitialVoters)
    ? rawInitialVoters
    : typeof rawInitialVoters === 'string'
    ? rawInitialVoters.split(/\r?\n|,/)
    : [];

  const sanitizedOptions = optionList.map((opt) => opt.trim()).filter(Boolean);
  const sanitizedVoters = voterList.map((addr) => addr.trim()).filter(Boolean);

  const convertToSeconds = (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0) {
        throw new Error('Los timestamps deben ser números positivos.');
      }
      return Math.floor(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return null;
      }

      if (/^\d+$/.test(trimmed)) {
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error('Los timestamps deben ser números positivos.');
        }
        return Math.floor(parsed);
      }

      const parsedDate = Date.parse(trimmed);
      if (Number.isNaN(parsedDate)) {
        throw new Error('Los timestamps deben ser fechas ISO válidas o segundos UNIX.');
      }
      return Math.floor(parsedDate / 1000);
    }

    throw new Error('Los timestamps deben ser números o cadenas de texto.');
  };

  let startTime = convertToSeconds(rawStart);
  let endTime = convertToSeconds(rawEnd);

  let durationMinutes = null;
  if (rawDuration !== null && rawDuration !== undefined && rawDuration !== '') {
    const parsedDuration = Number(rawDuration);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      throw new Error('duration_minutes debe ser un número positivo.');
    }
    durationMinutes = Math.floor(parsedDuration);
  }

  if (!endTime && startTime && durationMinutes) {
    endTime = Number(startTime) + Number(durationMinutes) * 60;
  }

  if (startTime !== null) {
    startTime = convertToSeconds(startTime);
  }

  if (endTime !== null) {
    endTime = convertToSeconds(endTime);
  }

  return {
    title,
    description,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    durationMinutes: durationMinutes ?? null,
    options: sanitizedOptions,
    initialVoters: sanitizedVoters,
  };
}

const listPersistedElections = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const { rows, count } = await Election.findAndCountAll({
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
    console.error('Error al listar elecciones persistidas:', error);
    res.status(500).json({ message: 'No fue posible obtener las elecciones registradas.' });
  }
};

const listRegisteredVoters = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;
    const where = {};

    if (req.query.role) {
      where.role = req.query.role;
    }

    const { rows, count } = await User.findAndCountAll({
      attributes: ['id', 'full_name', 'email', 'wallet_address', 'role', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
      where,
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
    console.error('Error al listar votantes registrados:', error);
    res.status(500).json({ message: 'No fue posible obtener el padrón de usuarios.' });
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

module.exports = {
  verifyAdmin,
  authorizeElectionVoters,
  createElection,
  listAdminActions,
  listPersistedElections,
  listRegisteredVoters,
};
