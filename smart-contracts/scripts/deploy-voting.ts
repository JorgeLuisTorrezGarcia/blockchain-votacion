import { network } from "hardhat";

type Address = `0x${string}`;

const DEFAULT_OPTIONS = ["A favor", "En contra"];

async function main() {
  const { viem, networkName } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  if (!walletClient) {
    throw new Error("No hay firmantes disponibles para el despliegue");
  }

  console.log(`Desplegando VotingSystem en la red ${networkName}...`);
  const contract = await viem.deployContract("VotingSystem");

  console.log("Contrato VotingSystem desplegado en:", contract.address);

  if (process.env.SEED_ELECTION !== "true") {
    console.log("Seed automático deshabilitado (SEED_ELECTION !== 'true').");
    return;
  }

  const title = process.env.SEED_ELECTION_TITLE ?? "Elección Demo";
  const description =
    process.env.SEED_ELECTION_DESCRIPTION ??
    "Elección de prueba creada desde el script de despliegue";

  const start = parseUintEnv(process.env.SEED_ELECTION_START);
  const end = parseUintEnv(process.env.SEED_ELECTION_END);

  const options = parseListEnv(process.env.SEED_ELECTION_OPTIONS) ?? DEFAULT_OPTIONS;
  if (options.length < 2) {
    throw new Error("Debes definir al menos dos opciones (SEED_ELECTION_OPTIONS)");
  }

  const voters = parseListEnv(process.env.SEED_ELECTION_VOTERS) as Address[] | undefined;
  const voterList = voters && voters.length > 0 ? voters : [walletClient.account.address as Address];

  console.log("Creando elección demo con:");
  console.log("  Título:", title);
  console.log("  Descripción:", description);
  console.log("  Inicio:", start === 0n ? "inmediato" : start.toString());
  console.log("  Fin:", end === 0n ? "sin definir" : end.toString());
  console.log("  Opciones:", options);
  console.log("  Votantes autorizados:", voterList);

  const txHash = await contract.write.createElection([title, description, start, end, options, voterList]);

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Elección demo creada. Hash de transacción:", txHash);
}

function parseUintEnv(value?: string): bigint {
  if (!value || value.trim().length === 0) {
    return 0n;
  }
  const parsed = BigInt(value);
  if (parsed < 0n) {
    throw new Error(`Los valores temporales deben ser positivos. Recibido: ${value}`);
  }
  return parsed;
}

function parseListEnv(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : undefined;
}

await main().catch((error) => {
  console.error("Error durante el despliegue:", error);
  process.exitCode = 1;
});
