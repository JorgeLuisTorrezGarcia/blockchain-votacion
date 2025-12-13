const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminAction = sequelize.define('AdminAction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  election_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  action_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  performed_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Identidad declarada del administrador (header X-Admin-Identity opcional).',
  },
  request_ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'admin_actions',
  timestamps: true,
});

module.exports = AdminAction;
