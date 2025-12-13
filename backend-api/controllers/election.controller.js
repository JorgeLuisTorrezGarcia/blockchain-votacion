const { fetchElectionById, fetchVoterStatus } = require('../services/blockchain.service');

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
    res.status(500).json({ message: 'No fue posible consultar al votante. Revisa la configuración del contrato.' });
  }
};

module.exports = {
  getElectionById,
  getVoterStatus,
};
