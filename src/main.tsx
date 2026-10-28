import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io, Socket } from "socket.io-client";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Headphones,
  LogOut,
  Maximize,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  Phone,
  PhoneOff,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  Signal,
  Users,
  Video,
  VideoOff,
  X,
  Clock,
  Link,
  Volume2,
  Sparkles,
} from "lucide-react";
import { api, User, getSessionToken } from "./api";
import { usePWAInstall } from "./usePWAInstall";
import { qualities } from "./quality";
import type { Quality } from "./quality";
import type { MediaCall } from "./media";
import "./style.css";
const Avatar = ({ user, size = 42 }: { user: User; size?: number }) => (
  <span
    className="avatar"
    style={{
      width: size,
      height: size,
      background: user.avatar + "25",
      color: user.avatar,
      fontSize: size * 0.35,
    }}
  >
    {user.photo ? (
      <img
        src={user.photo}
        alt={user.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "inherit",
        }}
      />
    ) : (
      user.name.slice(0, 2).toUpperCase()
    )}
  </span>
);
function Media({
  stream,
  muted = false,
  fit = "contain",
  volume = 1,
  sink = "",
  crisp = false,
}: {
  stream: MediaStream;
  muted?: boolean;
  fit?: string;
  volume?: number;
  sink?: string;
  crisp?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const e = ref.current;
    if (!e) return;
    e.srcObject = stream;
    e.volume = volume;
    void e.play().catch(() => {});
    if (sink && (e as any).setSinkId)
      void (e as any).setSinkId(sink).catch(() => {});
    return () => {
      e.srcObject = null;
    };
  }, [stream, volume, sink]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      style={{
        objectFit: fit as any,
        imageRendering: crisp ? ("-webkit-optimize-contrast" as any) : undefined,
        transform: "translateZ(0)",
      }}
    />
  );
}
function Auth({ done }: { done: () => void }) {
  const reset = new URLSearchParams(location.search).get("reset");
  const [mode, setMode] = useState(reset ? "reset" : "register"),
    [handle, H] = useState(""),
    [name, N] = useState(""),
    [email, E] = useState(""),
    [password, P] = useState(""),
    [avatar, A] = useState("#a697ff"),
    [available, AV] = useState<boolean | null>(null),
    [error, ERR] = useState(""),
    [busy, B] = useState(false);
  useEffect(() => {
    AV(null);
    const c = new AbortController();
    const t = setTimeout(() => {
      if (handle)
        fetch("/api/handles/" + encodeURIComponent(handle), {
          signal: c.signal,
        })
          .then((r) => r.json())
          .then((r) => AV(r.available))
          .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [handle]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    B(true);
    ERR("");
    try {
      await api(
        "/auth/" + mode,
        "POST",
        mode === "reset"
          ? { token: reset, password }
          : mode === "recover"
            ? { email }
            : { email, password, handle, name, avatar },
      );
      if (mode === "recover") {
        ERR("Se a conta existir, enviaremos um link por e-mail.");
        return;
      }
      if (mode === "reset") {
        history.replaceState({}, "", "/");
        setMode("login");
        ERR("Senha atualizada. Entre na sua conta.");
        return;
      }
      done();
    } catch (e) {
      ERR((e as Error).message);
    } finally {
      B(false);
    }
  }
  return (
    <main className="welcome">
      <section className="welcome-story">
        <a className="brand" href="/">
          <span className="logo">N</span>nexo
          <span className="brand-dot">®</span>
        </a>
        <div>
          <span className="eyebrow">MENOS DISTÂNCIA. MAIS PRESENÇA.</span>
          <h1>
            Seu lugar.
            <br />
            Sua gente.
            <br />
            <em>Na mesma tela.</em>
          </h1>
          <p>
            Uma conversa, uma ideia, aquele vídeo.
            <br />
            Compartilhe o momento com quem importa.
          </p>
          <div className="orbit">
            <span className="orb orb-one">
              <Headphones size={38} />
            </span>
            <span className="orb orb-two">
              <Monitor size={45} />
            </span>
            <span className="orb orb-three">
              <Video size={28} />
            </span>
            <i />
            <i />
          </div>
        </div>
        <footer>
          <Shield size={15} /> Conexões privadas. Sem anúncios. Só vocês.
        </footer>
      </section>
      <section className="welcome-form">
        <div className="auth-card">
          <div className="pill">
            <span className="dot" /> CONEXÕES QUE APROXIMAM
          </div>
          <h2>
            {mode === "register"
              ? "Tudo começa com um @."
              : mode === "login"
                ? "Bom ter você de volta."
                : mode === "reset"
                  ? "Uma nova senha."
                  : "Recupere sua conta."}
          </h2>
          <p className="muted">
            {mode === "register"
              ? "Crie seu perfil e encontre sua próxima boa conversa."
              : "Seu espaço está esperando por você."}
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <button
                  type="button"
                  className="secondary"
                  style={{
                    width: "100%",
                    marginBottom: 16,
                    padding: "8px 12px",
                    fontSize: "0.82rem",
                    gap: "8px",
                    border: "1px dashed rgba(173, 155, 255, 0.4)",
                    color: "#c4b5fd",
                  }}
                  onClick={() => {
                    const rand = Math.floor(100 + Math.random() * 900);
                    H("usuario_" + rand);
                    N("Usuário " + rand);
                    E("usuario_" + rand + "@nexo.local");
                    P("senha-segura-12345");
                  }}
                >
                  <Sparkles size={14} /> Preencher perfil de teste rápido
                </button>
                <div className="avatar-picker">
                  <Avatar
                    user={{ name: name || "Você", avatar } as User}
                    size={64}
                  />
                  <div>
                    <b>Seu primeiro toque pessoal</b>
                    <div className="colors">
                      {[
                        "#a697ff",
                        "#7ed8bc",
                        "#f4bd7b",
                        "#ea98b5",
                        "#8cbcf5",
                      ].map((c) => (
                        <button
                          type="button"
                          key={c}
                          aria-label={"Cor " + c}
                          className={avatar === c ? "selected" : ""}
                          style={{ background: c }}
                          onClick={() => A(c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <label>
                  Como podemos chamar você?
                  <input
                    required
                    maxLength={50}
                    placeholder="Seu nome de exibição"
                    value={name}
                    onChange={(e) => N(e.target.value)}
                  />
                </label>
                <label>
                  Seu identificador
                  <div className="input-icon">
                    <span>@</span>
                    <input
                      required
                      minLength={3}
                      maxLength={24}
                      pattern="[a-zA-Z][a-zA-Z0-9_]{2,23}"
                      placeholder="seunome"
                      value={handle}
                      onChange={(e) => H(e.target.value.toLowerCase())}
                    />
                  </div>
                </label>
                <small className={available ? "success" : "muted"}>
                  {handle
                    ? available === null
                      ? "Verificando…"
                      : available
                        ? "@" + handle + " está disponível"
                        : "Nome inválido, reservado ou já utilizado"
                    : "De 3 a 24 letras, números ou _. Comece com uma letra."}
                </small>
              </>
            )}
            {mode !== "reset" && (
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => E(e.target.value)}
                />
              </label>
            )}
            {mode !== "recover" && (
              <label>
                Senha
                <input
                  type="password"
                  required
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={72}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="Pelo menos 12 caracteres"
                  value={password}
                  onChange={(e) => P(e.target.value)}
                />
              </label>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button
              className="primary wide"
              disabled={busy || (mode === "register" && available !== true)}
            >
              {busy
                ? "Um instante…"
                : mode === "register"
                  ? "Criar meu perfil"
                  : mode === "login"
                    ? "Entrar"
                    : mode === "reset"
                      ? "Salvar senha"
                      : "Enviar link"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <div className="auth-links">
            {mode === "register" ? (
              <>
                Já faz parte?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    ERR("");
                  }}
                >
                  Entrar na minha conta
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMode("register");
                  ERR("");
                }}
              >
                Criar uma conta
              </button>
            )}
            {mode === "login" && (
              <button
                onClick={() => {
                  setMode("recover");
                  ERR("");
                }}
              >
                Esqueci minha senha
              </button>
            )}
          </div>
          <p className="fine">
            Seu @ é só seu. Sua câmera e seu microfone só serão
            <br />
            ativados com a sua permissão.
          </p>
        </div>
      </section>
    </main>
  );
}

function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={() => void install()}
        className="secondary"
        style={{ padding: "6px 12px", fontSize: "0.85rem", gap: "6px" }}
        title="Instalar aplicativo Nexo"
      >
        <ArrowUpRight size={15} />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="secondary"
          style={{ padding: "6px 10px", fontSize: "0.8rem", gap: "6px" }}
        >
          <span>Instalar no iOS</span>
        </button>
        {showIOSGuide && (
          <div className="modal-backdrop" onClick={() => setShowIOSGuide(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
              <div className="modal-header">
                <h3>Instalar no iPhone / iPad</h3>
                <button onClick={() => setShowIOSGuide(false)}><X size={18} /></button>
              </div>
              <p style={{ lineHeight: 1.5, color: "var(--muted)", margin: "16px 0" }}>
                1. Toque no botão <strong>Compartilhar</strong> no Safari.<br />
                2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
              </p>
              <button className="primary wide" onClick={() => setShowIOSGuide(false)}>Entendi</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

function MediaLabModal({
  onClose,
  onStartEchoCall,
}: {
  onClose: () => void;
  onStartEchoCall: () => void;
}) {
  const [labTab, setLabTab] = useState<"screen" | "audio" | "camera">("screen");
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenQuality, setScreenQuality] = useState<Quality>("1080p · 60 FPS");
  const [screenMode, setScreenMode] = useState<"detail" | "motion">("detail");
  const [screenRes, setScreenRes] = useState<string>("");
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [labError, setLabError] = useState<string>("");
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let animId: number;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    if (micStream && micStream.getAudioTracks().length > 0) {
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source = audioCtx.createMediaStreamSource(micStream);
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser!.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animId = requestAnimationFrame(tick);
        };
        tick();
      } catch {}
    }
    return () => {
      cancelAnimationFrame(animId);
      audioCtx?.close().catch(() => {});
    };
  }, [micStream]);

  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    if (camVideoRef.current) {
      camVideoRef.current.srcObject = camStream;
    }
  }, [camStream]);

  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach((t) => t.stop());
      micStream?.getTracks().forEach((t) => t.stop());
      camStream?.getTracks().forEach((t) => t.stop());
    };
  }, [screenStream, micStream, camStream]);

  async function startScreenTest() {
    setLabError("");
    try {
      const [width, height, fps] = qualities[screenQuality];
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: width, max: width },
          height: { ideal: height, max: height },
          frameRate: { ideal: fps, max: fps },
          cursor: "always",
          displaySurface: "monitor",
        } as any,
        audio: true,
      });
      const track = s.getVideoTracks()[0];
      track.contentHint = screenMode;
      const settings = track.getSettings();
      setScreenRes(
        `${settings.width || width} × ${settings.height || height} @ ${Math.round(settings.frameRate || fps)} FPS`,
      );
      track.onended = () => {
        setScreenStream(null);
        setScreenRes("");
      };
      setScreenStream(s);
    } catch (e: any) {
      setLabError("Não foi possível iniciar o espelhamento: " + (e?.message || e));
    }
  }

  function stopScreenTest() {
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setScreenRes("");
  }

  async function startMicTest() {
    setLabError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setMicStream(s);
    } catch (e: any) {
      setLabError("Erro ao acessar microfone: " + (e?.message || e));
    }
  }

  async function startCamTest() {
    setLabError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCamStream(s);
    } catch (e: any) {
      setLabError("Erro ao acessar câmera: " + (e?.message || e));
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal media-lab-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="logo"
              style={{
                width: 28,
                height: 28,
                fontSize: 18,
                borderRadius: 8,
              }}
            >
              N
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                Laboratório de Teste de Mídia
              </h3>
              <small className="muted">
                Verifique a qualidade real de tela, câmera e microfone
              </small>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="media-lab-tabs">
          <button
            className={labTab === "screen" ? "active" : ""}
            onClick={() => setLabTab("screen")}
          >
            <Monitor size={15} /> Espelhamento de Tela
          </button>
          <button
            className={labTab === "audio" ? "active" : ""}
            onClick={() => setLabTab("audio")}
          >
            <Mic size={15} /> Microfone & Áudio
          </button>
          <button
            className={labTab === "camera" ? "active" : ""}
            onClick={() => setLabTab("camera")}
          >
            <Video size={15} /> Câmera
          </button>
        </div>

        {labError && (
          <div
            style={{
              margin: "12px 0 0",
              padding: "10px 14px",
              background: "#ef444422",
              border: "1px solid #ef444466",
              borderRadius: 8,
              color: "#fca5a5",
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {labError}
          </div>
        )}

        <div className="media-lab-content">
          {labTab === "screen" && (
            <div className="screen-test-box">
              <div className="screen-test-controls">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <label style={{ margin: 0, fontSize: 12 }}>
                    Meta de Resolução & Taxa
                    <select
                      value={screenQuality}
                      onChange={(e) =>
                        setScreenQuality(e.target.value as Quality)
                      }
                      style={{ padding: "8px 10px" }}
                    >
                      {Object.keys(qualities).map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ margin: 0, fontSize: 12 }}>
                    Modo de Transmissão
                    <select
                      value={screenMode}
                      onChange={(e) => setScreenMode(e.target.value as any)}
                      style={{ padding: "8px 10px" }}
                    >
                      <option value="detail">
                        Ultra Nitidez (Texto & Código)
                      </option>
                      <option value="motion">
                        Fluidez Máxima (Vídeo & Jogos)
                      </option>
                    </select>
                  </label>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {!screenStream ? (
                    <button
                      className="primary"
                      onClick={startScreenTest}
                      style={{ gap: 8 }}
                    >
                      <Monitor size={17} /> Iniciar Teste de Espelhamento
                    </button>
                  ) : (
                    <>
                      <button
                        className="secondary"
                        onClick={stopScreenTest}
                        style={{ color: "#f87171" }}
                      >
                        <X size={16} /> Parar Espelhamento
                      </button>
                      <button
                        className="secondary"
                        onClick={() => {
                          if (screenVideoRef.current?.requestFullscreen) {
                            screenVideoRef.current.requestFullscreen();
                          }
                        }}
                      >
                        <Maximize size={16} /> Testar Tela Inteira
                      </button>
                    </>
                  )}
                  <button
                    className="secondary"
                    onClick={onStartEchoCall}
                    style={{ marginLeft: "auto" }}
                  >
                    <Phone size={15} /> Chamada Echo de Teste
                  </button>
                </div>
              </div>

              {screenStream ? (
                <div className="screen-preview-wrapper">
                  <div className="screen-info-badge">
                    <span className="dot" style={{ background: "#10b981" }} />
                    <span>Ao vivo: {screenRes || screenQuality}</span>
                    <span className="badge-pill">
                      {screenMode === "detail" ? "Ultra Nitidez" : "Fluidez"}
                    </span>
                  </div>
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      maxHeight: "360px",
                      borderRadius: 12,
                      background: "#000",
                      objectFit: "contain",
                      imageRendering: "-webkit-optimize-contrast" as any,
                    }}
                  />
                </div>
              ) : (
                <div className="screen-placeholder">
                  <Monitor
                    size={42}
                    style={{ opacity: 0.4, marginBottom: 10 }}
                  />
                  <b>Teste seu espelhamento de tela em tempo real</b>
                  <p
                    className="muted"
                    style={{
                      fontSize: 12,
                      maxWidth: 360,
                      textAlign: "center",
                      margin: "6px 0 0",
                    }}
                  >
                    Compartilhe qualquer janela, aba ou monitor para verificar
                    a nitidez cristalina, taxa de quadros e modo tela inteira.
                  </p>
                </div>
              )}
            </div>
          )}

          {labTab === "audio" && (
            <div className="audio-test-box">
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {!micStream ? (
                  <button className="primary" onClick={startMicTest}>
                    <Mic size={16} /> Ativar Teste de Microfone
                  </button>
                ) : (
                  <button
                    className="secondary"
                    onClick={() => {
                      micStream.getTracks().forEach((t) => t.stop());
                      setMicStream(null);
                      setMicLevel(0);
                    }}
                  >
                    <MicOff size={16} /> Desativar Microfone
                  </button>
                )}
                <button className="secondary" onClick={onStartEchoCall}>
                  <Phone size={16} /> Iniciar Chamada Echo de Teste
                </button>
              </div>

              {micStream ? (
                <div
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    padding: 18,
                    borderRadius: 12,
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      fontSize: 12,
                    }}
                  >
                    <span>Sensibilidade e Nível de Voz:</span>
                    <b
                      style={{
                        color: micLevel > 15 ? "#10b981" : "var(--muted)",
                      }}
                    >
                      {micLevel}%
                    </b>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 12,
                      background: "#222",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${micLevel}%`,
                        height: "100%",
                        background:
                          micLevel > 65
                            ? "#ef4444"
                            : micLevel > 20
                              ? "#10b981"
                              : "#8b5cf6",
                        transition: "width 0.05s ease-out",
                      }}
                    />
                  </div>
                  <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
                    Fale próximo ao microfone. O analisador responde em tempo
                    real com cancelamento de eco e supressão de ruído ativos.
                  </p>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 12 }}>
                  Clique em "Ativar Teste de Microfone" para medir a captação
                  da sua voz em tempo real.
                </p>
              )}
            </div>
          )}

          {labTab === "camera" && (
            <div className="cam-test-box">
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {!camStream ? (
                  <button className="primary" onClick={startCamTest}>
                    <Video size={16} /> Ativar Câmera
                  </button>
                ) : (
                  <button
                    className="secondary"
                    onClick={() => {
                      camStream.getTracks().forEach((t) => t.stop());
                      setCamStream(null);
                    }}
                  >
                    <VideoOff size={16} /> Desativar Câmera
                  </button>
                )}
              </div>
              {camStream ? (
                <video
                  ref={camVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    borderRadius: 12,
                    background: "#000",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div className="screen-placeholder">
                  <Video
                    size={36}
                    style={{ opacity: 0.4, marginBottom: 8 }}
                  />
                  <p className="muted" style={{ fontSize: 12 }}>
                    Clique em "Ativar Câmera" para verificar enquadramento e
                    resolução.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [me, M] = useState<User | null>(null),
    [loading, L] = useState(true),
    [error, E] = useState(""),
    [relations, R] = useState<any[]>([]),
    [online, O] = useState<string[]>([]),
    [recent, RC] = useState<any[]>([]),
    [tab, T] = useState("friends"),
    [query, Q] = useState(""),
    [results, RS] = useState<User[]>([]),
    [selected, S] = useState<User | null>(null),
    [messages, MS] = useState<any[]>([]),
    [draft, D] = useState(""),
    [typing, TY] = useState(false),
    [settings, ST] = useState(false),
    [incoming, IN] = useState<any>(null),
    [call, C] = useState<any>(null),
    [stats, SS] = useState<any>({}),
    [chat, CH] = useState(false),
    [quality, QU] = useState<Quality>("1080p · 60 FPS"),
    [mode, MO] = useState("detail"),
    [fit, F] = useState("contain"),
    [controls, CT] = useState(true),
    [mediaLab, setMediaLab] = useState(false),
    [elapsed, EL] = useState(0),
    [devices, DE] = useState<MediaDeviceInfo[]>([]),
    [mic, MI] = useState(""),
    [camera, CA] = useState(""),
    [sink, SI] = useState(""),
    [volume, V] = useState(1),
    [testLevel, TL] = useState<number | null>(null),
    [connected, CO] = useState(false);
  const [, render] = useState(0);
  const socket = useRef<Socket | null>(null),
    media = useRef<MediaCall | null>(null),
    callRef = useRef<any>(null),
    incomingRef = useRef<any>(null),
    selectedRef = useRef<User | null>(null),
    stage = useRef<HTMLDivElement>(null),
    hide = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    testCleanup = useRef<(() => void) | null>(null),
    initPending = useRef(false);
  selectedRef.current = selected;
  callRef.current = call;
  incomingRef.current = incoming;
  const fail = (e: unknown) => E(e instanceof Error ? e.message : String(e));
  const safe = async (fn: () => Promise<any>) => {
    try {
      await fn();
    } catch (e) {
      fail(e);
    }
  };
  const refresh = async () => {
    const [r, c] = await Promise.all([api("/relations"), api("/calls")]);
    R(r);
    RC(c);
  };
  const load = async () => {
    try {
      M(await api("/me"));
    } catch {
      M(null);
    } finally {
      L(false);
    }
  };
  useEffect(() => {
    void load();
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js");
  }, []);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => E(""), 7000);
      return () => clearTimeout(t);
    }
  }, [error]);
  function endLocal() {
    media.current?.close();
    media.current = null;
    C(null);
    IN(null);
    SS({});
    EL(0);
    void safe(refresh);
  }
  const emit = (event: string, data: any) =>
    new Promise<any>((resolve, reject) => {
      const s = socket.current;
      if (!s?.connected)
        return reject(Error("Sinalização desconectada. Aguarde."));
      s.timeout(10000).emit(event, data, (err: any, r: any) =>
        err
          ? reject(Error("Tempo de resposta esgotado"))
          : r?.ok
            ? resolve(r.data)
            : reject(Error(r?.error || "Operação falhou")),
      );
    });
  useEffect(() => {
    if (!me) return;
    void safe(refresh);
    const invite = new URLSearchParams(location.search).get("invite");
    if (invite) {
      Q(invite);
      T("add");
    }
    const s = io({
      withCredentials: true,
      auth: { token: getSessionToken() },
    });
    socket.current = s;
    s.on("connect", () => {
      CO(true);
      s.emit("call:resume", {}, (r: any) => {
        if (media.current && !r?.data?.id) endLocal();
      });
    });
    s.on("disconnect", () => CO(false));
    s.on("connect_error", () => CO(false));
    s.on("refresh", () => void safe(refresh));
    s.on("presence", O);
    s.on("call:incoming", (c) => {
      IN(c);
      if (
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      )
        new Notification("Chamada de " + c.user.name);
    });
    s.on("call:end", (c) => {
      if (c.id === callRef.current?.id || c.id === incomingRef.current?.id)
        endLocal();
    });
    s.on("call:accepted", () => {
      if (media.current) {
        media.current.accepted = true;
        C((c: any) => ({ ...c, state: "active", started: Date.now() }));
        void media.current.offer();
      }
    });
    s.on("signal", (p) => {
      if (media.current && p.id === media.current.id)
        void media.current.signal(p);
    });
    s.on("call:reconnect", (p) => {
      if (media.current && media.current.id === p.id && p.initiator === me.id)
        media.current.restart();
    });
    s.on("message", (m) => {
      if ([m.fromId, m.toId].includes(selectedRef.current?.id)) {
        MS((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      }
      if (m.fromId !== me.id) {
        if (m.fromId !== selectedRef.current?.id) E("Nova mensagem recebida");
        TY(false);
      }
    });
    let typingTimer: ReturnType<typeof setTimeout>;
    s.on("typing", (p) => {
      if (p.fromId === selectedRef.current?.id) {
        TY(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => TY(false), 2000);
      }
    });
    return () => {
      s.disconnect();
      media.current?.close();
      clearTimeout(typingTimer);
      testCleanup.current?.();
      clearTimeout(hide.current);
    };
  }, [me?.id]);
  useEffect(() => {
    const t = setTimeout(() => {
      void safe(async () =>
        RS(
          query.length > 1
            ? await api("/users?q=" + encodeURIComponent(query))
            : [],
        ),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    if (selected) {
      let cancelled = false;
      MS([]);
      void api("/messages/" + selected.id)
        .then((m) => {
          if (!cancelled) MS(m);
        })
        .catch(fail);
      return () => {
        cancelled = true;
      };
    }
  }, [selected?.id]);
  useEffect(() => {
    if (call?.state !== "active") return;
    const t = setInterval(
      () => EL(Math.floor((Date.now() - call.started) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [call?.state, call?.started]);
  useEffect(() => {
    const update = () =>
      navigator.mediaDevices
        ?.enumerateDevices()
        .then(DE)
        .catch(() => {});
    update();
    navigator.mediaDevices?.addEventListener("devicechange", update);
    return () =>
      navigator.mediaDevices?.removeEventListener("devicechange", update);
  }, []);
  async function prepare(id: string, video: boolean, polite: boolean) {
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error(
        "Microfone indisponível. Use HTTPS e um navegador compatível.",
      );
    const { MediaCall } = await import("./media");
    const m = new MediaCall(
      socket.current!,
      id,
      () => render((x) => x + 1),
      (s) => SS((v: any) => ({ ...v, ...s })),
      E,
    );
    media.current = m;
    try {
      await m.init(video, polite, mic, camera);
      DE(await navigator.mediaDevices.enumerateDevices());
      return m;
    } catch (e) {
      m.close();
      media.current = null;
      throw Error(
        (e as Error).name === "NotAllowedError"
          ? "Permissão negada. Autorize o microfone/câmera nas configurações do navegador."
          : (e as Error).message,
      );
    }
  }
  async function start(u: User, video: boolean) {
    if (initPending.current || media.current) return;
    initPending.current = true;
    let id = "";
    try {
      const m = await prepare("", video, false);
      const c = await emit("call:start", { toId: u.id, video });
      id = c.id;
      m.id = id;
      S(u);
      C({ ...c, user: u });
      SS({ connection: "connecting" });
    } catch (e) {
      (media.current as MediaCall | null)?.close();
      media.current = null;
      if (id) void emit("call:end", { id });
      fail(e);
    } finally {
      initPending.current = false;
    }
  }
  async function answer(accept: boolean) {
    if (!incoming || initPending.current) return;
    const c = incoming;
    if (!accept) {
      await emit("call:answer", { id: c.id, accept: false });
      IN(null);
      return;
    }
    initPending.current = true;
    try {
      await prepare(c.id, c.video, true);
      await emit("call:answer", { id: c.id, accept: true });
      media.current!.accepted = true;
      C({ ...c, state: "active", started: Date.now() });
      S(c.user);
      IN(null);
    } catch (e) {
      media.current?.close();
      media.current = null;
      await emit("call:answer", { id: c.id, accept: false }).catch(() => {});
      IN(null);
      throw e;
    } finally {
      initPending.current = false;
    }
  }
  async function hangup() {
    const id = media.current?.id;
    endLocal();
    if (id && !id.startsWith("echo-")) await emit("call:end", { id });
  }
  async function startEchoCall() {
    setMediaLab(false);
    if (initPending.current || media.current) return;
    initPending.current = true;
    try {
      const fakeBot: User = {
        id: "echo_bot",
        handle: "nexo_echo",
        name: "Echo Test (Espelho Nexo)",
        avatar: "#8b5cf6",
        status: "online",
      };
      const callObj = {
        id: "echo-" + Date.now(),
        fromId: me!.id,
        toId: "echo_bot",
        video: true,
        state: "active",
        user: fakeBot,
        started: Date.now(),
      };
      const { MediaCall } = await import("./media");
      const m = new MediaCall(
        socket.current || ({} as any),
        callObj.id,
        () => render((x) => x + 1),
        (s) => SS((v: any) => ({ ...v, ...s })),
        E,
      );
      media.current = m;
      await m.init(true, true, mic, camera);
      m.accepted = true;
      m.remoteCamera = m.local;
      m.remoteAudio = new MediaStream();
      C(callObj);
      S(fakeBot);
      SS({ connection: "connected", rtt: 1, jitter: 1, loss: 0, bitrate: 8500 });
      render((x) => x + 1);
    } catch (e: any) {
      (media.current as MediaCall | null)?.close();
      media.current = null;
      fail(e);
    } finally {
      initPending.current = false;
    }
  }
  async function testMic() {
    if (testCleanup.current) {
      testCleanup.current();
      testCleanup.current = null;
      TL(null);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: mic ? { deviceId: { exact: mic } } : true,
    });
    const ctx = new AudioContext(),
      a = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(a);
    const data = new Uint8Array(a.fftSize);
    const t = setInterval(() => {
      a.getByteTimeDomainData(data);
      TL(Math.min(100, Math.max(...data.map((v) => Math.abs(v - 128))) * 4));
    }, 100);
    testCleanup.current = () => {
      clearInterval(t);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    };
    DE(await navigator.mediaDevices.enumerateDevices());
  }
  const friends = relations.filter((r) => r.state === "accepted"),
    requests = relations.filter(
      (r) => r.state === "pending" && r.toId === me?.id,
    ),
    blocked = relations.filter((r) => r.state === "blocked");
  const list =
    tab === "requests"
      ? requests
      : tab === "blocked"
        ? blocked
        : friends.filter((r) => tab !== "online" || online.includes(r.user.id));
  if (loading)
    return (
      <div className="loading">
        <span className="logo">N</span> Conectando seu espaço…
      </div>
    );
  if (!me) return <Auth done={() => void load()} />;
  const m = media.current;
  const sharing = !!m?.display || stats.remoteSharing;
  return (
    <div className="app">
      <aside className="rail">
        <a className="logo" href="/" aria-label="Nexo">
          N
        </a>
        <button
          className="rail-active"
          aria-label="Amigos"
          onClick={() => {
            S(null);
            T("friends");
          }}
        >
          <Users />
        </button>
        <button
          aria-label="Chamadas recentes"
          onClick={() => {
            T("recent");
            S(null);
          }}
        >
          <Clock />
        </button>
        <div className="rail-bottom">
          <button aria-label="Configurações" onClick={() => ST(true)}>
            <Settings />
          </button>
          <Avatar user={me} size={34} />
        </div>
      </aside>
      <aside className="sidebar">
        <div className="sidebar-head">
          <a className="brand" href="/">
            nexo<span className="brand-dot">®</span>
          </a>
          <span className="tiny-badge">SEU ESPAÇO</span>
        </div>
        <button
          className="search-shortcut"
          onClick={() => {
            S(null);
            T("add");
          }}
        >
          <Search size={17} /> Encontrar alguém <kbd>@</kbd>
        </button>
        <p className="section-label">CONVERSAS</p>
        <button
          className={
            "nav-item " +
            (["friends", "online", "requests", "add", "blocked"].includes(tab)
              ? "active"
              : "")
          }
          onClick={() => {
            T("friends");
            S(null);
          }}
        >
          <Users size={19} />
          Amigos<span>{friends.length}</span>
        </button>
        <button
          className={"nav-item " + (tab === "recent" ? "active" : "")}
          onClick={() => {
            T("recent");
            S(null);
          }}
        >
          <Clock size={19} />
          Chamadas recentes
        </button>
        <div className="section-row">
          <p className="section-label">MENSAGENS DIRETAS</p>
          <button
            aria-label="Adicionar amigo"
            onClick={() => {
              T("add");
              S(null);
            }}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="direct-list">
          {friends.length ? (
            friends.map((r) => (
              <button
                className={
                  "person-nav " + (selected?.id === r.user.id ? "active" : "")
                }
                key={r.id}
                onClick={() => S(r.user)}
              >
                <span className="avatar-wrap">
                  <Avatar user={r.user} size={36} />
                  <i className={online.includes(r.user.id) ? "online" : ""} />
                </span>
                <span>
                  <b>{r.user.name}</b>
                  <small>@{r.user.handle}</small>
                </span>
              </button>
            ))
          ) : (
            <p className="sidebar-hint">
              Boas conversas começam
              <br />
              com uma conexão.
            </p>
          )}
        </div>
        <div className="sidebar-tip">
          <span className="mini-icon">
            <Monitor size={18} />
          </span>
          <b>Mais perto, em cada pixel.</b>
          <p>
            Compartilhe a tela e viva
            <br />o mesmo momento.
          </p>
        </div>
        <button
          className="sidebar-action-btn"
          onClick={() => setMediaLab(true)}
          title="Abrir Laboratório de Testes de Tela & Áudio"
        >
          <Sparkles size={16} />
          <span>Laboratório de Mídia</span>
        </button>
        <div className="my-profile">
          <Avatar user={me} size={36} />
          <div>
            <b>{me.name}</b>
            <button
              title="Copiar meu @"
              onClick={() =>
                void safe(async () => {
                  await navigator.clipboard.writeText("@" + me.handle);
                  E("@ copiado");
                })
              }
            >
              @{me.handle}
            </button>
          </div>
          <button aria-label="Editar perfil" onClick={() => ST(true)}>
            <Settings size={17} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <Users size={20} />
            <b>
              {selected
                ? selected.name
                : tab === "recent"
                  ? "Chamadas recentes"
                  : "Amigos"}
            </b>
            <span className="header-divider" />
            <span className="muted header-caption">
              {selected
                ? "@" + selected.handle
                : "Seu próximo momento começa aqui."}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="secondary media-lab-btn"
              onClick={() => setMediaLab(true)}
              style={{ padding: "6px 12px", fontSize: "0.85rem", gap: "6px" }}
              title="Testar Espelhamento e Microfone"
            >
              <Sparkles size={15} />
              <span>Testar Tela & Áudio</span>
            </button>
            <PWAInstallButton />
            <span className="connection">
              <i className={"dot " + (!connected ? "offline" : "")} />
              {connected ? "Conectado" : "Reconectando…"}
            </span>
          </div>
        </header>
        {call ? (
          <div
            ref={stage}
            className={"call-stage " + (!controls ? "hide-controls" : "")}
            onPointerMove={() => {
              CT(true);
              clearTimeout(hide.current);
              hide.current = setTimeout(() => CT(false), 3500);
            }}
            onTouchStart={() => CT(true)}
          >
            <div className="call-top">
              <span className="pill">
                <span className="dot" />
                {call.state === "active"
                  ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`
                  : "Chamando…"}
              </span>
              <span className="pill quality-pill" title="Configuração de transmissão ativa">
                <Sparkles size={13} />
                {quality.split(" · ")[0]} · {mode === "detail" ? "Ultra Nitidez" : mode === "motion" ? "Fluidez 60fps" : "Auto"}
              </span>
              <span>
                {stats.connection === "connected"
                  ? "Conexão estabelecida"
                  : stats.connection === "failed"
                    ? "Recuperando conexão…"
                    : "Conectando…"}
              </span>
              <button
                aria-label="Tela inteira"
                onClick={() =>
                  void safe(async () => {
                    if (document.fullscreenElement)
                      await document.exitFullscreen();
                    else if (stage.current?.requestFullscreen)
                      await stage.current.requestFullscreen();
                    else E("Tela inteira não disponível neste navegador");
                  })
                }
              >
                <Maximize size={19} />
              </button>
            </div>
            <div className={"call-media " + (sharing ? "sharing" : "")}>
              {sharing ? (
                <>
                  <Media
                    stream={stats.remoteSharing ? m!.remoteScreen : m!.display!}
                    muted
                    fit={fit}
                  />
                  <span className="sharing-label">
                    <Monitor size={15} />
                    {stats.remoteSharing
                      ? call.user.name + " está compartilhando"
                      : "Você está compartilhando a tela"}
                  </span>
                  <button
                    className="fit-button"
                    onClick={() => F(fit === "contain" ? "cover" : "contain")}
                  >
                    {fit === "contain" ? "Preencher" : "Ajustar"}
                  </button>
                </>
              ) : m?.remoteCamera.getVideoTracks().length &&
                stats.connection === "connected" ? (
                <Media stream={m.remoteCamera} muted />
              ) : (
                <div
                  className={
                    "caller " + (stats.remoteSpeaking ? "speaking" : "")
                  }
                >
                  <Avatar user={call.user} size={128} />
                  <h2>{call.user.name}</h2>
                  <p>@{call.user.handle}</p>
                  <small>
                    {call.state === "ringing"
                      ? "Esperando atender…"
                      : "Uma boa conversa começa agora."}
                  </small>
                </div>
              )}
              <div
                className={"self-video " + (stats.speaking ? "speaking" : "")}
              >
                {m?.local.getVideoTracks().some((t) => t.enabled) ? (
                  <Media stream={m.local} muted />
                ) : (
                  <Avatar user={me} size={44} />
                )}
                <small>Você</small>
              </div>
            </div>
            {m && (
              <div className="audio-only">
                <Media stream={m.remoteAudio} volume={volume} sink={sink} />
              </div>
            )}
            <div className="call-controls">
              <button
                aria-label="Microfone"
                className={
                  m?.local.getAudioTracks()[0]?.enabled
                    ? ""
                    : "disabled-control"
                }
                onClick={() => {
                  const t = m?.local.getAudioTracks()[0];
                  if (t) t.enabled = !t.enabled;
                  render((x) => x + 1);
                }}
              >
                {m?.local.getAudioTracks()[0]?.enabled ? <Mic /> : <MicOff />}
              </button>
              <button
                aria-label="Câmera"
                onClick={() => void safe(() => m!.toggleCamera(camera))}
              >
                {m?.local.getVideoTracks().some((t) => t.enabled) ? (
                  <Video />
                ) : (
                  <VideoOff />
                )}
              </button>
              <button
                aria-label={
                  m?.display ? "Parar compartilhamento" : "Compartilhar tela"
                }
                className={m?.display ? "active-control" : ""}
                disabled={call.state !== "active"}
                onClick={() =>
                  void safe(() =>
                    m?.display ? m.stopShare() : m!.share(quality, mode),
                  )
                }
              >
                <Monitor />
              </button>
              {sharing && (
                <button
                  aria-label="Alternar nitidez e fluidez"
                  className={mode === "detail" ? "active-control" : ""}
                  title={
                    mode === "detail"
                      ? "Modo Ultra Nitidez Ativo (Texto/Código) - Clique para Fluidez"
                      : "Modo Fluidez Ativo (Vídeo/Jogos) - Clique para Ultra Nitidez"
                  }
                  onClick={() => {
                    const next = mode === "detail" ? "motion" : "detail";
                    MO(next);
                    if (m?.display) {
                      const trk = m.display.getVideoTracks()[0];
                      if (trk) trk.contentHint = next;
                    }
                    E(
                      `Espelhamento: ${next === "detail" ? "Ultra Nitidez (Texto & Código)" : "Fluidez Máxima (Vídeo/Jogos)"}`,
                    );
                  }}
                >
                  <Sparkles size={18} />
                </button>
              )}
              <button aria-label="Chat da chamada" onClick={() => CH(!chat)}>
                <MessageSquare />
              </button>
              <button
                aria-label="Configurações da chamada"
                onClick={() => ST(true)}
              >
                <Settings />
              </button>
              <button
                aria-label="Encerrar chamada"
                className="hangup"
                onClick={() => void safe(hangup)}
              >
                <PhoneOff />
              </button>
            </div>
            <div className="call-stats">
              <Signal size={13} /> {stats.rtt || 0} ms RTT · {stats.jitter || 0}{" "}
              ms jitter · {stats.loss || 0}% perda · {stats.bitrate || 0} kbps
            </div>
            {chat && <div className="call-chat">{chatPanel()}</div>}
          </div>
        ) : selected ? (
          <section className="conversation">
            <div className="conversation-heading">
              <Avatar user={selected} size={56} />
              <div>
                <h2>{selected.name}</h2>
                <p className="muted">@{selected.handle}</p>
              </div>
              <button
                className="secondary"
                onClick={() => void start(selected, false)}
              >
                <Phone size={18} />
                Voz
              </button>
              <button
                className="primary"
                onClick={() => void start(selected, true)}
              >
                <Video size={18} />
                Vídeo
              </button>
            </div>
            {chatPanel()}
          </section>
        ) : (
          <div className="content">
            <div className="page-title">
              <div>
                <span className="eyebrow">SEU CÍRCULO, SEM DISTÂNCIA</span>
                <h1>
                  {tab === "recent"
                    ? "Conversas que ficam."
                    : "Perto de quem importa."}
                </h1>
                <p className="muted">Uma chamada pode transformar o seu dia.</p>
              </div>
              <button className="primary" onClick={() => T("add")}>
                <Plus size={17} />
                Adicionar amigo
              </button>
            </div>
            <div className="hero-card">
              <div>
                <span className="pill">UM LINK. UM NOVO MOMENTO.</span>
                <h2>
                  A melhor companhia
                  <br />
                  cabe na sua tela.
                </h2>
                <p>Converse, crie e compartilhe. Sem complicar.</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
                  <button
                    onClick={() =>
                      void safe(async () => {
                        await navigator.clipboard.writeText(
                          location.origin + "/?invite=" + me.handle,
                        );
                        E("Link de convite copiado");
                      })
                    }
                  >
                    Convidar alguém <ArrowUpRight size={17} />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setMediaLab(true)}
                    style={{ gap: 7 }}
                  >
                    <Monitor size={16} /> Testar Espelhamento
                  </button>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="art-window">
                  <span />
                  <span />
                  <span />
                  <div>
                    <Monitor size={50} />
                    <i />
                  </div>
                </div>
                <div className="art-voice">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="art-circle">
                  <Headphones size={29} />
                </div>
              </div>
            </div>
            <nav className="tabs">
              {[
                ["friends", "Todos", friends.length],
                [
                  "online",
                  "Online",
                  friends.filter((r) => online.includes(r.user.id)).length,
                ],
                ["requests", "Solicitações", requests.length],
                ["blocked", "Bloqueados", blocked.length],
              ].map(([id, label, n]) => (
                <button
                  key={id}
                  className={tab === id ? "selected" : ""}
                  onClick={() => T(String(id))}
                >
                  {label}
                  <span>{n}</span>
                </button>
              ))}
            </nav>
            {tab === "add" ? (
              <section className="add-panel">
                <h2>Encontre sua gente.</h2>
                <p className="muted">
                  Busque pelo @ e envie um convite para conversar.
                </p>
                <div className="input-icon">
                  <Search size={18} />
                  <input
                    aria-label="Buscar por @"
                    placeholder="Buscar por @nomedeusuario"
                    value={query}
                    onChange={(e) => Q(e.target.value)}
                  />
                </div>
                {results.map((u) => (
                  <div className="friend-row" key={u.id}>
                    <Avatar user={u} />
                    <div className="person-info">
                      <b>{u.name}</b>
                      <small>@{u.handle}</small>
                    </div>
                    <button
                      className="secondary"
                      onClick={() =>
                        void safe(async () => {
                          await api("/relations", "POST", { toId: u.id });
                          await refresh();
                          E("Solicitação enviada");
                        })
                      }
                    >
                      <Plus size={16} />
                      Adicionar
                    </button>
                  </div>
                ))}
                {query.length > 1 && !results.length && (
                  <p className="muted">Nenhum perfil encontrado.</p>
                )}
              </section>
            ) : tab === "recent" ? (
              <section>
                {recent.length ? (
                  recent.map((c) => {
                    const u = friends.find((r) =>
                      [c.fromId, c.toId].includes(r.user.id),
                    )?.user;
                    return (
                      <div className="friend-row" key={c.id}>
                        <Phone size={20} />
                        <div className="person-info">
                          <b>{u?.name || "Contato"}</b>
                          <small>
                            {new Date(c.createdAt).toLocaleString("pt-BR")} ·{" "}
                            {
                              (
                                {
                                  ended: "Encerrada",
                                  declined: "Recusada",
                                  missed: "Não atendida",
                                  active: "Em chamada",
                                  ringing: "Chamando",
                                  interrupted: "Interrompida",
                                  disconnected: "Desconectada",
                                } as any
                              )[c.state]
                            }
                          </small>
                        </div>
                        {u && (
                          <button
                            aria-label={"Ligar para " + u.name}
                            onClick={() => void start(u, c.video)}
                          >
                            <Phone size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <Empty
                    title="Sua próxima conversa está por vir."
                    text="As chamadas feitas por aqui aparecem nesta lista."
                  />
                )}
              </section>
            ) : (
              <section>
                <div className="list-heading">
                  {tab === "requests"
                    ? "SOLICITAÇÕES RECEBIDAS"
                    : tab === "blocked"
                      ? "PERFIS BLOQUEADOS"
                      : "SEUS AMIGOS"}{" "}
                  — {list.length}
                  <span>
                    <Shield size={13} /> Um espaço só de vocês
                  </span>
                </div>
                {list.length ? (
                  list.map((r) => (
                    <div className="friend-row" key={r.id}>
                      <Avatar user={r.user} />
                      <button
                        className="person-info"
                        onClick={() => r.state === "accepted" && S(r.user)}
                      >
                        <b>{r.user.name}</b>
                        <small>
                          <i
                            className={
                              "dot " +
                              (!online.includes(r.user.id) ? "offline" : "")
                            }
                          />
                          {online.includes(r.user.id)
                            ? (
                                {
                                  busy: "Ocupado",
                                  away: "Ausente",
                                  online: "Online",
                                } as any
                              )[r.user.status]
                            : "Offline"}{" "}
                          · @{r.user.handle}
                        </small>
                      </button>
                      {r.state === "accepted" ? (
                        <>
                          <button title="Mensagem" onClick={() => S(r.user)}>
                            <MessageSquare size={18} />
                          </button>
                          <button
                            title="Chamada de voz"
                            onClick={() => void start(r.user, false)}
                          >
                            <Phone size={18} />
                          </button>
                          <button
                            title="Bloquear usuário"
                            onClick={() =>
                              void safe(async () => {
                                await api("/block", "POST", {
                                  toId: r.user.id,
                                });
                                await refresh();
                              })
                            }
                          >
                            <Shield size={17} />
                          </button>
                        </>
                      ) : r.state === "pending" ? (
                        <button
                          title="Aceitar solicitação"
                          className="success"
                          onClick={() =>
                            void safe(async () => {
                              await api("/relations/" + r.id, "PATCH", {});
                              await refresh();
                            })
                          }
                        >
                          <Check size={20} />
                        </button>
                      ) : null}
                      <button
                        title={
                          r.state === "blocked"
                            ? "Desbloquear"
                            : r.state === "pending"
                              ? "Recusar"
                              : "Remover amigo"
                        }
                        onClick={() =>
                          void safe(async () => {
                            await api("/relations/" + r.id, "DELETE");
                            await refresh();
                          })
                        }
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty
                    title={
                      tab === "requests"
                        ? "Tudo em dia por aqui."
                        : tab === "blocked"
                          ? "Nenhum perfil bloqueado."
                          : "Boas conexões começam com um olá."
                    }
                    text={
                      tab === "requests"
                        ? "Novos convites aparecerão aqui."
                        : "Encontre um amigo pelo @ ou compartilhe seu convite."
                    }
                  />
                )}
              </section>
            )}
            <footer className="content-footer">
              <span>
                <Shield size={14} /> Mídia protegida pelo WebRTC
              </span>
              <span>Feito para estar perto.</span>
            </footer>
          </div>
        )}
      </main>
      {incoming && (
        <div className="modal-backdrop">
          <section
            className="incoming modal"
            role="dialog"
            aria-modal="true"
            aria-label="Chamada recebida"
          >
            <span className="eyebrow">CHAMADA RECEBIDA</span>
            <Avatar user={incoming.user} size={90} />
            <h2>{incoming.user.name}</h2>
            <p>
              @{incoming.user.handle} · {incoming.video ? "Vídeo" : "Voz"}
            </p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => void safe(() => answer(false))}
              >
                <PhoneOff size={18} />
                Recusar
              </button>
              <button
                className="primary"
                onClick={() => void safe(() => answer(true))}
              >
                <Phone size={18} />
                Atender
              </button>
            </div>
          </section>
        </div>
      )}
      {settings && (
        <div className="modal-backdrop">
          <section
            className="modal settings"
            role="dialog"
            aria-modal="true"
            aria-label="Configurações"
          >
            <div className="modal-heading">
              <h2>Seu jeito de se conectar.</h2>
              <button
                aria-label="Fechar configurações"
                onClick={() => {
                  ST(false);
                  testCleanup.current?.();
                  testCleanup.current = null;
                  TL(null);
                }}
              >
                <X />
              </button>
            </div>
            <label>
              Nome de exibição
              <input
                defaultValue={me.name}
                maxLength={50}
                onBlur={(e) =>
                  void safe(async () =>
                    M(await api("/me", "PATCH", { name: e.target.value })),
                  )
                }
              />
            </label>
            <label>
              Foto do perfil (PNG, JPEG ou WebP, até 280 KB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) =>
                  void safe(async () => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 280000)
                      throw Error("Use uma imagem de até 280 KB");
                    const photo = await new Promise<string>(
                      (resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(String(r.result));
                        r.onerror = reject;
                        r.readAsDataURL(f);
                      },
                    );
                    M(await api("/me", "PATCH", { photo }));
                  })
                }
              />
            </label>
            <label>
              Cor do avatar
              <input
                type="color"
                value={me.avatar}
                onChange={(e) =>
                  void safe(async () =>
                    M(await api("/me", "PATCH", { avatar: e.target.value })),
                  )
                }
              />
            </label>
            <label>
              Status
              <select
                value={me.status}
                onChange={(e) =>
                  void safe(async () =>
                    M(await api("/me", "PATCH", { status: e.target.value })),
                  )
                }
              >
                <option value="online">Online</option>
                <option value="busy">Ocupado</option>
                <option value="away">Ausente</option>
              </select>
            </label>
            <div className="settings-grid">
              <label>
                Microfone
                <select
                  value={mic}
                  onChange={(e) => {
                    MI(e.target.value);
                    if (m) void safe(() => m.changeMic(e.target.value));
                  }}
                >
                  <option value="">Padrão do sistema</option>
                  {devices
                    .filter((d) => d.kind === "audioinput")
                    .map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || "Microfone " + (i + 1)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Câmera (próxima ativação)
                <select value={camera} onChange={(e) => CA(e.target.value)}>
                  <option value="">Padrão do sistema</option>
                  {devices
                    .filter((d) => d.kind === "videoinput")
                    .map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || "Câmera " + (i + 1)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <button className="secondary" onClick={() => void safe(testMic)}>
              <Mic size={16} />
              {testLevel === null ? "Testar microfone" : "Parar teste"}
            </button>
            {testLevel !== null && (
              <meter
                min="0"
                max="100"
                value={testLevel}
                aria-label="Nível do microfone"
              />
            )}
            <label>
              Saída de áudio
              <select
                value={sink}
                disabled={!("setSinkId" in HTMLMediaElement.prototype)}
                onChange={(e) => SI(e.target.value)}
              >
                <option value="">Padrão do sistema</option>
                {devices
                  .filter((d) => d.kind === "audiooutput")
                  .map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || "Saída " + (i + 1)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Volume de reprodução
              <input
                type="range"
                min="0"
                max="1"
                step=".05"
                value={volume}
                onChange={(e) => V(Number(e.target.value))}
              />
            </label>
            <div className="settings-grid">
              <label>
                Meta da próxima transmissão
                <select
                  value={quality}
                  onChange={(e) => QU(e.target.value as Quality)}
                >
                  {Object.keys(qualities).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Prioridade
                <select value={mode} onChange={(e) => MO(e.target.value)}>
                  <option value="auto">Automático</option>
                  <option value="detail">Nitidez</option>
                  <option value="motion">Movimento</option>
                </select>
              </label>
            </div>
            <p className="fine">
              A qualidade se adapta à conexão. Captura de tela e áudio do
              sistema dependem do navegador. O Nexo não grava suas chamadas.
            </p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() =>
                  void safe(async () => {
                    if ("Notification" in window)
                      await Notification.requestPermission();
                  })
                }
              >
                Ativar notificações
              </button>
              <button
                onClick={() =>
                  void safe(async () => {
                    await api("/logout", "POST", {});
                    endLocal();
                    M(null);
                  })
                }
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          </section>
        </div>
      )}
      {mediaLab && (
        <MediaLabModal
          onClose={() => setMediaLab(false)}
          onStartEchoCall={startEchoCall}
        />
      )}
      {error && (
        <div role="alert" className="toast">
          {error}
          <button aria-label="Fechar aviso" onClick={() => E("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
  function chatPanel() {
    return (
      <div className="chat-panel">
        <div className="messages">
          {messages.length ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={"message " + (msg.fromId === me!.id ? "mine" : "")}
              >
                <p>{msg.text}</p>
                <time>
                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))
          ) : (
            <div className="chat-empty">
              <MessageSquare size={26} />
              <p>O começo de uma boa conversa.</p>
            </div>
          )}
        </div>
        <small className="typing">{typing ? "Digitando…" : " "}</small>
        <form
          className="message-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim() && selected)
              void safe(async () => {
                await emit("message", { toId: selected.id, text: draft });
                D("");
              });
          }}
        >
          <input
            aria-label="Mensagem"
            placeholder="Escreva uma mensagem…"
            maxLength={2000}
            value={draft}
            onChange={(e) => {
              D(e.target.value);
              if (selected)
                socket.current?.emit("typing", { toId: selected.id });
            }}
          />
          <button aria-label="Enviar mensagem" disabled={!draft.trim()}>
            <Send size={19} />
          </button>
        </form>
      </div>
    );
  }
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <div>
        <Users size={27} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
