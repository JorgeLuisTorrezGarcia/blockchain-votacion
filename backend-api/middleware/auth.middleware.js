const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('../models/User');

/**
 * Middleware para proteger rutas, verificando el token JWT.
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener token del header
            token = req.headers.authorization.split(' ')[1];

            // Verificar token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Adjuntar el usuario de la DB al objeto de la request (sin el hash de la contraseña)
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password_hash'] }
            });

            if (!req.user) {
                return res.status(401).json({ message: 'Usuario no encontrado' });
            }

            next();
        } catch (error) {
            console.error('Error de autenticación:', error.message);
            return res.status(401).json({ message: 'Token no autorizado o expirado' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No hay token de autorización' });
    }
};

module.exports = { protect };