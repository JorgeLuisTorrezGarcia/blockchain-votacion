'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Election = sequelize.define('Election', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  on_chain_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  options: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  initial_voters: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  },
  tx_hash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  created_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'elections',
  timestamps: true,
})

module.exports = Election
