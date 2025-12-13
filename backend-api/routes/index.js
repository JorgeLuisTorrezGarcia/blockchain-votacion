const express = require('express');
const { registerUser, loginUser } = require('../controllers/auth.controller');
const { linkWallet } = require('../controllers/wallet.controller');
const { getElectionById, getVoterStatus } = require('../controllers/election.controller');
const { authorizeElectionVoters, listAdminActions } = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { adminGuard } = require('../middleware/admin.middleware');

const router = express.Router();

// Rutas de Autenticación (Web2)
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

// Rutas de Usuario (requieren JWT para saber quién es el usuario Web2)
router.patch('/users/link-wallet', protect, linkWallet);

// Rutas On-chain (solo lectura)
router.get('/elections/:id', getElectionById);
router.get('/elections/:id/voters/:address', getVoterStatus);

// Admin (requiere JWT + API Key + rol admin)
router.post('/admin/elections/:id/authorize', protect, adminGuard, authorizeElectionVoters);
router.get('/admin/actions', protect, adminGuard, listAdminActions);

module.exports = router;