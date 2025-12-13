const User = require('../models/User');
require('dotenv').config();

/**
 * @route PATCH /api/users/link-wallet
 * @desc Vincula una dirección de wallet al usuario autenticado.
 */
const linkWallet = async (req, res) => {
    const { wallet_address } = req.body;

    if (!wallet_address || typeof wallet_address !== 'string') {
        return res.status(400).json({ message: 'La dirección de wallet es requerida y debe ser un string' });
    }

    // Validación básica de formato Ethereum (0x + 40 caracteres hex)
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
        return res.status(400).json({ message: 'Formato de dirección de wallet inválido' });
    }

    try {
        // Verificar que la wallet no esté ya vinculada a otro usuario
        const existingUser = await User.findOne({ where: { wallet_address } });
        if (existingUser) {
            return res.status(409).json({ message: 'La wallet ya está vinculada a otro usuario' });
        }

        // Actualizar el usuario autenticado con su wallet
        await req.user.update({ wallet_address });

        res.status(200).json({
            message: 'Wallet vinculada exitosamente',
            wallet_address,
        });
    } catch (error) {
        console.error('Error al vincular wallet:', error);
        res.status(500).json({ message: 'Error del servidor al vincular wallet' });
    }
};

module.exports = { linkWallet };
