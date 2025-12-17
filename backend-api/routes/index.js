const express = require('express');
const { registerUser, loginUser } = require('../controllers/auth.controller');
const { linkWallet } = require('../controllers/wallet.controller');
const { getElectionById, getVoterStatus, voteInElection } = require('../controllers/election.controller');
const {
  verifyAdmin,
  authorizeElectionVoters,
  createElection,
  listAdminActions,
  listPersistedElections,
  listRegisteredVoters,
} = require('../controllers/admin.controller');

const { protect } = require('../middleware/auth.middleware');
const { adminGuard } = require('../middleware/admin.middleware');

const router = express.Router();

// Rutas de Autenticación (Web2)
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

// Rutas de Usuario (requieren JWT para saber quién es el usuario Web2)
router.patch('/users/link-wallet', protect, linkWallet);

// Rutas On-chain (lectura y acciones del votante)
router.get('/elections/:id', getElectionById);
router.get('/elections/:id/voters/:address', getVoterStatus);
router.post('/elections/:id/vote', protect, voteInElection);

// Admin (requiere JWT + API Key + rol admin)
router.get('/admin/verify', protect, verifyAdmin);
router.post('/admin/elections', protect, adminGuard, createElection);
router.get('/admin/elections', protect, adminGuard, listPersistedElections);
router.post('/admin/elections/:id/authorize', protect, adminGuard, authorizeElectionVoters);
router.get('/admin/voters', protect, adminGuard, listRegisteredVoters);
router.get('/admin/actions', protect, adminGuard, listAdminActions);

module.exports = router;