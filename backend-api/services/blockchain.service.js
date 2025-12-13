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

async function fetchElectionById(electionId) {
  const contract = getContract();
  const id = BigInt(electionId);
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
}

async function fetchVoterStatus(electionId, voterAddress) {
  const contract = getContract();
  const id = BigInt(electionId);
  const isAuthorized = await contract.isAuthorized(id, voterAddress);
  const hasVoted = await contract.hasAccountVoted(id, voterAddress);
  return {
    electionId: id.toString(),
    voterAddress,
    isAuthorized,
    hasVoted,
  };
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

module.exports = {
  fetchElectionById,
  fetchVoterStatus,
  authorizeWhitelist,
};
