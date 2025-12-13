const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Define el modelo User (el Padrón Electoral).
 * Campos críticos: email (autenticación) y wallet_address (identidad Web3).
 */
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        }
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    full_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
        comment: 'user = votante estándar, admin = operador con permisos sobre whitelist',
    },
    // Dirección de la billetera Web3 vinculada al usuario. CRÍTICO para el voto.
    wallet_address: {
        type: DataTypes.STRING,
        allowNull: true, // Puede ser nulo al inicio, se llena después del login
        unique: true,
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // En un MVP, esto puede ser ignorado o usado para habilitar el voto
    }
}, {
    tableName: 'users',
    timestamps: true,
});

module.exports = User;