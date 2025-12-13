const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

// Función auxiliar para generar el JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRATION,
    });
};

/**
 * @route POST /api/auth/register
 * @desc Registra un nuevo usuario en el padrón electoral.
 */
const registerUser = async (req, res) => {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ message: 'Por favor, completa todos los campos' });
    }

    try {
        const userExists = await User.findOne({ where: { email } });

        if (userExists) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // 1. Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 2. Crear usuario
        const user = await User.create({
            email,
            password_hash,
            full_name,
            is_verified: true // Asumimos verificación instantánea para el MVP
        });

        // 3. Responder con token y datos del usuario
        res.status(201).json({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            token: generateToken(user.id),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor al registrar usuario' });
    }
};

/**
 * @route POST /api/auth/login
 * @desc Autentica un usuario y retorna un JWT.
 */
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        // Verificar usuario y contraseña
        if (user && (await bcrypt.compare(password, user.password_hash))) {
            res.json({
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                wallet_address: user.wallet_address,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión' });
    }
};

module.exports = { registerUser, loginUser };