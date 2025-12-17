const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DEFAULT_ABI_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'smart-contracts',
  'artifacts',
  'contracts',
  'VotingSystem.sol',
  'VotingSystem.json'
);

let cachedAbi;
let cachedContract;
let cachedWriteContract;

function normalizeTimestamp(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return 0n;
  }

  let numericValue;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return 0n;
    }

    if (/^\d+$/.test(trimmed)) {
      numericValue = Number(trimmed);
    } else {
      const parsed = Date.parse(trimmed);
      if (Number.isNaN(parsed)) {
        throw new Error(`${fieldName} debe ser un timestamp en segundos o una fecha ISO válida.`);
      }
      numericValue = Math.floor(parsed / 1000);
    }
  } else if (typeof value === 'number') {
    numericValue = value;
  } else {
    throw new Error(`${fieldName} debe ser un número o cadena de texto.`);
  }

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error(`${fieldName} debe ser un número positivo.`);
  }

  return BigInt(Math.floor(numericValue));
}

function getProvider() {
  const rpcUrl = process.env.SMART_CONTRACT_RPC_URL || 'http://127.0.0.1:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
}

function validateContractAddress() {
  const address = process.env.SMART_CONTRACT_ADDRESS;
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error('SMART_CONTRACT_ADDRESS no está configurada correctamente. Actualiza tu .env.');
  }
  return address;
}

function loadAbi() {
  if (cachedAbi) {
    return cachedAbi;
  }

  const candidatePaths = [];
  if (process.env.SMART_CONTRACT_ABI_PATH) {
    candidatePaths.push(process.env.SMART_CONTRACT_ABI_PATH);
  }
  candidatePaths.push(DEFAULT_ABI_PATH);

  for (const candidate of candidatePaths) {
    try {
      const abiFile = fs.readFileSync(candidate, 'utf-8');
      const json = JSON.parse(abiFile);
      if (json.abi) {
        cachedAbi = json.abi;
        return cachedAbi;
      }
    } catch (error) {
      // Intentar con el siguiente candidato
    }
  }

  throw new Error('No se pudo cargar el ABI de VotingSystem. Verifica SMART_CONTRACT_ABI_PATH.');
}

function getContract() {
  if (cachedContract) {
    return cachedContract;
  }

  const address = validateContractAddress();
  const abi = loadAbi();
  const provider = getProvider();

  cachedContract = new ethers.Contract(address, abi, provider);
  return cachedContract;
}

function validateAdminPrivateKey() {
  const pk = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (!pk || /^0x0+$/.test(pk)) {
    throw new Error('ADMIN_WALLET_PRIVATE_KEY no está configurada. Actualiza tu .env antes de firmar transacciones.');
  }
  return pk;
}

function getWriteContract() {
  if (cachedWriteContract) {
    return cachedWriteContract;
  }

  const address = validateContractAddress();
  const abi = loadAbi();
  const provider = getProvider();
  const signer = new ethers.Wallet(validateAdminPrivateKey(), provider);

  cachedWriteContract = new ethers.Contract(address, abi, signer);
  return cachedWriteContract;
}

function parseElectionId(electionId) {
  try {
    if (typeof electionId === 'string' && electionId.trim().length === 0) {
      throw new Error('El ID de elección debe ser un entero positivo.');
    }

    const id = BigInt(electionId);
    if (id <= 0n) {
      const error = new Error('El ID de elección debe ser un entero positivo.');
      error.code = 'INVALID_ELECTION_ID';
      throw error;
    }
    return id;
  } catch (err) {
    if (err.code === 'INVALID_ELECTION_ID') {
      throw err;
    }
    const error = new Error('El ID de elección debe ser un entero positivo.');
    error.code = 'INVALID_ELECTION_ID';
    throw error;
  }
}

function collectErrorMessages(error, visited = new Set()) {
  if (!error || typeof error !== 'object' || visited.has(error)) {
    return [];
  }
  visited.add(error);

  const messages = [];

  if (typeof error.message === 'string') {
    messages.push(error.message);
  }

  if (typeof error.shortMessage === 'string') {
    messages.push(error.shortMessage);
  }

  if (typeof error.reason === 'string') {
    messages.push(error.reason);
  }

  if (typeof error.code === 'string') {
    messages.push(error.code);
  }

  if (Array.isArray(error.stack)) {
    messages.push(...error.stack);
  }

  if (error.cause) {
    messages.push(...collectErrorMessages(error.cause, visited));
  }

  if (error.error) {
    messages.push(...collectErrorMessages(error.error, visited));
  }

  if (error.data && typeof error.data === 'object') {
    messages.push(...collectErrorMessages(error.data, visited));
  }

  if (error.info && typeof error.info === 'object') {
    messages.push(...collectErrorMessages(error.info, visited));
  }

  return messages;
}

function isElectionNotFoundError(error) {
  const aggregated = collectErrorMessages(error).join(' ').toUpperCase();
  return aggregated.includes('ELECTION_NOT_FOUND');
}

async function fetchElectionById(electionId) {
  const contract = getContract();
  const id = parseElectionId(electionId);

  try {
    const result = await contract.getElection(id);

    return {
      id: id.toString(),
      title: result[0],
      description: result[1],
      startTime: Number(result[2]),
      endTime: Number(result[3]),
      creator: result[4],
      options: result[5],
      voteCounts: result[6].map((value) => Number(value)),
    };
  } catch (error) {
    if (isElectionNotFoundError(error)) {
      const notFoundError = new Error('La elección solicitada no existe.');
      notFoundError.code = 'ELECTION_NOT_FOUND';
      throw notFoundError;
    }
    throw error;
  }
}

async function fetchVoterStatus(electionId, voterAddress) {
  const contract = getContract();
  const id = parseElectionId(electionId);

  try {
    const isAuthorized = await contract.isAuthorized(id, voterAddress);
    const hasVoted = await contract.hasAccountVoted(id, voterAddress);
    return {
      electionId: id.toString(),
      voterAddress,
      isAuthorized,
      hasVoted,
    };
  } catch (error) {
    if (isElectionNotFoundError(error)) {
      const notFoundError = new Error('La elección solicitada no existe.');
      notFoundError.code = 'ELECTION_NOT_FOUND';
      throw notFoundError;
    }
    throw error;
  }
}

async function authorizeWhitelist(electionId, voterAddresses) {
  if (!Array.isArray(voterAddresses) || voterAddresses.length === 0) {
    throw new Error('Debe proporcionar al menos una dirección para autorizar.');
  }

  const normalizedAddresses = voterAddresses.map((address) => {
    if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`Dirección inválida: ${address}`);
    }
    return address;
  });

  const contract = getWriteContract();
  const id = BigInt(electionId);
  const tx = await contract.authorizeVoters(id, normalizedAddresses);
  const receipt = await tx.wait();

  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status,
    authorized: normalizedAddresses,
  };
}

async function createElectionOnChain({
  title,
  description,
  startTime,
  endTime,
  options,
  initialVoters,
}) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('El título de la elección es obligatorio.');
  }

  const optionLabels = Array.isArray(options)
    ? options.map((option) => option?.trim()).filter(Boolean)
    : [];
  if (optionLabels.length < 2) {
    throw new Error('Debes proporcionar al menos dos opciones de voto.');
  }

  const voters = Array.isArray(initialVoters)
    ? initialVoters.map((addr) => addr?.trim()).filter(Boolean)
    : [];

  voters.forEach((address) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`Dirección de votante inválida: ${address}`);
    }
  });

  const start = normalizeTimestamp(startTime, 'start_time');
  const end = normalizeTimestamp(endTime, 'end_time');

  if (end !== 0n && start !== 0n && end <= start) {
    throw new Error('end_time debe ser mayor que start_time.');
  }

  const contract = getWriteContract();
  const args = [
    title.trim(),
    typeof description === 'string' ? description.trim() : '',
    start,
    end,
    optionLabels,
    voters,
  ];

  const predictedElectionId = await contract.createElection.staticCall(...args);
  const tx = await contract.createElection(...args);
  const receipt = await tx.wait();

  return {
    electionId: predictedElectionId.toString(),
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    startTime: Number(start),
    endTime: Number(end),
    options: optionLabels,
    initialVoters: voters,
  };
}

function extractRevertReason(error) {
  const messages = collectErrorMessages(error);
  for (const message of messages) {
    const match = message.match(/revert(?:ed)?(?: with reason string)?\s+'([^']+)'/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

async function impersonateAccount(provider, address) {
  try {
    await provider.send('hardhat_impersonateAccount', [address]);
  } catch (error) {
    const aggregated = collectErrorMessages(error).join(' ').toUpperCase();
    if (aggregated.includes('METHOD') && aggregated.includes('NOT FOUND')) {
      const customError = new Error('La red RPC configurada no permite impersonar cuentas. Ejecuta el nodo Hardhat local o firma el voto desde la wallet del usuario.');
      customError.code = 'IMPERSONATION_UNSUPPORTED';
      throw customError;
    }
    throw error;
  }
}

async function stopImpersonatingAccount(provider, address) {
  try {
    await provider.send('hardhat_stopImpersonatingAccount', [address]);
  } catch (error) {
    // Ignorar errores de limpieza de impersonación para no ocultar el resultado principal
  }
}

async function castVoteOnChain({ electionId, voterAddress, optionIndex }) {
  if (optionIndex === undefined || optionIndex === null) {
    const error = new Error('Debes especificar optionIndex.');
    error.code = 'INVALID_OPTION_INDEX';
    throw error;
  }

  const id = parseElectionId(electionId);

  const numericOption = Number(optionIndex);
  if (!Number.isFinite(numericOption) || !Number.isInteger(numericOption) || numericOption < 0) {
    const error = new Error('optionIndex debe ser un entero mayor o igual a cero.');
    error.code = 'INVALID_OPTION_INDEX';
    throw error;
  }

  let normalizedAddress;
  try {
    normalizedAddress = ethers.getAddress(voterAddress);
  } catch {
    const error = new Error('La wallet del votante no es una dirección válida.');
    error.code = 'INVALID_VOTER_ADDRESS';
    throw error;
  }

  const provider = getProvider();
  const contract = getContract();
  const optionBigInt = BigInt(numericOption);

  await impersonateAccount(provider, normalizedAddress);
  try {
    const signer = await provider.getSigner(normalizedAddress);
    const voterContract = contract.connect(signer);
    try {
      await voterContract.vote.staticCall(id, optionBigInt);
    } catch (error) {
      if (isElectionNotFoundError(error)) {
        const notFoundError = new Error('La elección solicitada no existe.');
        notFoundError.code = 'ELECTION_NOT_FOUND';
        throw notFoundError;
      }

      const revertReason = extractRevertReason(error);
      if (revertReason) {
        const code = revertReason
          .replace(/[^A-Z0-9_]/gi, '_')
          .toUpperCase();
        const customError = new Error(mapRevertReasonToMessage(revertReason));
        customError.code = code;
        throw customError;
      }

      throw error;
    }

    const tx = await voterContract.vote(id, optionBigInt);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      voter: normalizedAddress,
      electionId: id.toString(),
      optionIndex: numericOption,
    };
  } catch (error) {
    const revertReason = extractRevertReason(error);
    if (revertReason) {
      const code = revertReason
        .replace(/[^A-Z0-9_]/gi, '_')
        .toUpperCase();
      const customError = new Error(mapRevertReasonToMessage(revertReason));
      customError.code = code;
      throw customError;
    }

    throw error;
  } finally {
    await stopImpersonatingAccount(provider, normalizedAddress);
  }
}

function mapRevertReasonToMessage(reason) {
  switch (reason) {
    case 'ELECTION_NOT_STARTED':
      return 'La elección aún no ha iniciado.';
    case 'ELECTION_FINISHED':
      return 'La elección ya finalizó.';
    case 'NOT_AUTHORIZED':
      return 'Tu wallet no está autorizada para votar en esta elección.';
    case 'ALREADY_VOTED':
      return 'Ya emitiste un voto para esta elección.';
    case 'INVALID_OPTION':
      return 'La opción seleccionada no es válida.';
    default:
      return `La transacción fue revertida: ${reason}`;
  }
}

module.exports = {
  fetchElectionById,
  fetchVoterStatus,
  authorizeWhitelist,
  createElectionOnChain,
  castVoteOnChain,
};
