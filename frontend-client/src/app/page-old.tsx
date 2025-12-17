"use client";

import { FormEvent, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000/api";

type Message = { kind: "success" | "error"; text: string };

const initialElectionState = {
  id: "",
  title: "",
  description: "",
  startTime: 0,
  endTime: 0,
  creator: "",
  options: [] as string[],
  voteCounts: [] as number[],
};

export default function Home() {
  const [registerMsg, setRegisterMsg] = useState<Message | null>(null);
  const [loginMsg, setLoginMsg] = useState<Message | null>(null);
  const [linkMsg, setLinkMsg] = useState<Message | null>(null);
  const [electionMsg, setElectionMsg] = useState<Message | null>(null);
  const [voterMsg, setVoterMsg] = useState<Message | null>(null);
  const [adminMsg, setAdminMsg] = useState<Message | null>(null);
  const [adminCreateMsg, setAdminCreateMsg] = useState<Message | null>(null);

  const [token, setToken] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    email: string;
    full_name: string;
    role?: string;
  } | null>(null);

  const [electionData, setElectionData] = useState(initialElectionState);
  const [voterState, setVoterState] = useState<{
    electionId?: string;
    voterAddress?: string;
    isAuthorized?: boolean;
    hasVoted?: boolean;
  }>({});

  const [createdElection, setCreatedElection] = useState<{
    electionId: string;
    transactionHash: string;
    blockNumber: number;
    startTime: number;
    endTime: number;
    options: string[];
    initialVoters: string[];
  } | null>(null);

  const [loading, setLoading] = useState<string | null>(null);

  const request = async <T,>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody?.message || res.statusText);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const full_name = (form.elements.namedItem("fullName") as HTMLInputElement)
      .value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    setLoading("register");
    setRegisterMsg(null);
    try {
      await request<{ token: string }>(`/auth/register`, {
        method: "POST",
        body: JSON.stringify({ full_name, email, password }),
      });
      setRegisterMsg({
        kind: "success",
        text: "Usuario registrado. Inicia sesión para continuar.",
      });
      form.reset();
    } catch (error) {
      setRegisterMsg({ kind: "error", text: (error as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = (form.elements.namedItem("emailLogin") as HTMLInputElement)
      .value;
    const password = (form.elements.namedItem("passwordLogin") as HTMLInputElement)
      .value;

    setLoading("login");
    setLoginMsg(null);
    try {
      const data = await request<{
        token: string;
        id: number;
        full_name: string;
        email: string;
        role?: string;
      }>(`/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setCurrentUser({
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
      });
      setLoginMsg({ kind: "success", text: "Sesión iniciada correctamente." });
    } catch (error) {
      setLoginMsg({ kind: "error", text: (error as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const handleLinkWallet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const wallet_address = (form.elements.namedItem("wallet") as HTMLInputElement)
      .value.trim();

    if (!token) {
      setLinkMsg({
        kind: "error",
        text: "Inicia sesión para obtener tu token JWT.",
      });
      return;
    }

    setLoading("link-wallet");
    setLinkMsg(null);
    try {
      await request(`/users/link-wallet`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ wallet_address }),
      });
      setLinkMsg({ kind: "success", text: "Wallet vinculada con éxito." });
      form.reset();
    } catch (error) {
      setLinkMsg({ kind: "error", text: (error as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const handleElectionLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const electionId = (form.elements.namedItem("electionId") as HTMLInputElement)
      .value;

    setLoading("election");
    setElectionMsg(null);
    try {
      const data = await request<typeof initialElectionState>(
        `/elections/${electionId}`
      );
      setElectionData(data);
      setElectionMsg({ kind: "success", text: "Elección consultada correctamente." });
    } catch (error) {
      setElectionMsg({ kind: "error", text: (error as Error).message });
      setElectionData(initialElectionState);
    } finally {
      setLoading(null);
    }
  };

  const handleVoterCheck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const electionId = (form.elements.namedItem("voterElectionId") as HTMLInputElement)
      .value;
    const wallet = (form.elements.namedItem("voterWallet") as HTMLInputElement)
      .value.trim();

    setLoading("voter");
    setVoterMsg(null);
    try {
      const data = await request<{
        electionId: string;
        voterAddress: string;
        isAuthorized: boolean;
        hasVoted: boolean;
      }>(`/elections/${electionId}/voters/${wallet}`);

      setVoterState(data);
      setVoterMsg({ kind: "success", text: "Estado de votante actualizado." });
    } catch (error) {
      setVoterMsg({ kind: "error", text: (error as Error).message });
      setVoterState({});
    } finally {
      setLoading(null);
    }
  };

  const handleAdminAuthorize = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const electionId = (form.elements.namedItem("adminElectionId") as HTMLInputElement)
      .value;
    const addresses = (form.elements.namedItem("adminAddresses") as HTMLTextAreaElement)
      .value;
    const apiKey = (form.elements.namedItem("adminApiKey") as HTMLInputElement)
      .value;

    if (!token) {
      setAdminMsg({
        kind: "error",
        text: "Necesitas iniciar sesión con un usuario admin para firmar esta acción.",
      });
      return;
    }

    const voter_addresses = addresses
      .split(/[\n,]/)
      .map((addr) => addr.trim())
      .filter(Boolean);

    setLoading("admin");
    setAdminMsg(null);
    try {
      const receipt = await request<{ message: string }>(
        `/admin/elections/${electionId}/authorize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Admin-Api-Key": apiKey,
          },
          body: JSON.stringify({ voter_addresses }),
        }
      );
      setAdminMsg({
        kind: "success",
        text: receipt.message || "Transacción enviada correctamente.",
      });
      form.reset();
    } catch (error) {
      setAdminMsg({ kind: "error", text: (error as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const handleAdminCreateElection = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const title = (form.elements.namedItem("adminTitle") as HTMLInputElement)
      ?.value.trim();
    const description = (
      form.elements.namedItem("adminDescription") as HTMLTextAreaElement
    )?.value.trim();
    const startTime = (
      form.elements.namedItem("adminStartTime") as HTMLInputElement
    )?.value.trim();
    const endTime = (
      form.elements.namedItem("adminEndTime") as HTMLInputElement
    )?.value.trim();
    const optionsRaw = (
      form.elements.namedItem("adminOptions") as HTMLTextAreaElement
    )?.value;
    const votersRaw = (
      form.elements.namedItem("adminInitialVoters") as HTMLTextAreaElement
    )?.value;
    const apiKey = (
      form.elements.namedItem("adminCreateApiKey") as HTMLInputElement
    )?.value;

    if (!token || !hasAdminRole) {
      setAdminCreateMsg({
        kind: "error",
        text: "Debes iniciar sesión con un usuario admin para crear elecciones.",
      });
      return;
    }

    const options = optionsRaw
      ?.split(/\r?\n|,/) // soporta nueva línea o coma
      .map((option) => option.trim())
      .filter(Boolean);

    if (!options || options.length < 2) {
      setAdminCreateMsg({
        kind: "error",
        text: "Debes definir al menos dos opciones de voto.",
      });
      return;
    }

    const initialVoters = votersRaw
      ?.split(/\r?\n|,/)
      .map((address) => address.trim())
      .filter(Boolean);

    setLoading("create-election");
    setAdminCreateMsg(null);

    try {
      const payload = {
        title,
        description,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        options,
        initial_voters: initialVoters && initialVoters.length > 0 ? initialVoters : undefined,
      };

      const response = await request<{
        message: string;
        electionId: string;
        receipt: {
          transactionHash: string;
          blockNumber: number;
          startTime: number;
          endTime: number;
          options: string[];
          initialVoters: string[];
        };
      }>(`/admin/elections`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Admin-Api-Key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      setAdminCreateMsg({
        kind: "success",
        text:
          response.message ||
          `Elección creada con ID ${response.electionId}.`,
      });

      setCreatedElection({
        electionId: response.electionId,
        transactionHash: response.receipt.transactionHash,
        blockNumber: response.receipt.blockNumber,
        startTime: response.receipt.startTime,
        endTime: response.receipt.endTime,
        options: response.receipt.options,
        initialVoters: response.receipt.initialVoters,
      });

      form.reset();
    } catch (error) {
      setAdminCreateMsg({ kind: "error", text: (error as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (value: number) => {
    if (!value) return "Sin definir";
    return new Date(value * 1000).toLocaleString();
  };

  const hasAdminRole = currentUser?.role === "admin";

  return (
    <div className="shell">
      <header className="glass-panel hero">
        <div>
          <span className="pill">MVP listo para integrarse con Backend</span>
          <h1>
            Orquesta el padrón Web2 y verifica las elecciones on-chain desde un
            solo panel.
          </h1>
          <p>
            Registra votantes tradicionales, vincula sus wallets Web3, consulta
            resultados del contrato <strong>VotingSystem</strong> y sincroniza la
            lista blanca sin salir del dashboard.
          </p>
          <div className="cta-group">
            <button className="cta" onClick={() => document.getElementById("onboarding")?.scrollIntoView({ behavior: "smooth" })}>
              Empezar
            </button>
            <button
              className="cta secondary"
              onClick={() => document.getElementById("onchain")?.scrollIntoView({ behavior: "smooth" })}
            >
              Consultar elecciones
            </button>
          </div>
        </div>
        <div className="snapshot">
          <div className="stat">
            <span>Token activo</span>
            <strong>{token ? "JWT listo" : "Sesión pendiente"}</strong>
          </div>
          <div className="stat">
            <span>Rol detectado</span>
            <strong>{currentUser?.role || "Sin asignar"}</strong>
          </div>
          <div className="stat">
            <span>API destino</span>
            <strong>{API_BASE}</strong>
          </div>
        </div>
      </header>

      <section id="onboarding" className="stack">
        <div className="glass-panel">
          <h2>1. Onboarding Web2</h2>
          <p>
            Registra usuarios tradicionales y obtén su JWT. Después inicia sesión
            para acceder a las operaciones protegidas.
          </p>
          <div className="grid">
            <form className="card form" onSubmit={handleRegister}>
              <h3>Registro</h3>
              <label>
                Nombre completo
                <input name="fullName" type="text" required />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Contraseña
                <input name="password" type="password" required />
              </label>
              <button className="cta" disabled={loading === "register"}>
                {loading === "register" ? "Creando..." : "Crear cuenta"}
              </button>
              {registerMsg && (
                <p className={`message ${registerMsg.kind}`}>{registerMsg.text}</p>
              )}
            </form>

            <form className="card form" onSubmit={handleLogin}>
              <h3>Login</h3>
              <label>
                Email
                <input name="emailLogin" type="email" required />
              </label>
              <label>
                Contraseña
                <input name="passwordLogin" type="password" required />
              </label>
              <button className="cta" disabled={loading === "login"}>
                {loading === "login" ? "Validando..." : "Iniciar sesión"}
              </button>
              {loginMsg && (
                <p className={`message ${loginMsg.kind}`}>{loginMsg.text}</p>
              )}
            </form>
          </div>
        </div>

        <div className="glass-panel">
          <h2>2. Vincula la wallet autorizada</h2>
          <p>
            Una vez autenticado, vincula la dirección Web3 del votante para que el
            contrato pueda reconocerlo.
          </p>
          <form className="form columns" onSubmit={handleLinkWallet}>
            <label>
              Dirección (0x…)
              <input name="wallet" type="text" placeholder="0xabc..." required />
            </label>
            <button
              className="cta"
              disabled={!token || loading === "link-wallet"}
              type="submit"
            >
              {loading === "link-wallet" ? "Guardando..." : "Vincular wallet"}
            </button>
          </form>
          {linkMsg && <p className={`message ${linkMsg.kind}`}>{linkMsg.text}</p>}
        </div>
      </section>

      <section id="onchain" className="stack">
        <div className="glass-panel">
          <h2>3. Consulta elecciones on-chain</h2>
          <form className="form columns" onSubmit={handleElectionLookup}>
            <label>
              ID de elección
              <input name="electionId" type="number" min="1" required />
            </label>
            <button className="cta" type="submit" disabled={loading === "election"}>
              {loading === "election" ? "Consultando..." : "Obtener datos"}
            </button>
          </form>
          {electionMsg && (
            <p className={`message ${electionMsg.kind}`}>{electionMsg.text}</p>
          )}
          {electionData.id && (
            <div className="card">
              <h3>{electionData.title}</h3>
              <p>{electionData.description}</p>
              <div className="grid stats">
                <div>
                  <span>Inicio</span>
                  <strong>{formatDate(electionData.startTime)}</strong>
                </div>
                <div>
                  <span>Fin</span>
                  <strong>{formatDate(electionData.endTime)}</strong>
                </div>
                <div>
                  <span>Opciones</span>
                  <strong>{electionData.options.length}</strong>
                </div>
              </div>
              <div className="options">
                {electionData.options.map((option, index) => (
                  <div key={option} className="option">
                    <span>{option}</span>
                    <strong>{electionData.voteCounts[index]} votos</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h2>4. Verifica un votante específico</h2>
          <form className="form columns" onSubmit={handleVoterCheck}>
            <label>
              ID de elección
              <input name="voterElectionId" type="number" min="1" required />
            </label>
            <label>
              Wallet del votante
              <input name="voterWallet" type="text" placeholder="0x..." required />
            </label>
            <button className="cta" type="submit" disabled={loading === "voter"}>
              {loading === "voter" ? "Consultando..." : "Validar"}
            </button>
          </form>
          {voterMsg && <p className={`message ${voterMsg.kind}`}>{voterMsg.text}</p>}
          {voterState.voterAddress && (
            <div className="card">
              <p>
                <strong>{voterState.voterAddress}</strong>
              </p>
              <div className="grid stats two">
                <div>
                  <span>Autorizado</span>
                  <strong>{voterState.isAuthorized ? "Sí" : "No"}</strong>
                </div>
                <div>
                  <span>Ya votó</span>
                  <strong>{voterState.hasVoted ? "Sí" : "No"}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="stack">
        <div className="glass-panel warning">
          <div>
            <h2>5. Operaciones administrativas</h2>
            <p>
              Solo usuarios con rol <strong>admin</strong> y API Key válida pueden
              orquestar elecciones y sincronizar la whitelist. Cada acción queda
              registrada en la bitácora on-chain/off-chain.
            </p>
          </div>
          <div className="stack">
            <form
              className="form columns"
              onSubmit={handleAdminCreateElection}
            >
              <h3>Crear nueva elección</h3>
              <label>
                Título
                <input name="adminTitle" type="text" required />
              </label>
              <label className="full">
                Descripción
                <textarea
                  name="adminDescription"
                  rows={3}
                  placeholder="Descripción breve de la elección"
                />
              </label>
              <label>
                Inicio (timestamp o ISO)
                <input
                  name="adminStartTime"
                  type="text"
                  placeholder="0 o 2025-01-01T12:00:00Z"
                />
              </label>
              <label>
                Fin (timestamp o ISO)
                <input
                  name="adminEndTime"
                  type="text"
                  placeholder="0 o 2025-01-02T12:00:00Z"
                />
              </label>
              <label className="full">
                Opciones de voto (una por línea)
                <textarea
                  name="adminOptions"
                  rows={4}
                  placeholder="Opción A\nOpción B"
                  required
                />
              </label>
              <label className="full">
                Votantes iniciales (opcional, una wallet por línea)
                <textarea
                  name="adminInitialVoters"
                  rows={4}
                  placeholder="0xabc...\n0xdef..."
                />
              </label>
              <label>
                API Key
                <input
                  name="adminCreateApiKey"
                  type="password"
                  placeholder="admin_api_key"
                  required
                />
              </label>
              <button
                className="cta"
                disabled={!hasAdminRole || loading === "create-election"}
                type="submit"
              >
                {loading === "create-election" ? "Creando..." : "Crear elección"}
              </button>
              {adminCreateMsg && (
                <p className={`message ${adminCreateMsg.kind}`}>
                  {adminCreateMsg.text}
                </p>
              )}
              {!hasAdminRole && (
                <p className="message warning">
                  Debes iniciar sesión con un usuario admin y definir la API Key
                  para ejecutar este flujo.
                </p>
              )}
            </form>

            {createdElection && (
              <div className="card">
                <h3>Elección #{createdElection.electionId}</h3>
                <div className="grid stats">
                  <div>
                    <span>Inicio</span>
                    <strong>{formatDate(createdElection.startTime)}</strong>
                  </div>
                  <div>
                    <span>Fin</span>
                    <strong>{formatDate(createdElection.endTime)}</strong>
                  </div>
                  <div>
                    <span>Bloque</span>
                    <strong>{createdElection.blockNumber}</strong>
                  </div>
                </div>
                <div className="options">
                  {createdElection.options.map((option) => (
                    <div key={option} className="option">
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
                {createdElection.initialVoters.length > 0 && (
                  <div className="options">
                    {createdElection.initialVoters.map((address) => (
                      <div key={address} className="option">
                        <span>{address}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="message success">
                  Tx Hash: <code>{createdElection.transactionHash}</code>
                </p>
              </div>
            )}

            <form className="form columns" onSubmit={handleAdminAuthorize}>
            <label>
              Election ID
              <input name="adminElectionId" type="number" min="1" required />
            </label>
            <label>
              API Key
              <input name="adminApiKey" type="password" required />
            </label>
            <label className="full">
              Wallets a autorizar (una por línea)
              <textarea
                name="adminAddresses"
                rows={5}
                placeholder="0xabc...\n0xdef..."
                required
              />
            </label>
            <button
              className="cta"
              disabled={!hasAdminRole || loading === "admin"}
              type="submit"
            >
              {loading === "admin" ? "Firmando..." : "Autorizar lista blanca"}
            </button>
          </form>
          {adminMsg && <p className={`message ${adminMsg.kind}`}>{adminMsg.text}</p>}
          {!hasAdminRole && !adminCreateMsg && !adminMsg && (
            <p className="message warning">
              Debes iniciar sesión con un usuario admin y definir la API Key para
              ejecutar este flujo.
            </p>
          )}
          </div>
        </div>
      </section>
    </div>
  );
}
