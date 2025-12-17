const { fetchElectionById, fetchVoterStatus, castVoteOnChain } = require('../services/blockchain.service');

/**
 * @route GET /api/elections/:id
 * @desc Consulta la información completa de una elección on-chain.
 */
const getElectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const election = await fetchElectionById(id);
    res.status(200).json(election);
  } catch (error) {
    console.error('Error al obtener la elección:', error.message);

    if (error.code === 'INVALID_ELECTION_ID') {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 'ELECTION_NOT_FOUND') {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'No fue posible consultar la elección. Revisa la configuración del contrato.' });
  }
};

/**
 * @route GET /api/elections/:id/voters/:address
 * @desc Verifica si una wallet está autorizada y si ya votó en la elección.
 */
const getVoterStatus = async (req, res) => {
  try {
    const { id, address } = req.params;
    const status = await fetchVoterStatus(id, address);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error al consultar el estado del votante:', error.message);

    if (error.code === 'INVALID_ELECTION_ID') {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 'ELECTION_NOT_FOUND') {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'No fue posible consultar al votante. Revisa la configuración del contrato.' });
  }
};

const voteInElection = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body ?? {};

    if (!req.user || !req.user.wallet_address) {
      return res.status(400).json({
        message: 'Vincula tu wallet antes de emitir un voto.',
      });
    }

    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({
        message: 'Debes seleccionar una opción válida para votar.',
      });
    }

    const receipt = await castVoteOnChain({
      electionId: id,
      voterAddress: req.user.wallet_address,
      optionIndex,
    });

    let updatedStatus = null;
    try {
      updatedStatus = await fetchVoterStatus(id, req.user.wallet_address);
    } catch (statusError) {
      console.warn('No se pudo refrescar el estado del votante:', statusError.message);
    }

    return res.status(200).json({
      message: 'Voto emitido correctamente.',
      receipt,
      voterStatus: updatedStatus,
    });
  } catch (error) {
    console.error('Error al emitir voto:', error.message);

    const statusByCode = {
      INVALID_ELECTION_ID: 400,
      INVALID_OPTION_INDEX: 400,
      INVALID_VOTER_ADDRESS: 400,
      ELECTION_NOT_FOUND: 404,
      NOT_AUTHORIZED: 403,
      ALREADY_VOTED: 409,
      ELECTION_NOT_STARTED: 409,
      ELECTION_FINISHED: 409,
      IMPERSONATION_UNSUPPORTED: 502,
    };

    const status = error.code ? statusByCode[error.code] : null;
    if (status) {
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: 'No fue posible emitir el voto. Revisa la configuración del contrato o la red.' });
  }
};

module.exports = {
  getElectionById,
  getVoterStatus,
  voteInElection,
};
