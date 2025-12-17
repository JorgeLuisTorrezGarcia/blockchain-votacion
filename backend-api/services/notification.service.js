'use strict'

const { Op } = require('sequelize')
const Notification = require('../models/Notification')
const User = require('../models/User')

const DEFAULT_FRONTEND_URL = 'http://localhost:3000'

function resolveBaseUrl() {
  const envUrl = process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL
  if (!envUrl) return DEFAULT_FRONTEND_URL
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
}

function buildElectionBody({ user, election, loginUrl, dashboardUrl }) {
  const greeting = user?.full_name ? `Hola ${user.full_name}` : 'Hola'
  return `${greeting},\n\n` +
    `Se ha publicado una nueva elección: "${election.title}".\n` +
    `ID de elección: ${election.on_chain_id}.\n\n` +
    `Para participar, inicia sesión en ${loginUrl} y consulta la elección utilizando ese ID.\n` +
    `Acceso directo al panel: ${dashboardUrl}\n\n` +
    `Recuerda vincular tu wallet antes de votar.`
}

async function queueElectionAnnouncement({ election, voterWallets = [], performedBy = null }) {
  const baseUrl = resolveBaseUrl()
  const loginUrl = `${baseUrl}/login`
  const dashboardUrl = `${baseUrl}/dashboard?election=${encodeURIComponent(election.on_chain_id)}`

  const normalizedWallets = Array.from(new Set(
    voterWallets
      .filter(Boolean)
      .map((addr) => addr.trim())
      .filter((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr))
  ))

  if (!normalizedWallets.length) {
    await Notification.create({
      user_id: null,
      channel: 'email',
      subject: `Nueva elección publicada: ${election.title}`,
      body: buildElectionBody({ user: null, election, loginUrl, dashboardUrl }),
      delivery_status: 'pending',
      metadata: {
        electionId: election.on_chain_id,
        loginUrl,
        dashboardUrl,
        performedBy,
        note: 'Sin wallets iniciales declaradas, notificación general.',
      },
    })
    return { targetedUsers: 0, unmatchedWallets: [] }
  }

  const whereClause = {
    [Op.or]: normalizedWallets.map((address) => ({ wallet_address: { [Op.iLike]: address } })),
  }

  const matchedUsers = await User.findAll({ where: whereClause })

  const notificationsPayload = matchedUsers.map((user) => ({
    user_id: user.id,
    channel: 'email',
    subject: `Nueva elección: ${election.title}`,
    body: buildElectionBody({ user, election, loginUrl, dashboardUrl }),
    delivery_status: 'pending',
    metadata: {
      electionId: election.on_chain_id,
      walletAddress: user.wallet_address,
      loginUrl,
      dashboardUrl,
      performedBy,
    },
  }))

  const matchedAddresses = new Set(matchedUsers.map((user) => user.wallet_address?.toLowerCase()))
  const unmatchedWallets = normalizedWallets.filter((wallet) => !matchedAddresses.has(wallet.toLowerCase()))

  if (notificationsPayload.length) {
    await Notification.bulkCreate(notificationsPayload)
  }

  if (unmatchedWallets.length) {
    await Notification.create({
      user_id: null,
      channel: 'email',
      subject: `Elección ${election.title} pendiente de difusión`,
      body: buildElectionBody({ user: null, election, loginUrl, dashboardUrl }),
      delivery_status: 'pending',
      metadata: {
        electionId: election.on_chain_id,
        loginUrl,
        dashboardUrl,
        unmatchedWallets,
        performedBy,
      },
    })
  }

  return {
    targetedUsers: matchedUsers.length,
    unmatchedWallets,
  }
}

module.exports = {
  queueElectionAnnouncement,
}
