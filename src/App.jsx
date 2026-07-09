import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  ClipboardCheck,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  Gift,
  Home,
  Hourglass,
  KeyRound,
  Landmark,
  LogOut,
  Mail,
  Menu,
  MapPin,
  MapPinned,
  Phone,
  QrCode,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Smartphone,
  Star,
  UserRound,
  UserPlus,
  Wallet,
} from "lucide-react";
import { api } from "./api/client.js";
import authSlideClient from "./assets/auth-slide-client.jpg";
import authSlidePro from "./assets/auth-slide-pro.jpg";
import { paymentMethods, professional, serviceOrder } from "./data/mockData.js";
import { captureDocumentImage, captureProfileImage, captureServiceImage } from "./utils/camera.js";
import { buildLocationProofLabel, captureCurrentLocation, formatLocationLabel } from "./utils/location.js";
import { clearSession, loadSession, saveSession } from "./utils/sessionStore.js";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const LEGAL_VERSION = import.meta.env.VITE_LEGAL_VERSION || "2026.07";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const ENABLE_OFFLINE_FALLBACK = import.meta.env.VITE_ENABLE_OFFLINE_FALLBACK === "true";
const DEMO_LOGIN_EMAIL = import.meta.env.VITE_DEMO_LOGIN_EMAIL || "";
const DEFAULT_QUOTE_DRAFT = {
  titulo: "Preciso de ajuda com instalação elétrica",
  categoria: "Reformas e Reparos",
  subcategoria: "Eletricista",
  descricao: "Preciso avaliar a instalação de um chuveiro e possível ajuste no disjuntor.",
  bairro: "Vila Mariana",
  cidade: "São Paulo",
  urgencia: "Hoje",
};
const DEFAULT_NEGOTIATION_FLOW = {
  id: "",
  tokenAcesso: "",
  offlineMode: false,
  loading: false,
  draftMessage: "",
  suggestedDate: "2026-07-15",
  suggestedTime: "14:00",
  scopeAligned: false,
  paymentAligned: false,
  messages: [],
};

const AUTH_SLIDES = [
  {
    id: "cliente",
    image: authSlideClient,
    eyebrow: "Contratação simples",
    title: "Encontre profissionais e contrate serviços com confiança",
    description: "Compare opções, alinhe detalhes e acompanhe tudo com mais praticidade e segurança.",
  },
  {
    id: "prestador",
    image: authSlidePro,
    eyebrow: "Tudo pelo app",
    title: "O jeito mais simples de encontrar e contratar profissionais",
    description: "Um só app para contratar, negociar e pagar com clareza em cada etapa do serviço.",
  },
];

const onlyDigits = (value) => value.replace(/\D/g, "");

const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

const formatPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3").trim();
};

const formatDate = (value) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.replace(/^(\d{2})(\d+)/, "$1/$2");
  return digits.replace(/^(\d{2})(\d{2})(\d+)/, "$1/$2/$3");
};

const formatCep = (value) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return digits.replace(/^(\d{5})(\d+)/, "$1-$2");
};

function estimateBase64Bytes(base64) {
  const padding = (base64.match(/=*$/) || [""])[0].length;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

async function sha256Text(value) {
  if (!globalThis.crypto?.subtle) {
    return `local-${value.length}-${Date.now()}`;
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatBytes(value) {
  if (!value) {
    return "0 KB";
  }
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const formatNameInitials = (value, fallback = "SP") =>
  (value || fallback)
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

function createProfileSettingsSeed(auth) {
  const profileName = auth?.nomeExibicao || "";
  return {
    profileOwnerId: auth?.usuarioId || "",
    nomeExibicao: profileName,
    categoriaPrincipal: auth?.tipoUsuario === "CLIENTE" ? "Cliente" : "Profissional autônomo",
    descricao: "",
    notificacoesPush: true,
    notificacoesEmail: true,
    modoSilencioso: false,
    receberNovidades: false,
    avatarBase64: "",
    avatarPreviewUrl: "",
    cep: "",
    uf: "",
    municipio: "",
    rua: "",
    bairro: "",
    numero: "",
    complemento: "",
    banco: "",
    agencia: "",
    conta: "",
    chavePix: "",
    areaAtendimento: "",
    horarioPreferencial: "",
    emailContato: auth?.email || "",
  };
}

function createNegotiationSeed(selectedService) {
  return {
    ...DEFAULT_NEGOTIATION_FLOW,
    paymentAligned: true,
    messages: [
      {
        id: `${selectedService.professionalId}-intro`,
        author: "prestador",
        tone: "neutral",
        text: `Posso atender ${selectedService.title.toLowerCase()} com confirmação pelo app. Antes da liberação do endereço, vamos alinhar escopo, janela de atendimento e forma de pagamento.`,
      },
      {
        id: `${selectedService.professionalId}-cliente`,
        author: "cliente",
        tone: "soft",
        text: `Perfeito. A região aproximada atende. Quero confirmar o serviço em ${selectedService.date} por volta de ${selectedService.time}.`,
      },
    ],
  };
}

function formatVerificationStatus(status) {
  switch (status) {
    case "PENDENTE_OTP":
      return "Aguardando OTP";
    case "OTP_VERIFICADO":
      return "OTP verificado";
    case "KYC_EM_ANALISE":
      return "KYC/KYB em análise";
    case "KYC_APROVADO":
      return "Cadastro aprovado";
    case "KYC_REJEITADO":
      return "Cadastro rejeitado";
    default:
      return "Pendente";
  }
}

function formatSolicitacaoStatus(status) {
  switch (status) {
    case "ABERTA":
      return "Aberta";
    case "EM_REVISAO":
      return "Em revisão";
    case "PAUSADA":
      return "Pausada";
    case "CANCELADA":
      return "Cancelada";
    case "ACEITA":
      return "Aceita";
    case "PENDENTE_ENVIO":
      return "Pendente de envio";
    case "EM_ANALISE":
      return "Em análise";
    case "APROVADO":
      return "Aprovado";
    case "REJEITADO":
      return "Rejeitado";
    default:
      return "Rascunho";
  }
}

function isAuthSessionValid(auth) {
  if (!auth?.accessToken || !auth?.expiraEm) {
    return false;
  }

  const expiration = new Date(auth.expiraEm);
  return !Number.isNaN(expiration.getTime()) && expiration.getTime() > Date.now();
}

async function hydrateAuthSession(loginResponse, fallback = {}) {
  try {
    const profile = await api.buscarUsuario(loginResponse.usuarioId, loginResponse.accessToken);
    return {
      ...loginResponse,
      nomeExibicao: profile.nomeExibicao,
      email: profile.email,
      tipoUsuario: profile.tipoUsuario,
      statusUsuario: profile.statusUsuario,
      statusVerificacaoCadastral: profile.statusVerificacaoCadastral,
      cadastroVerificado: profile.cadastroVerificado,
      contaDemo: profile.contaDemo,
    };
  } catch {
    return {
      ...loginResponse,
      ...fallback,
    };
  }
}

function normalizeNegotiationResponse(response) {
  return {
    id: response.id || "",
    tokenAcesso: response.tokenAcesso || "",
    offlineMode: false,
    loading: false,
    draftMessage: "",
    suggestedDate: response.dataSugerida || "2026-07-15",
    suggestedTime: response.horaSugerida || "14:00",
    scopeAligned: Boolean(response.escopoAlinhado),
    paymentAligned: Boolean(response.pagamentoAlinhado),
    messages: (response.mensagens || []).map((message) => ({
      id: message.id,
      author: message.autor === "PRESTADOR" ? "prestador" : message.autor === "SISTEMA" ? "sistema" : "cliente",
      tone: message.autor === "SISTEMA" ? "soft" : "neutral",
      text: message.texto,
    })),
  };
}

function IconBox({ children }) {
  return <div className="icon-box">{children}</div>;
}

function AppHeader({ title, subtitle, right }) {
  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {right ? <div className="header-action">{right}</div> : null}
    </header>
  );
}

function LegalConsentModal({ accepted, setAccepted, onAccept }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="legal-consent-title">
      <section className="legal-modal">
        <span className="option-label">Obrigatório</span>
        <h2 id="legal-consent-title">Aceite de Termos e Privacidade</h2>
        <p>
          Antes de usar recursos com impacto financeiro, validação de identidade, geolocalização, câmera ou
          comprovação de serviço, precisamos registrar seu aceite desta versão jurídica.
        </p>

        <div className="legal-summary">
          <div>
            <strong>Termos de Uso</strong>
            <span>Define responsabilidades, pagamento, contestações e conduta na plataforma.</span>
          </div>
          <div>
            <strong>Política de Privacidade</strong>
            <span>Explica o uso de documento, localização, imagens e trilhas de auditoria.</span>
          </div>
          <div>
            <strong>Versão jurídica</strong>
            <span>{LEGAL_VERSION}</span>
          </div>
        </div>

        <label className="terms-panel legal-accept-panel">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>
            Li e aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong> desta versão.
            Estou ciente de que o aceite será registrado para liberar o uso do app.
          </span>
        </label>

        <button className="primary-action legal-accept-button" disabled={!accepted} onClick={onAccept}>
          Aceitar e continuar
        </button>
      </section>
    </div>
  );
}

function VersionNoticeModal({ status, onClose }) {
  if (!status?.message) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="version-notice-title">
      <section className="legal-modal">
        <span className="option-label">Aplicativo</span>
        <h2 id="version-notice-title">Verificação de versão</h2>
        <p>{status.message}</p>
        <div className="legal-summary">
          <div>
            <strong>Versão instalada</strong>
            <span>{APP_VERSION}</span>
          </div>
          <div>
            <strong>Status</strong>
            <span>{status.type === "error" ? "Validação indisponível" : status.type === "warning" ? "Atenção" : "Compatível"}</span>
          </div>
        </div>
        <button className="primary-action legal-accept-button" onClick={onClose}>
          Entendi
        </button>
      </section>
    </div>
  );
}

function SessionBanner({ auth, onReset }) {
  if (!auth?.accessToken) {
    return null;
  }

  return (
    <section className="session-banner">
      <div>
        <strong>Sessão ativa</strong>
        <span>{auth.nomeExibicao || auth.email || "Prestador autenticado"}{auth?.contaDemo ? " · modo demo" : ""}</span>
      </div>
      <button onClick={onReset}>Sair</button>
    </section>
  );
}

function ServiceCard({ selectedService }) {
  return (
    <section className="service-card">
      <div className="professional-row">
        <div className="avatar">{selectedService.professionalInitials}</div>
        <div className="professional-copy">
          <strong>{selectedService.professionalName}</strong>
          <span>{selectedService.professionalRole}</span>
        </div>
        <span className="verified-pill">
          <BadgeCheck size={13} />
          Verificado
        </span>
      </div>

      <div className="service-divider" />

      <h2>{selectedService.title}</h2>
      <div className="service-meta">
        <span>
          <CalendarDays size={16} />
          {selectedService.date} - {selectedService.time}
        </span>
        <span>
          <MapPin size={16} />
          {selectedService.location}
        </span>
      </div>
      {!selectedService.addressReleased ? (
        <div className="address-privacy-note">
          Endereço completo liberado apenas depois da confirmação do atendimento pelas duas partes.
        </div>
      ) : null}

      <div className="price-row">
        <span>Valor do serviço</span>
        <strong>{currency.format(selectedService.value)}</strong>
      </div>
    </section>
  );
}

function PaymentIcon({ id }) {
  if (id === "PIX_APP") return <QrCode size={22} />;
  if (id === "DINHEIRO_LOCAL") return <Landmark size={22} />;
  return <CreditCard size={22} />;
}

function PaymentMethod({ method, selected, onSelect, compact = false }) {
  return (
    <button className={`payment-card ${selected ? "selected" : ""} ${compact ? "compact" : ""}`} onClick={onSelect}>
      <IconBox>
        <PaymentIcon id={method.id} />
      </IconBox>
      <span className="payment-copy">
        <strong>{method.title}</strong>
        <small>{method.description}</small>
      </span>
      {compact && method.badge ? (
        <em className={method.id === "DINHEIRO_LOCAL" ? "warning-badge" : "success-badge"}>{method.badge}</em>
      ) : (
        <span className="radio-dot" aria-hidden="true" />
      )}
    </button>
  );
}

function BottomNav({ active, onChange }) {
  const tabs = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "quotes", label: "Ofertas", icon: BriefcaseBusiness },
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "wallet", label: "Carteira", icon: Wallet },
    { id: "profile", label: "Menu", icon: Menu },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={active === tab.id ? "active" : ""}
            onClick={() => onChange(tab.id)}
            aria-label={tab.label}
            title={tab.label}
          >
            <Icon size={24} strokeWidth={active === tab.id ? 2.6 : 2} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function StatusMessage({ state }) {
  if (!state?.message) return null;
  return <section className={`inline-result ${state.type || ""}`}>{state.message}</section>;
}

function CategoryCard({ category, onSelectSubcategory }) {
  return (
    <section className="category-card">
      <div className="category-card-head">
        <strong>{category.nome}</strong>
        <span>{category.subcategorias.length} serviços</span>
      </div>
      <div className="subcategory-list">
        {category.subcategorias.map((item) => (
          <button key={item} onClick={() => onSelectSubcategory(item)}>
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

function ProfessionalCard({ item, onHire }) {
  const initials = item.nomeExibicao
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  return (
    <section className="professional-card">
      <div className="professional-card-head">
        <div className="avatar">{initials}</div>
        <div className="professional-card-copy">
          <strong>{item.nomeExibicao}</strong>
          <span>{item.subcategoria}</span>
          <small>
            {item.bairro} - {item.cidade}
          </small>
        </div>
        {item.verificado ? <span className="verified-pill">Verificado</span> : null}
      </div>
      <p>{item.descricaoCurta}</p>
      <div className="professional-card-meta">
        <span>{item.tempoResposta}</span>
        <span>Endereço completo só aparece após confirmação mútua</span>
        <span>Nota {Number(item.notaMedia).toFixed(1)}</span>
        <strong>A partir de {currency.format(Number(item.precoInicial))}</strong>
      </div>
      <button className="secondary-action" onClick={() => onHire(item)}>
        Selecionar serviço
      </button>
    </section>
  );
}

function ProposalCard({ proposal, onAccept, disabled }) {
  return (
    <section className="professional-card">
      <div className="professional-card-head">
        <div className="avatar">
          {proposal.nomeProfissional
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0] || "")
            .join("")
            .toUpperCase()}
        </div>
        <div className="professional-card-copy">
          <strong>{proposal.nomeProfissional}</strong>
          <span>{proposal.subcategoria}</span>
          <small>
            {proposal.bairro} - {proposal.cidade}
          </small>
        </div>
        {proposal.verificado ? <span className="verified-pill">Verificado</span> : null}
      </div>
      <p>{proposal.mensagem}</p>
      <div className="professional-card-meta">
        <span>{proposal.prazo}</span>
        <span>Endereço completo segue bloqueado até a confirmação mútua</span>
        <span>Nota {Number(proposal.notaMedia).toFixed(1)}</span>
        <strong>{currency.format(Number(proposal.valor))}</strong>
      </div>
      <button className="secondary-action" disabled={disabled} onClick={() => onAccept(proposal)}>
        Aceitar proposta
      </button>
    </section>
  );
}

function QuoteRequestScreen({ categorias, quoteFlow, setQuoteFlow, onAcceptProposal }) {
  const [status, setStatus] = useState(null);
  const [proposalSort, setProposalSort] = useState("best");
  const categoryNames = useMemo(() => categorias.map((item) => item.nome), [categorias]);
  const selectedCategoryData = useMemo(
    () => categorias.find((item) => item.nome === quoteFlow.draft.categoria) || categorias[0] || null,
    [categorias, quoteFlow.draft.categoria],
  );
  const availableSubcategories = selectedCategoryData?.subcategorias || [];
  const descriptionLength = quoteFlow.draft.descricao.trim().length;
  const regionLabel = [quoteFlow.draft.bairro.trim(), quoteFlow.draft.cidade.trim()].filter(Boolean).join(" - ") || "Região aproximada pendente";
  const solicitationStatus = quoteFlow.solicitation?.status || "";
  const canManageSolicitation = solicitationStatus && solicitationStatus !== "ACEITA" && solicitationStatus !== "CANCELADA";
  const dynamicHints = [
    "Explique o que precisa ser feito e o que já foi testado no local.",
    "Mantenha apenas bairro e cidade. O endereço completo continua protegido.",
    "Quanto melhor o escopo, mais assertivas ficam as propostas recebidas.",
  ];

  const orderedProposals = useMemo(() => {
    const list = [...(quoteFlow.proposals || [])];
    if (proposalSort === "price") {
      return list.sort((a, b) => Number(a.valor) - Number(b.valor));
    }
    if (proposalSort === "speed") {
      return list.sort((a, b) => {
        const left = `${a.prazo || ""}`.toLowerCase();
        const right = `${b.prazo || ""}`.toLowerCase();
        return left.localeCompare(right);
      });
    }
    return list.sort((a, b) => Number(b.notaMedia || 0) - Number(a.notaMedia || 0));
  }, [proposalSort, quoteFlow.proposals]);

  useEffect(() => {
    if (!quoteFlow.draft.categoria && categoryNames[0]) {
      setQuoteFlow((current) => ({
        ...current,
        draft: {
          ...current.draft,
          categoria: categoryNames[0],
        },
      }));
    }
  }, [categoryNames, quoteFlow.draft.categoria, setQuoteFlow]);

  useEffect(() => {
    if (!quoteFlow.draft.subcategoria && availableSubcategories[0]) {
      setQuoteFlow((current) => ({
        ...current,
        draft: {
          ...current.draft,
          subcategoria: availableSubcategories[0],
        },
      }));
    }
  }, [availableSubcategories, quoteFlow.draft.subcategoria, setQuoteFlow]);

  const updateDraft = (field, value) => {
    setQuoteFlow((current) => ({
      ...current,
      draft: {
        ...current.draft,
        [field]: value,
      },
    }));
  };

  const publicarSolicitacao = async () => {
    setQuoteFlow((current) => ({ ...current, loading: true }));
    setStatus(null);
    try {
      const solicitacao = await api.criarSolicitacaoOrcamento(quoteFlow.draft);
      const propostas = await api.listarPropostasOrcamento(solicitacao.id, solicitacao.tokenAcesso);
      setQuoteFlow((current) => ({
        ...current,
        solicitation: solicitacao,
        proposals: propostas,
        loading: false,
      }));
      setStatus({ type: "success", message: "Pedido publicado. As propostas iniciais já estão disponíveis para análise." });
    } catch (error) {
      setQuoteFlow((current) => ({ ...current, loading: false }));
      setStatus({ type: "error", message: error.message });
    }
  };

  const atualizarSolicitacao = async () => {
    if (!quoteFlow.solicitation?.id || !quoteFlow.solicitation?.tokenAcesso) {
      return;
    }

    setQuoteFlow((current) => ({ ...current, loading: true }));
    setStatus(null);
    try {
      const solicitacao = await api.atualizarSolicitacaoOrcamento(
        quoteFlow.solicitation.id,
        quoteFlow.solicitation.tokenAcesso,
        quoteFlow.draft,
      );
      const propostas = await api.listarPropostasOrcamento(
        quoteFlow.solicitation.id,
        quoteFlow.solicitation.tokenAcesso,
      );
      setQuoteFlow((current) => ({
        ...current,
        solicitation: {
          ...current.solicitation,
          ...solicitacao,
          tokenAcesso: current.solicitation.tokenAcesso,
        },
        proposals,
        loading: false,
      }));
      setStatus({ type: "success", message: "Pedido atualizado. Propostas antigas foram revisadas e a lista foi renovada." });
    } catch (error) {
      setQuoteFlow((current) => ({ ...current, loading: false }));
      setStatus({ type: "error", message: error.message });
    }
  };

  const executarAcaoSolicitacao = async (action) => {
    if (!quoteFlow.solicitation?.id || !quoteFlow.solicitation?.tokenAcesso) {
      return;
    }

    const actionMap = {
      pausar: api.pausarSolicitacaoOrcamento,
      reabrir: api.reabrirSolicitacaoOrcamento,
      cancelar: api.cancelarSolicitacaoOrcamento,
    };
    const successMap = {
      pausar: "Pedido pausado. Nenhuma nova proposta deve entrar enquanto ele estiver parado.",
      reabrir: "Pedido reaberto. O fluxo voltou a receber propostas.",
      cancelar: "Pedido cancelado antes do aceite. O fluxo foi encerrado com segurança.",
    };

    setQuoteFlow((current) => ({ ...current, loading: true }));
    setStatus(null);
    try {
      const solicitacao = await actionMap[action](quoteFlow.solicitation.id, quoteFlow.solicitation.tokenAcesso);
      const propostas = action === "cancelar"
        ? []
        : await api.listarPropostasOrcamento(quoteFlow.solicitation.id, quoteFlow.solicitation.tokenAcesso);
      setQuoteFlow((current) => ({
        ...current,
        solicitation: {
          ...current.solicitation,
          ...solicitacao,
          tokenAcesso: current.solicitation.tokenAcesso,
        },
        proposals,
        loading: false,
      }));
      setStatus({ type: "success", message: successMap[action] });
    } catch (error) {
      setQuoteFlow((current) => ({ ...current, loading: false }));
      setStatus({ type: "error", message: error.message });
    }
  };

  const aceitarProposta = async (proposal) => {
    setQuoteFlow((current) => ({ ...current, loading: true }));
    setStatus(null);
    try {
      const accepted = await api.aceitarPropostaOrcamento(proposal.id, quoteFlow.solicitation?.tokenAcesso);
      setQuoteFlow((current) => ({ ...current, loading: false }));
      onAcceptProposal(accepted, proposal);
    } catch (error) {
      setQuoteFlow((current) => ({ ...current, loading: false }));
      setStatus({ type: "error", message: error.message });
    }
  };

  const canPublish =
    categorias.length > 0 &&
    quoteFlow.draft.titulo.trim() &&
    quoteFlow.draft.categoria.trim() &&
    quoteFlow.draft.subcategoria.trim() &&
    quoteFlow.draft.descricao.trim() &&
    quoteFlow.draft.bairro.trim() &&
    quoteFlow.draft.cidade.trim();

  const applyRequestTemplate = (template) => {
    setQuoteFlow((current) => ({
      ...current,
      draft: {
        ...current.draft,
        titulo: template.titulo,
        descricao: template.descricao,
        urgencia: template.urgencia,
      },
    }));
    setStatus({ type: "success", message: "Modelo aplicado. Agora ajuste os detalhes finais antes de publicar." });
  };

  return (
    <main className="screen">
      <AppHeader title="Aberto a Orçamentos" subtitle="Publique a necessidade e compare propostas com segurança" />

      <section className="home-summary-card offer-summary-card">
        <div className="home-summary-head">
          <IconBox>
            <ClipboardCheck size={19} />
          </IconBox>
          <div className="home-intro-copy">
            <strong>Resumo do pedido</strong>
            <span>{quoteFlow.draft.subcategoria || "Escolha a subcategoria"} · {quoteFlow.draft.urgencia}</span>
          </div>
        </div>
        <div className="offer-kpis">
          <div>
            <strong>{descriptionLength}</strong>
            <span>caracteres no escopo</span>
          </div>
          <div>
            <strong>{regionLabel}</strong>
            <span>região informada</span>
          </div>
        </div>
        {quoteFlow.solicitation ? (
          <div className="offer-chip-row">
            <span className="payment-chip">Status: {formatSolicitacaoStatus(quoteFlow.solicitation.status)}</span>
            <span className="payment-chip">Criado em {formatAcceptedDate(quoteFlow.solicitation.criadaEm)}</span>
          </div>
        ) : null}
        <div className="offer-chip-row">
          {dynamicHints.map((hint) => (
            <span key={hint} className="payment-chip">{hint}</span>
          ))}
        </div>
      </section>

      <section className="home-intro-card offer-template-card">
        <div className="home-intro-copy">
          <strong>Comece mais rápido</strong>
          <span>Use um modelo base e só ajuste o que for específico do serviço.</span>
        </div>
        <div className="offer-template-grid">
          {[
            {
              id: "eletrica",
              titulo: "Preciso de avaliação e possível reparo elétrico",
              descricao: "Quero orçamento para avaliar o ponto de energia, identificar causa do problema e informar o valor final antes de executar.",
              urgencia: "Hoje",
            },
            {
              id: "hidraulica",
              titulo: "Preciso de orçamento para reparo hidráulico",
              descricao: "Busco profissional para vistoria inicial, identificação do vazamento e proposta com valor fechado após avaliação.",
              urgencia: "Nesta semana",
            },
          ].map((template) => (
            <button key={template.id} className="offer-template-button" onClick={() => applyRequestTemplate(template)}>
              <strong>{template.titulo}</strong>
              <span>{template.urgencia}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="kyc-card">
        <div className="completion-heading">
          <IconBox>
            <FileText size={21} />
          </IconBox>
          <div>
            <strong>Pedido do contratante</strong>
            <small>Use apenas região aproximada. O endereço completo segue protegido até a confirmação mútua.</small>
          </div>
        </div>

        {categorias.length === 0 ? (
          <div className="empty-state compact-state">
            <Clock3 size={20} />
            <strong>Categorias ainda nao carregadas</strong>
            <span>Aguarde a API responder para publicar o pedido com classificacao segura.</span>
          </div>
        ) : (
          <div className="form-stack">
          <div className="category-strip offer-category-strip">
            {categoryNames.map((item) => (
              <button key={item} className={quoteFlow.draft.categoria === item ? "active" : ""} onClick={() => {
                const category = categorias.find((entry) => entry.nome === item);
                updateDraft("categoria", item);
                updateDraft("subcategoria", category?.subcategorias?.[0] || "");
              }}>
                {item}
              </button>
            ))}
          </div>
          <label>
            Título do serviço
            <input value={quoteFlow.draft.titulo} onChange={(event) => updateDraft("titulo", event.target.value.slice(0, 80))} />
          </label>
          <label>
            Categoria
            <select
              className="select-input"
              value={quoteFlow.draft.categoria}
              onChange={(event) => {
                const categoria = event.target.value;
                const category = categorias.find((item) => item.nome === categoria);
                updateDraft("categoria", categoria);
                updateDraft("subcategoria", category?.subcategorias?.[0] || "");
              }}
            >
              {categoryNames.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subcategoria
            <select className="select-input" value={quoteFlow.draft.subcategoria} onChange={(event) => updateDraft("subcategoria", event.target.value)}>
              {availableSubcategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descrição
            <textarea
              className="multiline-input"
              value={quoteFlow.draft.descricao}
              onChange={(event) => updateDraft("descricao", event.target.value.slice(0, 400))}
            />
          </label>
          <div className="double-grid">
            <label>
              Bairro
              <input value={quoteFlow.draft.bairro} onChange={(event) => updateDraft("bairro", event.target.value.slice(0, 60))} />
            </label>
            <label>
              Cidade
              <input value={quoteFlow.draft.cidade} onChange={(event) => updateDraft("cidade", event.target.value.slice(0, 60))} />
            </label>
          </div>
          <label>
            Urgencia
            <select className="select-input" value={quoteFlow.draft.urgencia} onChange={(event) => updateDraft("urgencia", event.target.value)}>
              {["Hoje", "Ate amanha", "Nesta semana"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          </div>
        )}
      </section>

      <section className="agreement-note">
        <ShieldAlert size={18} />
        <p>Para manter o app fluido e o banco leve, este fluxo salva apenas texto operacional. Midias detalhadas podem entrar numa etapa controlada depois.</p>
      </section>

      <StatusMessage state={status} />
      {quoteFlow.solicitation ? (
        <section className="home-intro-card offer-management-card">
          <div className="home-intro-copy">
            <strong>Ações do pedido</strong>
            <span>Enquanto ninguém aceitar, o contratante pode editar, pausar, reabrir ou cancelar.</span>
          </div>
          <div className="home-intro-actions">
            <button className="primary-action compact-action" disabled={!canPublish || !canManageSolicitation || quoteFlow.loading} onClick={atualizarSolicitacao}>
              {quoteFlow.loading ? "Salvando..." : "Salvar alterações"}
            </button>
            <button className="secondary-action compact-action" disabled={solicitationStatus === "PAUSADA" || !canManageSolicitation || quoteFlow.loading} onClick={() => executarAcaoSolicitacao("pausar")}>
              Pausar
            </button>
            <button className="secondary-action compact-action" disabled={solicitationStatus !== "PAUSADA" || quoteFlow.loading} onClick={() => executarAcaoSolicitacao("reabrir")}>
              Reabrir
            </button>
            <button className="secondary-action compact-action" disabled={!canManageSolicitation || quoteFlow.loading} onClick={() => executarAcaoSolicitacao("cancelar")}>
              Cancelar
            </button>
          </div>
        </section>
      ) : (
        <button className="primary-action" disabled={!canPublish || quoteFlow.loading} onClick={publicarSolicitacao}>
          {quoteFlow.loading ? "Publicando..." : "Publicar pedido"}
        </button>
      )}

      {quoteFlow.solicitation && quoteFlow.solicitation.status !== "CANCELADA" ? (
        <section className="section-block">
          <div className="section-title-row">
            <h3>Propostas recebidas</h3>
            <span className="section-count">{orderedProposals.length}</span>
          </div>
          <div className="offer-proposal-toolbar">
            <span>Organizar por</span>
            <select className="select-input compact-select" value={proposalSort} onChange={(event) => setProposalSort(event.target.value)}>
              <option value="best">Melhor avaliação</option>
              <option value="price">Menor valor</option>
              <option value="speed">Prazo</option>
            </select>
          </div>
          <div className="professional-results">
            {orderedProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} onAccept={aceitarProposta} disabled={quoteFlow.loading} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function NegotiationScreen({ selectedService, negotiationFlow, setNegotiationFlow, onBack, onContinue }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;

    if (negotiationFlow.id || negotiationFlow.loading || negotiationFlow.offlineMode) {
      return () => {
        active = false;
      };
    }

    setNegotiationFlow((current) => ({ ...current, loading: true }));
    api
      .criarNegociacao({
        profissionalId: selectedService.professionalId,
        tituloServico: selectedService.title,
        resumoEscopo: selectedService.description,
        bairro: selectedService.neighborhood?.split(" - ")[1] || "Região validada",
        cidade: selectedService.neighborhood?.split(" - ")[0] || "Cidade validada",
        valorAcordado: selectedService.value,
        dataSugerida: negotiationFlow.suggestedDate,
        horaSugerida: negotiationFlow.suggestedTime,
      })
      .then((response) => {
        if (!active) return;
        setNegotiationFlow((current) => ({
          ...current,
          ...normalizeNegotiationResponse(response),
        }));
        setStatus({ type: "success", message: "Conversa segura iniciada pela API." });
      })
      .catch((error) => {
        if (!active) return;
        if (!ENABLE_OFFLINE_FALLBACK) {
          setNegotiationFlow((current) => ({
            ...current,
            loading: false,
          }));
          setStatus({
            type: "error",
            message: `Não foi possível iniciar a negociação com a API: ${error.message}`,
          });
          return;
        }
        setNegotiationFlow((current) => ({
          ...current,
          loading: false,
          offlineMode: true,
          messages: current.messages.length ? current.messages : createNegotiationSeed(selectedService).messages,
          paymentAligned: true,
        }));
        setStatus({ type: "warning", message: "API de negociação ainda não publicada. Fluxo local de teste mantido temporariamente." });
      });

    return () => {
      active = false;
    };
  }, [negotiationFlow.id, negotiationFlow.loading, negotiationFlow.offlineMode, negotiationFlow.suggestedDate, negotiationFlow.suggestedTime, selectedService, setNegotiationFlow]);

  const pushMessage = (message) => {
    setNegotiationFlow((current) => ({
      ...current,
      loading: false,
      draftMessage: "",
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${current.messages.length}`,
          ...message,
        },
      ],
    }));
  };

  const sendMessage = () => {
    const text = negotiationFlow.draftMessage.trim();
    if (!text) {
      setStatus({ type: "error", message: "Escreva uma mensagem curta antes de enviar." });
      return;
    }

    if (negotiationFlow.offlineMode || !negotiationFlow.id) {
      pushMessage({
        author: "cliente",
        tone: "neutral",
        text,
      });
      setStatus({ type: "success", message: "Mensagem registrada nesta conversa de teste." });
      return;
    }

    setNegotiationFlow((current) => ({ ...current, loading: true }));
    api
      .enviarMensagemNegociacao(negotiationFlow.id, negotiationFlow.tokenAcesso, { texto: text })
      .then((response) => {
        setNegotiationFlow((current) => ({
          ...current,
          ...normalizeNegotiationResponse(response),
        }));
        setStatus({ type: "success", message: "Mensagem enviada pela API." });
      })
      .catch((error) => {
        setNegotiationFlow((current) => ({ ...current, loading: false }));
        setStatus({ type: "error", message: error.message });
      });
  };

  const persistNegotiationState = async (nextState, successMessage) => {
    if (negotiationFlow.offlineMode || !negotiationFlow.id) {
      setNegotiationFlow((current) => ({
        ...current,
        ...nextState,
      }));
      if (successMessage) {
        setStatus({ type: "success", message: successMessage });
      }
      return true;
    }

    setNegotiationFlow((current) => ({ ...current, loading: true, ...nextState }));
    try {
      const response = await api.atualizarNegociacao(negotiationFlow.id, negotiationFlow.tokenAcesso, {
        dataSugerida: nextState.suggestedDate ?? negotiationFlow.suggestedDate,
        horaSugerida: nextState.suggestedTime ?? negotiationFlow.suggestedTime,
        escopoAlinhado: nextState.scopeAligned ?? negotiationFlow.scopeAligned,
        pagamentoAlinhado: nextState.paymentAligned ?? negotiationFlow.paymentAligned,
      });
      setNegotiationFlow((current) => ({
        ...current,
        ...normalizeNegotiationResponse(response),
      }));
      if (successMessage) {
        setStatus({ type: "success", message: successMessage });
      }
      return true;
    } catch (error) {
      setNegotiationFlow((current) => ({ ...current, loading: false }));
      setStatus({ type: "error", message: error.message });
      return false;
    }
  };

  const applySchedule = async () => {
    if (!negotiationFlow.suggestedDate || !negotiationFlow.suggestedTime) {
      setStatus({ type: "error", message: "Defina data e horário antes de registrar a janela do atendimento." });
      return;
    }

    if (negotiationFlow.offlineMode || !negotiationFlow.id) {
      pushMessage({
        author: "sistema",
        tone: "soft",
        text: `Janela sugerida atualizada para ${negotiationFlow.suggestedDate} às ${negotiationFlow.suggestedTime}. O endereço completo continua bloqueado até a confirmação mútua.`,
      });
      setStatus({ type: "success", message: "Janela de atendimento registrada." });
      return;
    }

    await persistNegotiationState({}, "Janela de atendimento registrada.");
  };

  const addQuickMessage = (text) => {
    if (negotiationFlow.offlineMode || !negotiationFlow.id) {
      pushMessage({
        author: "cliente",
        tone: "soft",
        text,
      });
      setStatus(null);
      return;
    }

    setNegotiationFlow((current) => ({ ...current, draftMessage: text }));
    setStatus(null);
  };

  const continueWithAgreement = async () => {
    const saved = await persistNegotiationState({}, null);
    if (saved) {
      onContinue();
    }
  };

  const canContinue = negotiationFlow.scopeAligned && negotiationFlow.paymentAligned && negotiationFlow.messages.length >= 2;

  return (
    <main className="screen">
      <AppHeader title="Conversa e Combinação" subtitle="Alinhe escopo, horário e pagamento antes da confirmação final" />
      <ServiceCard selectedService={selectedService} />

      <section className="agreement-note">
        <ShieldAlert size={18} />
        <p>Esta etapa compartilha apenas contexto operacional mínimo. Rua, número, telefone e dados sensíveis seguem bloqueados até a confirmação mútua.</p>
      </section>

      <section className="section-block">
        <h3>Resumo rapido</h3>
        <div className="double-grid negotiation-summary-grid">
          <section className="settings-card compact-card">
            <strong>Janela sugerida</strong>
            <span>{negotiationFlow.suggestedDate || selectedService.date}</span>
            <small>{negotiationFlow.suggestedTime || selectedService.time}</small>
          </section>
          <section className="settings-card compact-card">
            <strong>Valor combinado</strong>
            <span>{currency.format(Number(selectedService.value))}</span>
            <small>Pagamento so sera confirmado no checkout</small>
          </section>
        </div>
      </section>

      <section className="section-block">
        <h3>Mensagens</h3>
        <div className="conversation-thread">
          {negotiationFlow.messages.map((message) => (
            <article key={message.id} className={`chat-bubble ${message.author} ${message.tone || ""}`}>
              <strong>
                {message.author === "prestador" ? selectedService.professionalName : message.author === "sistema" ? "Sistema" : "Contratante"}
              </strong>
              <p>{message.text}</p>
            </article>
          ))}
        </div>

        <div className="quick-actions">
          <button onClick={() => addQuickMessage("Quero confirmar o escopo antes de seguir para o pagamento.")}>Confirmar escopo</button>
          <button onClick={() => addQuickMessage("Consigo seguir neste valor apresentado pelo app.")}>Confirmar valor</button>
          <button onClick={() => addQuickMessage("Se precisar, posso ajustar a janela de atendimento.")}>Ajustar horário</button>
        </div>

        <label>
          Nova mensagem
          <textarea
            className="multiline-input"
            value={negotiationFlow.draftMessage}
            onChange={(event) =>
              setNegotiationFlow((current) => ({
                ...current,
                draftMessage: event.target.value.slice(0, 220),
              }))
            }
          />
        </label>
        <button className="secondary-action icon-action" onClick={sendMessage}>
          <Send size={16} />
          {negotiationFlow.loading ? "Enviando..." : "Enviar mensagem"}
        </button>
      </section>

      <section className="section-block">
        <h3>Janela do atendimento</h3>
        <div className="double-grid">
          <label>
            Data
            <input
              type="date"
              value={negotiationFlow.suggestedDate}
              onChange={(event) =>
                setNegotiationFlow((current) => ({
                  ...current,
                  suggestedDate: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Hora
            <input
              type="time"
              value={negotiationFlow.suggestedTime}
              onChange={(event) =>
                setNegotiationFlow((current) => ({
                  ...current,
                  suggestedTime: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <button className="secondary-action" onClick={applySchedule}>
          Registrar janela sugerida
        </button>
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <div>
            <strong>Escopo alinhado</strong>
            <span>As duas partes ja entenderam o que sera executado.</span>
          </div>
          <input
            type="checkbox"
            checked={negotiationFlow.scopeAligned}
            onChange={(event) =>
              setNegotiationFlow((current) => ({
                ...current,
                scopeAligned: event.target.checked,
              }))
            }
          />
        </label>
        <label className="toggle-row">
          <div>
            <strong>Pagamento alinhado</strong>
            <span>Valor e fluxo de pagamento ja foram combinados antes do checkout.</span>
          </div>
          <input
            type="checkbox"
            checked={negotiationFlow.paymentAligned}
            onChange={(event) =>
              setNegotiationFlow((current) => ({
                ...current,
                paymentAligned: event.target.checked,
              }))
            }
          />
        </label>
      </section>

      <StatusMessage state={status} />
      <button className="secondary-action" onClick={onBack}>
        Voltar
      </button>
      <button className="primary-action" disabled={!canContinue || negotiationFlow.loading} onClick={continueWithAgreement}>
        Ir para confirmação mútua
      </button>
    </main>
  );
}

function AgreementScreen({ selectedService, onBack, onAgreementConfirmed }) {
  const [clienteConfirmou, setClienteConfirmou] = useState(Boolean(selectedService.clienteConfirmou));
  const [prestadorConfirmou, setPrestadorConfirmou] = useState(Boolean(selectedService.prestadorConfirmou));
  const [reviewsSummary, setReviewsSummary] = useState(null);
  const [reviewsStatus, setReviewsStatus] = useState(null);
  const canContinue = clienteConfirmou && prestadorConfirmou;

  useEffect(() => {
    setClienteConfirmou(Boolean(selectedService.clienteConfirmou));
    setPrestadorConfirmou(Boolean(selectedService.prestadorConfirmou));
  }, [selectedService]);

  useEffect(() => {
    let active = true;
    setReviewsStatus(null);

    api
      .listarAvaliacoesProfissional(selectedService.professionalId)
      .then((response) => {
        if (!active) return;
        setReviewsSummary(response);
      })
      .catch((error) => {
        if (!active) return;
        setReviewsSummary(null);
        setReviewsStatus({ type: "error", message: `Não foi possível carregar as avaliações públicas: ${error.message}` });
      });

    return () => {
      active = false;
    };
  }, [selectedService.professionalId]);

  return (
    <main className="screen">
      <AppHeader title="Combinar Serviço" subtitle="Endereço completo só aparece após confirmação mútua" />
      <ServiceCard selectedService={selectedService} />

      <section className="section-block">
        <h3>Reputacao publica</h3>
        <StatusMessage state={reviewsStatus} />
        <section className="settings-card">
          <div className="rating-summary-row">
            <div>
              <strong>{reviewsSummary?.totalAvaliacoes ? Number(reviewsSummary.notaMedia).toFixed(1) : "Novo perfil"}</strong>
              <span>{reviewsSummary?.totalAvaliacoes ? `${reviewsSummary.totalAvaliacoes} avaliações liberadas` : "Ainda sem avaliações públicas liberadas"}</span>
            </div>
            <Star size={18} />
          </div>
          {reviewsSummary?.avaliacoes?.length ? (
            <div className="review-list">
              {reviewsSummary.avaliacoes.slice(0, 2).map((item) => (
                <article key={item.id} className="review-card">
                  <strong>{`${item.nota}/5`}</strong>
                  <p>{item.comentario || "Avaliacao sem comentario adicional."}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      <section className="section-block">
        <h3>Confirmacao das partes</h3>
        <section className="settings-card">
          <label className="toggle-row">
            <div>
              <strong>Contratante confirmou</strong>
              <span>O cliente confirmou o interesse real em realizar este atendimento.</span>
            </div>
            <input type="checkbox" checked={clienteConfirmou} onChange={(event) => setClienteConfirmou(event.target.checked)} />
          </label>
          <label className="toggle-row">
            <div>
              <strong>Prestador aceitou</strong>
              <span>O profissional aceitou executar o serviço nas condições combinadas.</span>
            </div>
            <input type="checkbox" checked={prestadorConfirmou} onChange={(event) => setPrestadorConfirmou(event.target.checked)} />
          </label>
        </section>
      </section>

      <section className="agreement-note">
        <ShieldAlert size={18} />
        <p>
          Enquanto uma das confirmações estiver pendente, a plataforma exibe apenas a região aproximada. Rua, número e
          complemento ficam bloqueados até a combinação mútua.
        </p>
      </section>

      <button className="secondary-action" onClick={onBack}>
        Voltar para a vitrine
      </button>
      <button
        className="primary-action"
        disabled={!canContinue}
        onClick={() => onAgreementConfirmed({ clienteConfirmou, prestadorConfirmou })}
      >
        Liberar endereço e continuar
      </button>
    </main>
  );
}

function CheckoutScreen({ payment, setPayment, auth, onProjectCreated, onOpenCompletion, selectedService }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cashAccepted, setCashAccepted] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const [locationProof, setLocationProof] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const isCash = payment === "DINHEIRO_LOCAL";
  const canConfirm = (isCash ? cashAccepted : termsAccepted) && locationConsent && locationProof;

  const validarLocalizacao = async () => {
    if (!locationConsent) {
      setStatus({ type: "error", message: "Autorize o uso da localização antes de validar sua posição." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const proof = await captureCurrentLocation();
      setLocationProof(proof);
      setStatus({ type: "success", message: `Localizacao validada com precisao aproximada de ${proof.accuracy || 0}m.` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!auth?.accessToken) {
      setStatus({ type: "error", message: "Faca o cadastro seguro e login antes de confirmar o pagamento." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const projeto = await api.criarCheckout(
        {
          clienteId: auth.usuarioId,
          prestadorId: selectedService.professionalId,
          tituloServico: selectedService.title,
          descricaoEscopo: selectedService.description,
          valorTotal: selectedService.value,
          tipoPagamento: payment,
          tipoFluxo: "DIRETO",
          dataAgendamento: "2026-07-15T14:00:00-03:00",
          aceiteTermos: termsAccepted,
          aceiteIsencaoGarantia: cashAccepted,
          geolocalizacaoAutorizada: locationConsent,
          latitudeCheckout: locationProof.latitude,
          longitudeCheckout: locationProof.longitude,
        },
        auth.accessToken,
      );
      onProjectCreated(projeto);
      setStatus({ type: "success", message: `Projeto criado com status ${projeto.status}. Token: ${projeto.tokenValidacao}` });
      onOpenCompletion();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="screen">
      <AppHeader title="Checkout" subtitle="Confirme e pague com segurança" />
      <SessionBanner auth={auth} onReset={auth?.logout} />
      <ServiceCard selectedService={selectedService} />

      <section className="section-block">
        <h3>Forma de pagamento</h3>
        <div className="payment-list">
          {paymentMethods.map((method) => (
            <PaymentMethod
              key={method.id}
              method={method}
              selected={payment === method.id}
              onSelect={() => setPayment(method.id)}
            />
          ))}
        </div>
      </section>

      {isCash ? (
        <section className="warning-panel">
          <label className="cash-accept-row">
            <input type="checkbox" checked={cashAccepted} onChange={(event) => setCashAccepted(event.target.checked)} />
          </label>
          <div>
            <strong>Isencao de Garantia</strong>
            <p>
              Ao pagar em dinheiro no local, a plataforma nao se responsabiliza por calotes, divergencia de troco ou
              pela qualidade do serviço executado fora do aplicativo. Confirmo que li e aceito o termo de renúncia.
            </p>
          </div>
        </section>
      ) : (
        <label className="terms-panel">
          <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
          <span>
            Estou ciente e de acordo com os <strong>Termos de Uso</strong>, <strong>Política de Privacidade</strong> e
            aceito o compartilhamento dos meus dados de localização estritamente para validação da prestação do serviço
            físico.
          </span>
        </label>
      )}

      <section className="privacy-panel compact">
        <Shield size={17} />
        <p>
          A localização é usada apenas para validar a combinação e a execução física do serviço, respeitando o aceite jurídico já registrado.
        </p>
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <div>
            <strong>Permitir geolocalização operacional</strong>
            <span>Necessária para validar contratação e conclusão do serviço em ambiente real.</span>
          </div>
          <input type="checkbox" checked={locationConsent} onChange={(event) => setLocationConsent(event.target.checked)} />
        </label>
        <button className="secondary-action" disabled={loading} onClick={validarLocalizacao}>
          {loading ? "Validando localização..." : locationProof ? "Atualizar localização" : "Validar localização atual"}
        </button>
        <div className={`inline-result ${locationProof ? "success" : ""}`}>
          {locationProof ? `Localização pronta: ${formatLocationLabel(locationProof)}` : "Nenhuma localização validada para este checkout."}
        </div>
      </section>

      <StatusMessage state={status} />
      <button className="primary-action" disabled={!canConfirm || loading} onClick={confirmPayment}>
        {loading ? "Processando..." : `Confirmar Pagamento - ${currency.format(selectedService.value)}`}
      </button>
    </main>
  );
}

function CompleteScreen({ auth, projetoAtual, onProjectUpdated, selectedService }) {
  const [token, setToken] = useState("");
  const [photoSent, setPhotoSent] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSource, setPhotoSource] = useState("");
  const [locationProof, setLocationProof] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ nota: 5, comentario: "" });
  const [reviewSent, setReviewSent] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const tokenComplete = token.length === 4;
  const canUseApi = auth?.accessToken && projetoAtual?.id;

  useEffect(() => {
    setReviewDraft({ nota: 5, comentario: "" });
    setReviewSent(false);
    setLocationProof(null);
  }, [projetoAtual?.id]);

  const validarLocalizacaoConclusao = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const proof = await captureCurrentLocation();
      setLocationProof(proof);
      setStatus({ type: "success", message: `Localização de conclusão validada com precisão aproximada de ${proof.accuracy || 0}m.` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmarToken = async () => {
    if (!canUseApi || !tokenComplete) {
      setStatus({ type: "error", message: "Crie um projeto no checkout e informe o token de 4 digitos." });
      return;
    }
    if (!locationProof) {
      setStatus({ type: "error", message: "Valide a localização atual antes de concluir com token." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const projeto = await api.confirmarToken(
        projetoAtual.id,
        {
          token,
          geolocalizacaoAutorizada: true,
          latitudeConclusao: locationProof.latitude,
          longitudeConclusao: locationProof.longitude,
        },
        auth.accessToken,
      );
      onProjectUpdated(projeto);
      setStatus({ type: "success", message: `Servico finalizado com sucesso. Status atual: ${projeto.status}.` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const concluirComFoto = async () => {
    if (!canUseApi) {
      setStatus({ type: "error", message: "Crie um projeto no checkout antes de concluir o serviço." });
      return;
    }
    if (!locationProof) {
      setStatus({ type: "error", message: "Valide a localização atual antes de concluir com foto." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const imagePayload = await captureServiceImage();
      if (!imagePayload?.base64) {
        setStatus({ type: "error", message: "Captura cancelada. Escolha uma foto para concluir o serviço." });
        return;
      }

      const projeto = await api.concluirComFoto(
        projetoAtual.id,
        {
          imagemBase64: imagePayload.base64,
          clienteAutorizouFoto: true,
          geolocalizacaoAutorizada: true,
          latitudeConclusao: locationProof.latitude,
          longitudeConclusao: locationProof.longitude,
        },
        auth.accessToken,
      );
      onProjectUpdated(projeto);
      setPhotoSent(true);
      setPhotoPreview(imagePayload.previewUrl);
      setPhotoSource(imagePayload.sourceLabel);
      setStatus({ type: "success", message: "Foto enviada. Projeto em revisao e cronometro de 48 horas iniciado." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const enviarAvaliacao = async () => {
    if (!auth?.accessToken || !projetoAtual?.id) {
      setStatus({ type: "error", message: "Finalize o projeto e mantenha a sessão ativa para avaliar." });
      return;
    }

    if (projetoAtual.status !== "FINALIZADO") {
      setStatus({ type: "error", message: "A avaliação cega só abre depois da finalização do serviço." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const response = await api.criarAvaliacaoProjeto(
        projetoAtual.id,
        {
          avaliadoId: projetoAtual.prestadorId,
          nota: reviewDraft.nota,
          comentario: reviewDraft.comentario.trim(),
        },
        auth.accessToken,
      );
      setReviewSent(true);
      setStatus({
        type: "success",
        message:
          response.cegaLiberada
            ? "Avaliação registrada e liberada pelo modo cego."
            : response.statusModeracao === "PENDENTE_REVISAO"
              ? "Avaliação registrada e enviada para moderação."
              : "Avaliacao registrada. Ela sera liberada publicamente quando o modo cego do projeto for concluido.",
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="screen">
      <AppHeader title="Concluir Servico" subtitle="Confirme a entrega para liberar o pagamento" />
      <SessionBanner auth={auth} onReset={auth?.logout} />

      <section className="inline-result">
        <KeyRound size={16} />
        {projetoAtual?.id ? (
          <span>
            Projeto ativo: <strong>{projetoAtual.tituloServico}</strong> - status {projetoAtual.status}. Token atual:{" "}
            <strong>{projetoAtual.tokenValidacao}</strong>
          </span>
        ) : (
          <span>Finalize primeiro um checkout para liberar as ações de conclusão.</span>
        )}
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <div>
            <strong>Prova de localização</strong>
            <span>Valide sua posição atual antes de concluir o atendimento no app.</span>
          </div>
          <button className="mini-button" onClick={validarLocalizacaoConclusao} disabled={loading}>
            {loading ? "..." : "Validar"}
          </button>
        </label>
        <div className={`inline-result ${locationProof ? "success" : ""}`}>
          {locationProof ? `Conclusão validada em ${buildLocationProofLabel(locationProof)}` : "Localização ainda não validada para esta conclusão."}
        </div>
      </section>

      <span className="option-label">Opcao A - Recomendada</span>
      <section className="completion-card">
        <div className="completion-heading">
          <IconBox>
            <KeyRound size={21} />
          </IconBox>
          <div>
            <strong>Token de Confirmacao</strong>
            <small>Peça ao cliente o código de 4 dígitos.</small>
          </div>
        </div>
        <input
          className="token-input"
          inputMode="numeric"
          maxLength={4}
          value={token}
          onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="____"
          aria-label="Token de confirmação"
        />
        {tokenComplete ? (
          <div className="inline-success">
            <Check size={16} />
            Token pronto para envio e liquidacao instantanea.
          </div>
        ) : null}
        <button className="secondary-action" disabled={!tokenComplete || loading} onClick={confirmarToken}>
          {loading ? "Validando..." : "Confirmar com token"}
        </button>
      </section>

      <div className="or-divider">
        <span />
        ou
        <span />
      </div>

      <span className="option-label">Opção B - Sem código</span>
      <section className="completion-card">
        <div className="completion-heading">
          <IconBox>
            <Camera size={21} />
          </IconBox>
          <div>
            <strong>Concluir sem Codigo</strong>
            <small>Envie uma foto do serviço concluído.</small>
          </div>
        </div>
        <button className={`photo-drop ${photoSent ? "done" : ""}`} onClick={concluirComFoto} disabled={loading}>
          <Camera size={28} />
          <strong>{photoSent ? "Foto enviada para análise" : "Tirar foto agora"}</strong>
          <span>{photoSent ? "Cronômetro de 48 horas iniciado" : "Enquadre a área onde o serviço foi executado"}</span>
        </button>
        {photoPreview ? (
          <div className="photo-preview-card">
            <img src={photoPreview} alt="Comprovação do serviço enviado" />
            <span>{photoSource || "Imagem pronta para envio"}</span>
          </div>
        ) : null}
      </section>

      <StatusMessage state={status} />

      {projetoAtual?.status === "FINALIZADO" ? (
        <section className="section-block">
          <h3>Avaliacao cega</h3>
          <section className="settings-card">
            <div className="rating-summary-row">
              <div>
                <strong>{selectedService.professionalName}</strong>
                <span>Envie sua nota sem expor a contraparte antes da liberação do modo cego.</span>
              </div>
              <Star size={18} />
            </div>
            <label>
              Nota
              <select
                className="select-input"
                value={reviewDraft.nota}
                onChange={(event) =>
                  setReviewDraft((current) => ({
                    ...current,
                    nota: Number(event.target.value),
                  }))
                }
                disabled={reviewSent || loading}
              >
                {[5, 4, 3, 2, 1].map((item) => (
                  <option key={item} value={item}>
                    {item} de 5
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comentario
              <textarea
                className="multiline-input"
                value={reviewDraft.comentario}
                onChange={(event) =>
                  setReviewDraft((current) => ({
                    ...current,
                    comentario: event.target.value.slice(0, 280),
                  }))
                }
                disabled={reviewSent || loading}
              />
            </label>
            <button className="primary-action" disabled={reviewSent || loading} onClick={enviarAvaliacao}>
              {reviewSent ? "Avaliação enviada" : "Enviar avaliação"}
            </button>
          </section>
        </section>
      ) : null}

      <section className="privacy-panel">
        <Shield size={17} />
        <p>
          <strong>Privacidade e LGPD:</strong> as imagens enviadas sao criptografadas de ponta a ponta e descartadas
          apos o contrato finalizar.
        </p>
      </section>

      <p className="support-copy">
        <CircleHelp size={15} />
        Precisa de ajuda? Fale com o suporte 24/7.
      </p>
    </main>
  );
}

function WalletScreen({ auth }) {
  const [wallet, setWallet] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  const weekDays = useMemo(() => {
    const baseDate = new Date(2026, 6, 5);
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(baseDate);
      current.setDate(baseDate.getDate() + index);
      return current;
    });
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
    const start = weekDays[0];
    const end = weekDays[6];
    if (!start || !end) {
      return "Semana atual";
    }
    return `${formatter.format(start)} a ${formatter.format(end)} de ${end.getFullYear()}`;
  }, [weekDays]);

  useEffect(() => {
    if (!auth?.usuarioId || !auth?.accessToken) {
      setWallet(null);
      return;
    }

    let active = true;
    setLoading(true);
    setStatus(null);
    api
      .buscarCarteira(auth.usuarioId, auth.accessToken)
      .then((response) => {
        if (active) {
          setWallet(response);
        }
      })
      .catch((error) => {
        if (active) {
          setStatus({ type: "error", message: error.message });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [auth]);

  const visibleMovements = useMemo(() => {
    if (!wallet?.movimentos) {
      return [];
    }

    const normalized = wallet.movimentos.map((movement, index) => ({
      id: `${movement.descricao}-${movement.data}-${index}`,
      title: movement.descricao,
      date: formatMovementDate(movement.data),
      rawDate: movement.data ? new Date(movement.data) : null,
      amount: Number(movement.valor),
      type: Number(movement.valor) >= 0 ? "credit" : "debit",
    }));
    if (!selectedDay) {
      return normalized;
    }
    return normalized.filter((movement) => {
      if (!movement.rawDate || Number.isNaN(movement.rawDate.getTime())) {
        return false;
      }
      return (
        movement.rawDate.getDate() === selectedDay.getDate()
        && movement.rawDate.getMonth() === selectedDay.getMonth()
        && movement.rawDate.getFullYear() === selectedDay.getFullYear()
      );
    });
  }, [selectedDay, wallet]);

  const solicitarSaque = async () => {
    if (!auth?.usuarioId || !auth?.accessToken || !wallet) {
      setStatus({ type: "error", message: "Faca login e aguarde o carregamento da carteira." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const response = await api.solicitarSaque(
        auth.usuarioId,
        { valor: wallet.valorMinimoSaque },
        auth.accessToken,
      );
      setWallet(response);
      setStatus({ type: "success", message: `Saque teste solicitado com valor de ${currency.format(Number(response.valorMinimoSaque))}.` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const recarregarCarteira = async () => {
    if (!auth?.usuarioId || !auth?.accessToken) {
      setStatus({ type: "error", message: "Faca login para atualizar a carteira." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const response = await api.buscarCarteira(auth.usuarioId, auth.accessToken);
      setWallet(response);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="screen native-screen">
      <section className="native-hero wallet-hero">
        <span className="statusbar-space" />
        <small>Saldo da semana</small>
        <strong>{currency.format(Number(wallet?.saldoAtual || 0))}</strong>
      </section>

      <section className="native-sheet wallet-native-sheet">
        <section className="native-alert">
          <Hourglass size={21} />
          <span>Aguarde! Estamos validando o seu cadastro. Para começar a receber ofertas é necessário ter o cadastro aprovado.</span>
        </section>

        <div className="week-switcher">
          <button aria-label="Semana anterior" onClick={() => setWeekOffset((current) => current - 1)}>
            <ChevronRight size={24} className="flip-icon" />
          </button>
          <strong>{weekLabel}</strong>
          <button aria-label="Próxima semana" onClick={() => setWeekOffset((current) => current + 1)}>
            <ChevronRight size={24} />
          </button>
        </div>

        <section className="week-card">
          {weekDays.map((day) => (
            <button
              key={day.toISOString()}
              className={selectedDay?.toDateString() === day.toDateString() ? "selected" : ""}
              onClick={() => setSelectedDay(day)}
            >
              <span>{new Intl.DateTimeFormat("pt-BR", { weekday: "narrow" }).format(day)}</span>
              <strong>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(day)}</strong>
            </button>
          ))}
        </section>

        <section className="quick-offer-strip wallet-action-strip">
          <strong>Ações rápidas</strong>
          <div>
            <button onClick={recarregarCarteira}>Atualizar carteira</button>
            <button onClick={solicitarSaque}>Solicitar saque teste</button>
            {selectedDay ? <button onClick={() => setSelectedDay(null)}>Limpar dia</button> : null}
          </div>
        </section>

        <p className="native-empty-copy">
          {selectedDay
            ? `Movimentações filtradas para ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(selectedDay)}.`
            : "Selecione um dia da semana para consultar os detalhes."}
        </p>

        <StatusMessage state={status} />
        {visibleMovements.length > 0 ? (
          <div className="movement-list compact-movement-list">
            {visibleMovements.slice(0, 5).map((movement) => (
              <div className="movement-row" key={movement.id}>
                <div className={`movement-icon ${movement.type}`}>
                  {movement.type === "credit" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </div>
                <div>
                  <strong>{movement.title}</strong>
                  <span>{movement.date}</span>
                </div>
                <em className={movement.type}>
                  {movement.amount > 0 ? "+" : ""}
                  {currency.format(movement.amount)}
                </em>
              </div>
            ))}
          </div>
        ) : (
          <p className="native-empty-copy">Nenhuma movimentação encontrada para o período selecionado.</p>
        )}
      </section>
    </main>
  );
}

function DocumentsPanel({ auth }) {
  const [dossie, setDossie] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [draftFiles, setDraftFiles] = useState({
    documentoFrente: null,
    documentoVerso: null,
    selfieComDocumento: null,
  });

  useEffect(() => {
    if (!auth?.usuarioId || !auth?.accessToken) {
      return;
    }

    let active = true;
    setLoading(true);
    api
      .buscarDossieDocumental(auth.usuarioId, auth.accessToken)
      .then((response) => {
        if (active) {
          setDossie(response);
        }
      })
      .catch((error) => {
        if (active) {
          setStatus({ type: "error", message: error.message });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [auth]);

  const captureSlot = async (field, label) => {
    setStatus(null);
    try {
      const image = await captureDocumentImage();
      if (!image?.base64) {
        setStatus({ type: "warning", message: `Captura de ${label.toLowerCase()} cancelada.` });
        return;
      }

      const hashArquivo = await sha256Text(image.base64);
      const tamanhoBytes = estimateBase64Bytes(image.base64);
      setDraftFiles((current) => ({
        ...current,
        [field]: {
          nomeArquivo: `${field}.jpg`,
          mimeType: "image/jpeg",
          hashArquivo,
          tamanhoBytes,
          conteudoBase64: image.base64,
          previewUrl: image.previewUrl,
          sourceLabel: image.sourceLabel || "Imagem preparada",
        },
      }));
      setStatus({ type: "success", message: `${label} preparado com segurança para envio.` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const canSubmit = Object.values(draftFiles).every(Boolean) && auth?.usuarioId && auth?.accessToken;

  const submitDocuments = async () => {
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const response = await api.enviarDossieDocumental(
        auth.usuarioId,
        {
          documentoFrente: {
            nomeArquivo: draftFiles.documentoFrente.nomeArquivo,
            mimeType: draftFiles.documentoFrente.mimeType,
            hashArquivo: draftFiles.documentoFrente.hashArquivo,
            tamanhoBytes: draftFiles.documentoFrente.tamanhoBytes,
            conteudoBase64: draftFiles.documentoFrente.conteudoBase64,
          },
          documentoVerso: {
            nomeArquivo: draftFiles.documentoVerso.nomeArquivo,
            mimeType: draftFiles.documentoVerso.mimeType,
            hashArquivo: draftFiles.documentoVerso.hashArquivo,
            tamanhoBytes: draftFiles.documentoVerso.tamanhoBytes,
            conteudoBase64: draftFiles.documentoVerso.conteudoBase64,
          },
          selfieComDocumento: {
            nomeArquivo: draftFiles.selfieComDocumento.nomeArquivo,
            mimeType: draftFiles.selfieComDocumento.mimeType,
            hashArquivo: draftFiles.selfieComDocumento.hashArquivo,
            tamanhoBytes: draftFiles.selfieComDocumento.tamanhoBytes,
            conteudoBase64: draftFiles.selfieComDocumento.conteudoBase64,
          },
        },
        auth.accessToken,
      );
      setDossie(response);
      setDraftFiles({
        documentoFrente: null,
        documentoVerso: null,
        selfieComDocumento: null,
      });
      setStatus({ type: "success", message: "Documentos enviados para análise. O banco guarda apenas metadados e o caminho seguro dos arquivos." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="documents-panel">
      <div className="profile-detail-head">
        <strong>Status do dossiê</strong>
        <span>{dossie?.orientacao || "Prepare frente, verso e selfie com documento."}</span>
      </div>

      <div className="offer-chip-row">
        <span className="payment-chip">Status: {dossie ? formatSolicitacaoStatus(dossie.status) : "Carregando"}</span>
        {dossie?.enviadoEm ? <span className="payment-chip">Enviado em {formatAcceptedDate(dossie.enviadoEm)}</span> : null}
      </div>

      {dossie?.motivoRejeicao ? <section className="inline-result warning">{dossie.motivoRejeicao}</section> : null}

      <div className="doc-upload-grid">
        {[
          ["documentoFrente", "Documento frente"],
          ["documentoVerso", "Documento verso"],
          ["selfieComDocumento", "Selfie com documento"],
        ].map(([field, label]) => {
          const item = draftFiles[field];
          return (
            <button key={field} className={`doc-slot-card ${item ? "ready" : ""}`} onClick={() => captureSlot(field, label)} disabled={loading}>
              <Camera size={22} />
              <strong>{label}</strong>
              <span>{item ? `${formatBytes(item.tamanhoBytes)} · pronto para envio` : "Toque para capturar"}</span>
            </button>
          );
        })}
      </div>

      <div className="photo-preview-card document-preview-stack">
        {Object.entries(draftFiles)
          .filter(([, item]) => Boolean(item?.previewUrl))
          .map(([field, item]) => (
            <div key={field} className="document-preview-item">
              <img src={item.previewUrl} alt={field} />
              <span>{item.sourceLabel} · {formatBytes(item.tamanhoBytes)}</span>
            </div>
          ))}
      </div>

      <section className="agreement-note compact">
        <ShieldAlert size={17} />
        <p>
          As imagens são enviadas por conexão autenticada para análise. O banco guarda apenas hash, tipo, tamanho e
          caminho privado, evitando arquivo pesado e exposição direta.
        </p>
      </section>

      <button className="primary-action detail-save-button" disabled={!canSubmit || loading} onClick={submitDocuments}>
        {loading ? "Enviando..." : "Enviar documentos"}
      </button>

      <StatusMessage state={status} />
    </section>
  );
}

function ProfileScreen({ auth, profileSettings, setProfileSettings, versaoStatus, legalAcceptedAt, activeSection, setActiveSection }) {
  const [draft, setDraft] = useState(profileSettings);
  const [status, setStatus] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");

  const menuItems = [
    { id: "profile", icon: UserRound, label: "Perfil", description: "Atualize nome, categoria principal e descrição." },
    { id: "address", icon: MapPinned, label: "Endereço residencial", description: "Organize endereço e dados de localização." },
    { id: "bank", icon: CreditCard, label: "Dados bancários", description: "Defina Pix e conta para repasses." },
    { id: "service", icon: BriefcaseBusiness, label: "Preferências de atendimento", description: "Ajuste disponibilidade e área de atuação." },
    { id: "documents", icon: FileText, label: "Documentos", description: "Acompanhe o envio e a aprovação cadastral." },
    { id: "incidents", icon: AlertTriangle, label: "Ocorrências", description: "Consulte alertas e registros de suporte." },
    { id: "invite", icon: Gift, label: "Convidar amigos", description: "Compartilhe o app com sua rede." },
    { id: "help", icon: CircleHelp, label: "Ajuda", description: "Veja orientações rápidas de uso." },
    { id: "contacts", icon: Phone, label: "Contatos Free", description: "Canais oficiais de contato e suporte." },
    { id: "notifications", icon: Bell, label: "Notificações", description: "Defina o que você quer receber." },
  ];

  const filteredMenuItems = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();
    if (!query) {
      return menuItems;
    }
    return menuItems.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query));
  }, [menuSearch]);

  const selectedMenuItem = menuItems.find((item) => item.id === activeSection) || menuItems[0];

  useEffect(() => {
    setDraft(profileSettings);
  }, [profileSettings]);

  const updateDraft = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveProfile = () => {
    setProfileSettings(draft);
    setStatus({ type: "success", message: "Perfil e configuracoes salvos neste dispositivo de teste." });
  };

  const handlePhoto = async () => {
    setLoadingPhoto(true);
    setStatus(null);
    try {
      const image = await captureProfileImage();
      if (!image?.base64) {
        setStatus({ type: "error", message: "Selecao de foto cancelada." });
        return;
      }

      setDraft((current) => ({
        ...current,
        avatarBase64: image.base64,
        avatarPreviewUrl: image.previewUrl,
      }));
      setStatus({ type: "success", message: "Foto de perfil otimizada e pronta para uso." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoadingPhoto(false);
    }
  };

  const panelContent = {
    profile: (
      <div className="form-stack auth-form-stack native-form-stack compact-native-form">
        <label>Nome exibido<input value={draft.nomeExibicao} onChange={(event) => updateDraft("nomeExibicao", event.target.value.slice(0, 60))} /></label>
        <label>Categoria principal<input value={draft.categoriaPrincipal} onChange={(event) => updateDraft("categoriaPrincipal", event.target.value.slice(0, 60))} /></label>
        <label>Descrição<input value={draft.descricao} onChange={(event) => updateDraft("descricao", event.target.value.slice(0, 180))} /></label>
      </div>
    ),
    address: (
      <div className="form-stack auth-form-stack native-form-stack compact-native-form">
        <label>CEP<input inputMode="numeric" value={draft.cep} onChange={(event) => updateDraft("cep", formatCep(event.target.value))} /></label>
        <div className="native-double-grid">
          <label>UF<input value={draft.uf} onChange={(event) => updateDraft("uf", event.target.value.toUpperCase().slice(0, 2))} /></label>
          <label>Município<input value={draft.municipio} onChange={(event) => updateDraft("municipio", event.target.value.slice(0, 60))} /></label>
        </div>
        <label>Rua<input value={draft.rua} onChange={(event) => updateDraft("rua", event.target.value.slice(0, 80))} /></label>
        <div className="native-double-grid">
          <label>Bairro<input value={draft.bairro} onChange={(event) => updateDraft("bairro", event.target.value.slice(0, 60))} /></label>
          <label>Número<input value={draft.numero} onChange={(event) => updateDraft("numero", event.target.value.slice(0, 10))} /></label>
        </div>
        <label>Complemento<input value={draft.complemento} onChange={(event) => updateDraft("complemento", event.target.value.slice(0, 60))} /></label>
      </div>
    ),
    bank: (
      <div className="form-stack auth-form-stack native-form-stack compact-native-form">
        <label>Banco<input value={draft.banco} onChange={(event) => updateDraft("banco", event.target.value.slice(0, 40))} /></label>
        <div className="native-double-grid">
          <label>Agência<input value={draft.agencia} onChange={(event) => updateDraft("agencia", event.target.value.slice(0, 10))} /></label>
          <label>Conta<input value={draft.conta} onChange={(event) => updateDraft("conta", event.target.value.slice(0, 16))} /></label>
        </div>
        <label>Chave Pix<input value={draft.chavePix} onChange={(event) => updateDraft("chavePix", event.target.value.slice(0, 80))} /></label>
      </div>
    ),
    service: (
      <div className="form-stack auth-form-stack native-form-stack compact-native-form">
        <label>Área de atendimento<input value={draft.areaAtendimento} onChange={(event) => updateDraft("areaAtendimento", event.target.value.slice(0, 80))} /></label>
        <label>Horário preferencial<input value={draft.horarioPreferencial} onChange={(event) => updateDraft("horarioPreferencial", event.target.value.slice(0, 60))} /></label>
      </div>
    ),
    documents: <DocumentsPanel auth={auth} />,
    incidents: <p className="panel-copy">Nenhuma ocorrência aberta no momento. Quando houver divergência, cancelamento ou suporte acionado, os registros aparecerão aqui.</p>,
    invite: <p className="panel-copy">Convites e programa de indicação serão ativados no rollout de produção. A estrutura do menu já está pronta para receber esse fluxo.</p>,
    help: <p className="panel-copy">Use Ofertas para publicar uma necessidade, Agenda para acompanhar datas, Carteira para visualizar repasses e Menu para ajustar dados pessoais e preferências.</p>,
    contacts: <p className="panel-copy">Contato operacional centralizado no app durante os testes. Na produção, este bloco receberá telefone, e-mail e atendimento contextual por assunto.</p>,
    notifications: (
      <div className="settings-card embedded-settings-card">
        <label className="toggle-row">
          <div>
            <strong>Notificações push</strong>
            <span>Novos pedidos e atualizações importantes.</span>
          </div>
          <input type="checkbox" checked={draft.notificacoesPush} onChange={(event) => updateDraft("notificacoesPush", event.target.checked)} />
        </label>
        <label className="toggle-row">
          <div>
            <strong>Notificações por e-mail</strong>
            <span>Comprovantes e avisos de conta.</span>
          </div>
          <input type="checkbox" checked={draft.notificacoesEmail} onChange={(event) => updateDraft("notificacoesEmail", event.target.checked)} />
        </label>
      </div>
    ),
  };

  return (
    <main className="screen native-screen menu-screen">
      <section className="native-hero menu-hero">
        <span className="statusbar-space" />
        <div className="menu-profile-head">
          <button className="profile-avatar large" onClick={handlePhoto} disabled={loadingPhoto} aria-label="Alterar foto de perfil">
            {draft.avatarPreviewUrl ? <img src={draft.avatarPreviewUrl} alt="Foto de perfil" /> : <span>{formatNameInitials(draft.nomeExibicao || auth?.nomeExibicao || "Seu perfil")}</span>}
            <Camera size={15} />
          </button>
          <div>
            <strong>{draft.nomeExibicao || auth?.nomeExibicao || "Seu perfil"}</strong>
            <span>{auth?.contaDemo ? "Conta demo" : draft.categoriaPrincipal || "Prestador"}</span>
          </div>
          <button className="icon-only-button menu-search-toggle" onClick={() => setShowSearch((current) => !current)} aria-label="Buscar opções do menu">
            <Search size={24} />
          </button>
        </div>
      </section>

      <section className="menu-content">
        {showSearch ? (
          <label className="menu-search-card">
            <Search size={18} />
            <input value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} placeholder="Buscar no menu" />
          </label>
        ) : null}

        <section className="performance-card">
          <div>
            <strong>0</strong>
            <span>Avaliação</span>
          </div>
          <div>
            <strong>0</strong>
            <span>Atendimentos finalizados</span>
          </div>
          <div>
            <strong>0</strong>
            <span>Pontos em aberto</span>
          </div>
          <button onClick={saveProfile}>Meu desempenho</button>
        </section>

        <h2>Mais visitados</h2>
        <div className="shortcut-row">
          <button onClick={() => setActiveSection("profile")}>
            <UserRound size={30} />
            Dados pessoais
          </button>
          <button onClick={() => setActiveSection("address")}>
            <MapPinned size={30} />
            Endereço residencial
          </button>
          <button onClick={() => setActiveSection("bank")}>
            <CreditCard size={30} />
            Dados bancários
          </button>
        </div>

        <section className="menu-list">
          {filteredMenuItems.map(({ id, icon: Icon, label }) => (
            <button key={label} className={activeSection === id ? "active" : ""} onClick={() => setActiveSection(id)}>
              <span>
                <Icon size={28} />
              </span>
              <strong>{label}</strong>
              <ChevronRight size={24} />
            </button>
          ))}
          <button onClick={auth?.logout}>
            <span>
              <LogOut size={28} />
            </span>
            <strong>Sair</strong>
            <ChevronRight size={24} />
          </button>
        </section>

        <section className="settings-card profile-detail-card">
          <div className="profile-detail-head">
            <strong>{selectedMenuItem.label}</strong>
            <span>{selectedMenuItem.description}</span>
          </div>
          {panelContent[selectedMenuItem.id]}
          <button className="primary-action detail-save-button" onClick={saveProfile}>Salvar ajustes</button>
        </section>

        <section className="settings-card native-settings-card">
          <label className="toggle-row">
            <div>
              <strong>Notificações push</strong>
              <span>Novos pedidos e alertas importantes.</span>
            </div>
            <input type="checkbox" checked={draft.notificacoesPush} onChange={(event) => updateDraft("notificacoesPush", event.target.checked)} />
          </label>
          <div className="settings-row">
            <strong>Versão do app</strong>
            <span>{APP_VERSION} · {versaoStatus?.type === "success" ? "compatível" : "validação pendente"}</span>
          </div>
          <div className="settings-row">
            <strong>Termos aceitos</strong>
            <span>{legalAcceptedAt ? formatAcceptedDate(legalAcceptedAt) : "Pendente"}</span>
          </div>
        </section>

        <StatusMessage state={status} />
      </section>
    </main>
  );
}

function AuthScreen({ onAuthenticated, sessionNotice }) {
  const [mode, setMode] = useState("login");
  const [loginExpanded, setLoginExpanded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [registerStep, setRegisterStep] = useState(1);
  const [showRegisterTerms, setShowRegisterTerms] = useState(false);
  const [termsGateChecked, setTermsGateChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loginDraft, setLoginDraft] = useState({ email: "", senha: "" });
  const [registerDraft, setRegisterDraft] = useState({
    nomeExibicao: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    documento: "",
    nascimento: "",
    telefone: "",
    tipoUsuario: "FREELANCER",
    cep: "",
    uf: "",
    municipio: "",
    rua: "",
    bairro: "",
    numero: "",
    complemento: "",
  });
  const [otpSent, setOtpSent] = useState(null);
  const [otpDraft, setOtpDraft] = useState({ codigoEmail: "", codigoTelefone: "" });
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const documentReady = registerDraft.documento.replace(/\D/g, "").length >= 11;
  const birthReady = registerDraft.nascimento.trim().length === 10;
  const personalStepReady = registerDraft.nomeExibicao.trim() && registerDraft.email.trim() && documentReady && birthReady && registerDraft.telefone.trim();
  const passwordStepReady = registerDraft.senha.length >= 10 && registerDraft.senha === registerDraft.confirmarSenha;
  const addressStepReady = registerDraft.cep.trim() && registerDraft.uf.trim() && registerDraft.municipio.trim() && registerDraft.rua.trim() && registerDraft.bairro.trim() && registerDraft.numero.trim();
  const registerButtonDisabled = loading || (registerStep === 1 ? !personalStepReady : registerStep === 2 ? !passwordStepReady : !addressStepReady);

  useEffect(() => {
    if (sessionNotice) {
      setStatus({ type: "warning", message: sessionNotice });
    }
  }, [sessionNotice]);

  useEffect(() => {
    if (mode !== "login" || loginExpanded) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % AUTH_SLIDES.length);
    }, 3800);

    return () => window.clearInterval(timer);
  }, [mode, loginExpanded]);

  const openLogin = () => {
    setMode("login");
    setLoginExpanded(true);
    setShowRegisterTerms(false);
    setShowPassword(false);
    setStatus(null);
  };

  const openRegister = () => {
    setMode("register");
    setLoginExpanded(false);
    setRegisterStep(1);
    setShowRegisterTerms(true);
    setTermsGateChecked(false);
    setAccepted(false);
    setShowPassword(false);
    setStatus(null);
  };

  const acceptRegisterTerms = () => {
    setAccepted(true);
    setShowRegisterTerms(false);
    setStatus(null);
  };

  const advanceRegister = () => {
    setStatus(null);
    if (registerStep === 1 && !personalStepReady) {
      setStatus({ type: "error", message: "Preencha seus dados pessoais para avançar." });
      return;
    }
    if (registerStep === 2 && !passwordStepReady) {
      setStatus({ type: "error", message: "Crie uma senha forte e confirme corretamente." });
      return;
    }
    if (registerStep < 3) {
      setRegisterStep((current) => current + 1);
    }
  };

  const register = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await api.cadastrar({
        email: registerDraft.email,
        nomeExibicao: registerDraft.nomeExibicao,
        senha: registerDraft.senha,
        documento: onlyDigits(registerDraft.documento),
        telefone: onlyDigits(registerDraft.telefone),
        tipoUsuario: registerDraft.tipoUsuario,
        turnstileToken: "sandbox-token",
        aceiteTermos: accepted,
        ipOrigem: "127.0.0.1",
      });
      setOtpSent(response);
      setOtpDraft({
        codigoEmail: response.canalEmailSandbox || "",
        codigoTelefone: response.canalTelefoneSandbox || "",
      });
      setStatus({
        type: "success",
        message: response.otpSandboxDisponivel
          ? "Cadastro criado com sucesso. Os codigos de verificacao foram liberados apenas neste ambiente de teste."
          : "Cadastro criado com sucesso. Informe os codigos recebidos para concluir a verificacao.",
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loginWithCredentials = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const login = await api.login(loginDraft);
      const authSession = await hydrateAuthSession(login, { email: loginDraft.email });
      onAuthenticated(authSession);
      setStatus({ type: "success", message: "Login realizado com sucesso neste dispositivo." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const validateOtpAndLogin = async () => {
    if (!otpSent) return;
    setLoading(true);
    setStatus(null);
    try {
      await api.verificarOtp(otpSent.usuarioId, {
        codigoEmail: otpDraft.codigoEmail,
        codigoTelefone: otpDraft.codigoTelefone,
      });
      const login = await api.login({
        email: registerDraft.email,
        senha: registerDraft.senha,
      });
      const authSession = await hydrateAuthSession(login, {
        nomeExibicao: registerDraft.nomeExibicao,
        email: registerDraft.email,
      });
      onAuthenticated(authSession);
      setVerified(true);
      setStatus({
        type: "success",
        message: "Conta verificada com sucesso. Seu acesso foi liberado e o cadastro segue para validacao complementar.",
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="screen auth-screen">
      <section className={`auth-shell ${mode === "register" ? "register-shell" : ""}`}>
        <header className="auth-hero">
          {mode === "register" ? (
            <span className="step-pill">{showRegisterTerms ? "Obrigatório" : `Etapa ${registerStep} de 3`}</span>
          ) : (
            <div className="auth-hero-mark"><KeyRound size={20} /></div>
          )}
          <h1>{mode === "register" ? showRegisterTerms ? "Termos de uso" : registerStep === 1 ? "Crie seu acesso" : registerStep === 2 ? "Crie sua senha" : "Seu endereço" : "Entrar"}</h1>
          <p>
            {mode === "login"
              ? "Acesso seguro com sessão lembrada neste dispositivo."
              : showRegisterTerms
                ? "Antes de criar sua conta, leia e aceite as regras principais da plataforma."
                : registerStep === 1
                  ? "Informe seus dados pessoais para criar seu acesso."
                  : registerStep === 2
                    ? "Crie sua senha com no mínimo 10 caracteres."
                    : "Informe seu endereço completo para finalizar seu cadastro."}
          </p>
        </header>

        {mode === "login" && !loginExpanded ? (
          <section className="auth-entry-card auth-showcase-card">
            <div className="auth-showcase-media">
              {AUTH_SLIDES.map((slide, index) => (
                <article
                  key={slide.id}
                  className={`auth-slide ${index === activeSlide ? "active" : ""}`}
                  aria-hidden={index === activeSlide ? "false" : "true"}
                >
                  <img src={slide.image} alt="" />
                  <div className="auth-showcase-copy">
                    <span>{slide.eyebrow}</span>
                    <h2>{slide.title}</h2>
                    <p>{slide.description}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="auth-slide-indicators" aria-label="Destaques do aplicativo">
              {AUTH_SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  className={index === activeSlide ? "active" : ""}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Mostrar slide ${index + 1}`}
                />
              ))}
            </div>

            <div className="auth-showcase-actions">
              <button className="secondary-action auth-outline-button" onClick={openLogin}>
                Já tem conta? Acesse
              </button>
              <button className="primary-action auth-main-button auth-stack-button" onClick={openRegister}>
                Criar conta gratuita
              </button>
            </div>

            {DEMO_LOGIN_EMAIL ? <div className="auth-helper-note">Acesso de demonstracao disponivel neste ambiente de teste.</div> : null}
          </section>
        ) : (
          <>
            {mode === "register" ? (
              <button className="text-link-button auth-back-link" onClick={openLogin}>
                Já tenho conta
              </button>
            ) : (
              <button className="text-link-button auth-back-link" onClick={() => setLoginExpanded(false)}>
                Voltar
              </button>
            )}

            {mode === "register" && showRegisterTerms ? (
              <section className="register-terms-screen">
                <div className="register-terms-card">
                  <div>
                    <strong>Uso seguro da plataforma</strong>
                    <span>Você concorda em informar dados verdadeiros e manter sua conta protegida.</span>
                  </div>
                  <div>
                    <strong>Pagamentos e garantias</strong>
                    <span>Cartão e Pix no app seguem com garantia. Pagamento em dinheiro no local tem regras próprias e menor cobertura.</span>
                  </div>
                  <div>
                    <strong>Privacidade e dados</strong>
                    <span>Usamos documento, telefone, localização e imagens apenas para validação, segurança, auditoria e execução do serviço.</span>
                  </div>
                  <div>
                    <strong>Conduta e responsabilidade</strong>
                    <span>Fraudes, abuso, tentativa de burlar pagamentos ou uso indevido podem bloquear a conta.</span>
                  </div>
                </div>

                <label className="terms-panel auth-terms-panel register-terms-accept">
                  <input type="checkbox" checked={termsGateChecked} onChange={(event) => setTermsGateChecked(event.target.checked)} />
                  <span>
                    Li e aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong>. Estou ciente de que o aceite será registrado com data, IP e versão jurídica vigente.
                  </span>
                </label>

                <button className="primary-action auth-main-button native-register-action" disabled={!termsGateChecked} onClick={acceptRegisterTerms}>
                  Aceitar e continuar
                </button>
              </section>
            ) : (
            <section className={mode === "register" ? "auth-step-card" : "kyc-card auth-card"}>
              {mode === "login" ? (
                <div className="form-stack auth-form-stack">
                  <label>
                    E-mail
                    <input
                      type="email"
                      autoComplete="email"
                      value={loginDraft.email}
                      onChange={(event) => setLoginDraft((current) => ({ ...current, email: event.target.value.trim() }))}
                    />
                  </label>
                  <label>
                    Senha
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={loginDraft.senha}
                      onChange={(event) => setLoginDraft((current) => ({ ...current, senha: event.target.value }))}
                    />
                  </label>
                  {DEMO_LOGIN_EMAIL ? (
                    <button
                      type="button"
                      className="text-link-button auth-demo-fill"
                      onClick={() => setLoginDraft({ email: DEMO_LOGIN_EMAIL, senha: "FreeDemo@2026" })}
                    >
                      Preencher acesso de teste
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  {registerStep === 1 ? (
                    <div className="form-stack auth-form-stack native-form-stack">
                      <label>Nome completo*<input value={registerDraft.nomeExibicao} autoComplete="name" onChange={(event) => setRegisterDraft((current) => ({ ...current, nomeExibicao: event.target.value.slice(0, 60) }))} /></label>
                      <label>Email*<input type="email" autoComplete="email" value={registerDraft.email} onChange={(event) => setRegisterDraft((current) => ({ ...current, email: event.target.value.trim() }))} /></label>
                      <label>CPF*<input inputMode="numeric" autoComplete="off" value={registerDraft.documento} onChange={(event) => setRegisterDraft((current) => ({ ...current, documento: formatCpf(event.target.value) }))} /></label>
                      <label>Data de nascimento*<input inputMode="numeric" autoComplete="bday" value={registerDraft.nascimento} onChange={(event) => setRegisterDraft((current) => ({ ...current, nascimento: formatDate(event.target.value) }))} /></label>
                      <label>Celular*<input inputMode="tel" autoComplete="tel" value={registerDraft.telefone} onChange={(event) => setRegisterDraft((current) => ({ ...current, telefone: formatPhone(event.target.value) }))} /></label>
                    </div>
                  ) : null}

                  {registerStep === 2 ? (
                    <div className="form-stack auth-form-stack native-form-stack">
                      <label className="password-field">Senha<input type={showPassword ? "text" : "password"} autoComplete="new-password" value={registerDraft.senha} onChange={(event) => setRegisterDraft((current) => ({ ...current, senha: event.target.value }))} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={24} /> : <Eye size={24} />}</button></label>
                      <label className="password-field">Confirmar senha<input type={showPassword ? "text" : "password"} autoComplete="new-password" value={registerDraft.confirmarSenha} onChange={(event) => setRegisterDraft((current) => ({ ...current, confirmarSenha: event.target.value }))} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={24} /> : <Eye size={24} />}</button></label>
                    </div>
                  ) : null}

                  {registerStep === 3 ? (
                    <div className="form-stack auth-form-stack native-form-stack">
                      <label>CEP*<input inputMode="numeric" value={registerDraft.cep} onChange={(event) => setRegisterDraft((current) => ({ ...current, cep: formatCep(event.target.value) }))} /></label>
                      <div className="native-double-grid">
                        <label>UF*<input value={registerDraft.uf} onChange={(event) => setRegisterDraft((current) => ({ ...current, uf: event.target.value.toUpperCase().slice(0, 2) }))} /></label>
                        <label>Município*<input value={registerDraft.municipio} onChange={(event) => setRegisterDraft((current) => ({ ...current, municipio: event.target.value }))} /></label>
                      </div>
                      <label>Rua*<input value={registerDraft.rua} onChange={(event) => setRegisterDraft((current) => ({ ...current, rua: event.target.value }))} /></label>
                      <div className="native-double-grid">
                        <label>Bairro*<input value={registerDraft.bairro} onChange={(event) => setRegisterDraft((current) => ({ ...current, bairro: event.target.value }))} /></label>
                        <label>Número*<input inputMode="numeric" value={registerDraft.numero} onChange={(event) => setRegisterDraft((current) => ({ ...current, numero: event.target.value.replace(/[^\dA-Za-z/-]/g, "").slice(0, 10) }))} /></label>
                      </div>
                      <label>Complemento<input value={registerDraft.complemento} onChange={(event) => setRegisterDraft((current) => ({ ...current, complemento: event.target.value }))} /></label>
                    </div>
                  ) : null}
                </>
              )}
            </section>
            )}

            {mode === "login" ? (
              <>
                <button className="primary-action auth-main-button" disabled={!loginDraft.email || !loginDraft.senha || loading} onClick={loginWithCredentials}>
                  {loading ? "Entrando..." : "Entrar"}
                </button>
                {DEMO_LOGIN_EMAIL ? (
                  <div className="auth-helper-note">
                    Conta de teste disponível neste ambiente.
                  </div>
                ) : null}
                <button className="text-link-button auth-secondary-link" onClick={openRegister}>
                  Ainda não tem cadastro? Criar conta
                </button>
              </>
            ) : !showRegisterTerms ? (
              <button
                className="primary-action auth-main-button native-register-action"
                disabled={registerButtonDisabled}
                onClick={registerStep === 3 ? register : advanceRegister}
              >
                {loading ? "Validando..." : registerStep === 3 ? "Concluir" : "Avançar"}
              </button>
            ) : null}
          </>
        )}

        {mode === "register" && otpSent ? (
        <section className="otp-panel">
          <div>
            <Mail size={18} />
            <strong>Email</strong>
            <span>{otpSent.emailDestinoMascarado}</span>
            {otpSent.otpSandboxDisponivel ? <small>Código visível apenas no sandbox</small> : <small>Digite o código recebido</small>}
          </div>
          <div>
            <Smartphone size={18} />
            <strong>Telefone</strong>
            <span>{otpSent.telefoneDestinoMascarado}</span>
            {otpSent.otpSandboxDisponivel ? <small>Código visível apenas no sandbox</small> : <small>Digite o código recebido</small>}
          </div>
          <label className="otp-input-card">
            Codigo do email
            <input
              inputMode="numeric"
              maxLength={6}
              value={otpDraft.codigoEmail}
              onChange={(event) => setOtpDraft((current) => ({ ...current, codigoEmail: event.target.value.replace(/\D/g, "").slice(0, 6) }))}
            />
          </label>
          <label className="otp-input-card">
            Codigo do telefone
            <input
              inputMode="numeric"
              maxLength={6}
              value={otpDraft.codigoTelefone}
              onChange={(event) => setOtpDraft((current) => ({ ...current, codigoTelefone: event.target.value.replace(/\D/g, "").slice(0, 6) }))}
            />
          </label>
          <div className="otp-status-card">
            <strong>Modo OTP</strong>
            <span>{otpSent.modoOtp === "sandbox" ? "Sandbox controlado" : "Entrega externa"}</span>
            <small>Expira em {otpSent.otpExpiraEm ? formatAcceptedDate(otpSent.otpExpiraEm) : "breve"}</small>
          </div>
          <button onClick={validateOtpAndLogin} disabled={loading}>
            <CheckCircle2 size={18} />
            Validar códigos
          </button>
        </section>
        ) : null}

        <StatusMessage state={status} />

        {verified ? (
          <section className="inline-result success">
            <Check size={17} />
            Conta autenticada. OTP validado e cadastro encaminhado para análise KYC/KYB antes da liberação total de operações sensíveis.
          </section>
        ) : null}
      </section>
    </main>
  );
}

function HomeScreen({
  auth,
  setPayment,
  onSelectProfessional,
  onOpenQuotes,
  onOpenProfile,
  onOpenProfileSection,
  onOpenAgenda,
  categorias,
  categoriasLoading,
  categoriasStatus,
  profissionais,
  profissionaisLoading,
  profissionaisStatus,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
}) {
  const [status, setStatus] = useState(null);
  const categoryNames = useMemo(() => ["Todos", ...categorias.map((item) => item.nome)], [categorias]);
  const visibleCategories = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return categorias
      .filter((category) => selectedCategory === "Todos" || category.nome === selectedCategory)
      .map((category) => {
        if (!normalizedQuery) {
          return category;
        }

        const matchesCategory = category.nome.toLowerCase().includes(normalizedQuery);
        const matchedSubcategories = category.subcategorias.filter((item) => item.toLowerCase().includes(normalizedQuery));

        if (!matchesCategory && matchedSubcategories.length === 0) {
          return null;
        }

        return {
          ...category,
          subcategorias: matchesCategory ? category.subcategorias : matchedSubcategories,
        };
      })
      .filter(Boolean);
  }, [categorias, searchTerm, selectedCategory]);
  const visibleProfessionals = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return profissionais.filter((item) => {
      const matchesCategory = selectedCategory === "Todos" || item.categoria === selectedCategory;
      const haystack = [item.nomeExibicao, item.subcategoria, item.categoria, item.descricaoCurta, item.bairro, item.cidade]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [profissionais, searchTerm, selectedCategory]);

  return (
    <main className="screen native-screen">
      <section className="native-hero compact">
        <span className="statusbar-space" />
        <h1>Inicio</h1>
      </section>

      <section className="native-sheet home-native-sheet">
        <h2>Para começar, finalize as etapas abaixo para aprovarmos o seu cadastro:</h2>

        <button className="approval-card" onClick={() => onOpenProfileSection("documents")}>
          <div>
            <strong>1. Envio do Documento</strong>
            <span>
              <Clock3 size={16} />
              Envio pendente
            </span>
          </div>
          <ChevronDown size={26} />
        </button>

        <button className="approval-card" onClick={onOpenQuotes}>
          <div>
            <strong>2. Publicar primeira oferta</strong>
            <small>Receba propostas e teste o fluxo de negociação.</small>
          </div>
          <ChevronRight size={24} />
        </button>

        {auth?.contaDemo ? (
          <section className="inline-result warning">
            <ShieldAlert size={16} />
            Conta demo ativa. A navegação está liberada para validação visual.
          </section>
        ) : null}

        <section className="help-card">
          <div>
            <strong>Ajuda</strong>
            <p>Ficou com alguma dúvida? Estamos aqui para esclarecê-las.</p>
            <button onClick={onOpenProfile}>
              Saber mais <ChevronRight size={17} />
            </button>
          </div>
          <div className="help-illustration">
            <CircleHelp size={64} />
          </div>
        </section>

        <section className="quick-offer-strip">
          <strong>Atalhos</strong>
          <div>
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  setPayment(method.id);
                  setStatus({ type: "success", message: `${method.title} definido como forma principal para o próximo checkout.` });
                }}
              >
                {method.title}
              </button>
            ))}
          </div>
        </section>

        <button className="approval-card" onClick={onOpenAgenda}>
          <div>
            <strong>3. Conferir agenda de testes</strong>
            <small>Veja datas, disponibilidade e o fluxo de atendimento no app.</small>
          </div>
          <ChevronRight size={24} />
        </button>

        <StatusMessage state={status} />
      </section>
    </main>
  );
}

function formatMovementDate(value) {
  if (!value) {
    return "Agora";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAcceptedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function AgendaScreen({ auth, onOpenQuotes }) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6, 1));
  const [selectedDay, setSelectedDay] = useState(9);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(currentMonth);

  return (
    <main className="screen native-screen">
      <section className="native-hero compact">
        <span className="statusbar-space" />
        <h1>Agenda</h1>
      </section>
      <section className="native-sheet agenda-sheet">
        <section className="native-alert">
          <Hourglass size={21} />
          <span>
            Aguarde! Estamos validando o seu cadastro. Para começar a receber ofertas é necessário ter o cadastro aprovado.
          </span>
        </section>

        <section className="calendar-card">
          <div className="calendar-head">
            <button
              aria-label="Mês anterior"
              onClick={() => setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              <ChevronRight size={26} className="flip-icon" />
            </button>
            <strong>{monthLabel}</strong>
            <button
              aria-label="Próximo mês"
              onClick={() => setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              <ChevronRight size={26} />
            </button>
          </div>
          <div className="calendar-grid week-days">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((day) => (
              <button key={day} className={day === selectedDay ? "selected" : day < 6 ? "muted" : ""} onClick={() => setSelectedDay(day)}>
                {day}
              </button>
            ))}
          </div>
        </section>

        <p className="native-empty-copy">
          {selectedDay
            ? `Data selecionada: ${String(selectedDay).padStart(2, "0")}/${String(currentMonth.getMonth() + 1).padStart(2, "0")}/${currentMonth.getFullYear()}.`
            : "Escolha uma data para conferir os atendimentos agendados."}
        </p>
        <section className="quick-offer-strip wallet-action-strip">
          <strong>Próximo passo</strong>
          <div>
            <button onClick={onOpenQuotes}>Ver ofertas</button>
            <button onClick={() => setSelectedDay(9)}>Hoje</button>
          </div>
        </section>
        {auth?.contaDemo ? <StatusMessage state={{ type: "warning", message: "Conta demo ativa para navegação visual." }} /> : null}
      </section>
    </main>
  );
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState("home");
  const [payment, setPayment] = useState("CARTAO");
  const [auth, setAuth] = useState(null);
  const [projetoAtual, setProjetoAtual] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [categoriasLoading, setCategoriasLoading] = useState(false);
  const [categoriasStatus, setCategoriasStatus] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [profissionaisLoading, setProfissionaisLoading] = useState(false);
  const [profissionaisStatus, setProfissionaisStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [versaoStatus, setVersaoStatus] = useState({ type: "", message: "Validando compatibilidade do app com a API." });
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [dismissedVersionNotice, setDismissedVersionNotice] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalCheckbox, setLegalCheckbox] = useState(false);
  const [legalAcceptedAt, setLegalAcceptedAt] = useState(null);
  const [profileSection, setProfileSection] = useState("profile");
  const [profileSettings, setProfileSettings] = useState(createProfileSettingsSeed(null));
  const [selectedService, setSelectedService] = useState({
    title: serviceOrder.title,
    description: "Instalar chuveiro 220V com validação de garantia e segurança operacional.",
    date: serviceOrder.date,
    time: serviceOrder.time,
    location: serviceOrder.location,
    neighborhood: serviceOrder.neighborhood,
    fullLocation: "Rua validada e liberada após confirmação mútua.",
    addressReleased: false,
    clienteConfirmou: false,
    prestadorConfirmou: false,
    value: serviceOrder.value,
    professionalName: professional.name,
    professionalRole: professional.role,
    professionalInitials: professional.initials,
    professionalId: "22222222-2222-2222-2222-222222222222",
  });
  const [quoteFlow, setQuoteFlow] = useState({
    draft: DEFAULT_QUOTE_DRAFT,
    solicitation: null,
    proposals: [],
    loading: false,
  });
  const [negotiationFlow, setNegotiationFlow] = useState(DEFAULT_NEGOTIATION_FLOW);

  useEffect(() => {
    let active = true;

    loadSession()
      .then((session) => {
        if (!active || !session) {
          return;
        }

        setActiveScreen(session.activeScreen || "home");
        setPayment(session.payment || "CARTAO");
        if (isAuthSessionValid(session.auth)) {
          setAuth(session.auth || null);
        } else {
          setAuth(null);
          if (session.auth) {
            setAuthNotice("Sua sessao expirou neste dispositivo. Entre novamente para continuar.");
          }
        }
        setProjetoAtual(session.projetoAtual || null);
        setSelectedService((current) => ({
          ...current,
          ...(session.selectedService || {}),
        }));
        const savedQuoteFlow = session.quoteFlow || {};
        const hasLegacySolicitation = savedQuoteFlow?.solicitation && !savedQuoteFlow?.solicitation?.tokenAcesso;
        setQuoteFlow((current) => ({
          ...current,
          ...savedQuoteFlow,
          solicitation: hasLegacySolicitation ? null : savedQuoteFlow.solicitation || null,
          proposals: hasLegacySolicitation ? [] : savedQuoteFlow.proposals || [],
          loading: false,
        }));
        setNegotiationFlow((current) => ({
          ...current,
          ...(session.negotiationFlow || {}),
        }));
        setProfileSettings((current) => ({
          ...current,
          ...(session.profileSettings || {}),
        }));
        setLegalAccepted(session.legalConsent?.version === LEGAL_VERSION);
        setLegalAcceptedAt(session.legalConsent?.version === LEGAL_VERSION ? session.legalConsent.acceptedAt : null);
        setDismissedVersionNotice(session.versionNotice?.dismissedForVersion || "");
      })
      .finally(() => {
        if (active) {
          setSessionReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    saveSession({
      activeScreen,
      payment,
      auth,
      projetoAtual,
      selectedService,
      quoteFlow: {
        draft: quoteFlow.draft,
        solicitation: quoteFlow.solicitation,
        proposals: quoteFlow.proposals,
      },
      negotiationFlow,
      profileSettings,
      versionNotice: {
        dismissedForVersion: dismissedVersionNotice,
      },
      legalConsent: legalAccepted
        ? {
            acceptedAt: legalAcceptedAt || new Date().toISOString(),
            version: LEGAL_VERSION,
          }
        : null,
    });
  }, [activeScreen, auth, dismissedVersionNotice, legalAccepted, legalAcceptedAt, negotiationFlow, payment, profileSettings, projetoAtual, quoteFlow, selectedService, sessionReady]);

  useEffect(() => {
    if (!auth?.usuarioId) {
      return;
    }

    setProfileSettings((current) => {
      if (current.profileOwnerId === auth.usuarioId) {
        return {
          ...current,
          nomeExibicao: current.nomeExibicao || auth.nomeExibicao || "",
          emailContato: current.emailContato || auth.email || "",
          categoriaPrincipal: current.categoriaPrincipal || (auth.tipoUsuario === "CLIENTE" ? "Cliente" : "Profissional autônomo"),
        };
      }

      return createProfileSettingsSeed(auth);
    });
  }, [auth]);

  useEffect(() => {
    let active = true;
    setCategoriasLoading(true);
    setCategoriasStatus(null);

    api
      .listarCategorias()
      .then((response) => {
        if (!active) {
          return;
        }

        setCategorias(response);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setCategorias([]);
        setCategoriasStatus({ type: "error", message: `Nao foi possivel carregar as categorias agora. ${error.message}` });
      })
      .finally(() => {
        if (active) {
          setCategoriasLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setProfissionaisLoading(true);
    setProfissionaisStatus(null);

    api
      .listarProfissionais()
      .then((response) => {
        if (!active) {
          return;
        }

        setProfissionais(response);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setProfissionais([]);
        setProfissionaisStatus({ type: "error", message: `Nao foi possivel carregar os profissionais agora. ${error.message}` });
      })
      .finally(() => {
        if (active) {
          setProfissionaisLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    api
      .checarVersao({
        plataforma: "web",
        versaoInstalada: APP_VERSION,
      })
      .then((response) => {
        if (!active) {
          return;
        }

        setVersaoStatus({
          type: response.compativel ? "success" : "warning",
          message: `${response.mensagem}. Versao instalada ${APP_VERSION} e versao minima ${response.versaoMinima}.`,
        });
        if (dismissedVersionNotice !== APP_VERSION) {
          setShowVersionModal(true);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setVersaoStatus({
          type: "error",
          message: `Nao foi possivel validar a versao do aplicativo agora. ${error.message}`,
        });
        if (dismissedVersionNotice !== APP_VERSION) {
          setShowVersionModal(true);
        }
      });

    return () => {
      active = false;
    };
  }, [dismissedVersionNotice]);

  const closeVersionModal = () => {
    setDismissedVersionNotice(APP_VERSION);
    setShowVersionModal(false);
  };

  const resetSession = async () => {
    setAuth(null);
    setAuthNotice("");
    setProjetoAtual(null);
    setActiveScreen("home");
    setPayment("CARTAO");
    await clearSession();
  };

  const selectPayment = (methodId) => {
    if (!legalAccepted) {
      return;
    }

    setPayment(methodId);
    setActiveScreen("checkout");
  };

  const selectProfessional = (item) => {
    if (!legalAccepted) {
      return;
    }

    const nextService = {
      title: item.subcategoria,
      description: item.descricaoCurta,
      date: serviceOrder.date,
      time: serviceOrder.time,
      location: `Regiao aproximada: ${item.bairro} - ${item.cidade}`,
      fullLocation: `Endereço completo em ${item.bairro} - ${item.cidade}, liberado somente após confirmação mútua.`,
      neighborhood: `${item.cidade} - ${item.bairro}`,
      addressReleased: false,
      clienteConfirmou: false,
      prestadorConfirmou: false,
      value: Number(item.precoInicial),
      professionalName: item.nomeExibicao,
      professionalRole: item.subcategoria,
      professionalInitials: item.nomeExibicao
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0] || "")
        .join("")
        .toUpperCase(),
      professionalId: item.id,
    };
    setSelectedService(nextService);
    setNegotiationFlow(createNegotiationSeed(nextService));
    setActiveScreen("negotiation");
  };

  const acceptQuoteProposal = (accepted) => {
    const nextService = {
      title: accepted.subcategoria,
      description: accepted.descricao,
      date: serviceOrder.date,
      time: serviceOrder.time,
      location: `Regiao aproximada: ${accepted.bairro} - ${accepted.cidade}`,
      fullLocation: `Endereço completo em ${accepted.bairro} - ${accepted.cidade}, liberado somente após confirmação mútua.`,
      neighborhood: `${accepted.cidade} - ${accepted.bairro}`,
      addressReleased: false,
      clienteConfirmou: false,
      prestadorConfirmou: false,
      value: Number(accepted.valor),
      professionalName: accepted.nomeProfissional,
      professionalRole: accepted.subcategoria,
      professionalInitials: accepted.nomeProfissional
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0] || "")
        .join("")
        .toUpperCase(),
      professionalId: accepted.profissionalId,
    };
    setQuoteFlow({
      draft: DEFAULT_QUOTE_DRAFT,
      solicitation: null,
      proposals: [],
      loading: false,
    });
    setSelectedService(nextService);
    setNegotiationFlow(createNegotiationSeed(nextService));
    setActiveScreen("negotiation");
  };

  const confirmAgreement = ({ clienteConfirmou, prestadorConfirmou }) => {
    setSelectedService((current) => ({
      ...current,
      clienteConfirmou,
      prestadorConfirmou,
      addressReleased: clienteConfirmou && prestadorConfirmou,
      location: clienteConfirmou && prestadorConfirmou ? current.fullLocation : current.location,
    }));
    setActiveScreen("checkout");
  };

  const acceptLegalTerms = () => {
    setLegalAccepted(true);
    setLegalAcceptedAt(new Date().toISOString());
    setLegalCheckbox(false);
  };

  const authWithActions = auth
    ? {
        ...auth,
        logout: resetSession,
      }
    : null;

  const openProfileSection = (section) => {
    setProfileSection(section);
    setActiveScreen("profile");
  };

  if (!sessionReady) {
    return (
      <div className="app-shell">
        <div className="phone-frame">
          <main className="screen loading-screen">
            <div className="empty-state">
              <Clock3 size={22} />
              <strong>Preparando aplicativo</strong>
              <span>Restaurando sua sessão de teste com segurança.</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {!auth ? (
          <AuthScreen
            sessionNotice={authNotice}
            onAuthenticated={(session) => {
              setAuth(session);
              setAuthNotice("");
              setActiveScreen("home");
            }}
          />
        ) : null}
        {auth && activeScreen === "home" ? (
          <HomeScreen
            auth={authWithActions}
            setPayment={selectPayment}
            onSelectProfessional={selectProfessional}
            onOpenQuotes={() => setActiveScreen("quotes")}
            onOpenProfile={() => openProfileSection("help")}
            onOpenProfileSection={openProfileSection}
            onOpenAgenda={() => setActiveScreen("agenda")}
            categorias={categorias}
            categoriasLoading={categoriasLoading}
            categoriasStatus={categoriasStatus}
            profissionais={profissionais}
            profissionaisLoading={profissionaisLoading}
            profissionaisStatus={profissionaisStatus}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        ) : null}
        {auth && activeScreen === "quotes" ? (
          <QuoteRequestScreen categorias={categorias} quoteFlow={quoteFlow} setQuoteFlow={setQuoteFlow} onAcceptProposal={acceptQuoteProposal} />
        ) : null}
        {auth && activeScreen === "negotiation" ? (
          <NegotiationScreen
            selectedService={selectedService}
            negotiationFlow={negotiationFlow}
            setNegotiationFlow={setNegotiationFlow}
            onBack={() => setActiveScreen("home")}
            onContinue={() => setActiveScreen("agreement")}
          />
        ) : null}
        {auth && activeScreen === "agreement" ? (
          <AgreementScreen
            selectedService={selectedService}
            onBack={() => setActiveScreen("negotiation")}
            onAgreementConfirmed={confirmAgreement}
          />
        ) : null}
        {auth && activeScreen === "checkout" ? (
          <CheckoutScreen
            payment={payment}
            setPayment={setPayment}
            auth={authWithActions}
            onProjectCreated={setProjetoAtual}
            onOpenCompletion={() => setActiveScreen("complete")}
            selectedService={selectedService}
          />
        ) : null}
        {auth && activeScreen === "complete" ? (
          <CompleteScreen auth={authWithActions} projetoAtual={projetoAtual} onProjectUpdated={setProjetoAtual} selectedService={selectedService} />
        ) : null}
        {auth && activeScreen === "agenda" ? (
          <AgendaScreen auth={authWithActions} onOpenQuotes={() => setActiveScreen("quotes")} />
        ) : null}
        {auth && activeScreen === "wallet" ? (
          <WalletScreen auth={authWithActions} />
        ) : null}
        {auth && activeScreen === "profile" ? (
          <ProfileScreen
            auth={authWithActions}
            profileSettings={profileSettings}
            setProfileSettings={setProfileSettings}
            versaoStatus={versaoStatus}
            legalAcceptedAt={legalAcceptedAt}
            activeSection={profileSection}
            setActiveSection={setProfileSection}
          />
        ) : null}
        {auth ? <BottomNav active={activeScreen} onChange={setActiveScreen} /> : null}
        {auth && !legalAccepted ? (
          <LegalConsentModal accepted={legalCheckbox} setAccepted={setLegalCheckbox} onAccept={acceptLegalTerms} />
        ) : null}
        {auth && legalAccepted && showVersionModal ? (
          <VersionNoticeModal status={versaoStatus} onClose={closeVersionModal} />
        ) : null}
      </div>
    </div>
  );
}
