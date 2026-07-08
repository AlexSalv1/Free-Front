import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  Home,
  KeyRound,
  Landmark,
  Mail,
  MapPin,
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
import { paymentMethods, professional, serviceOrder } from "./data/mockData.js";
import { captureProfileImage, captureServiceImage } from "./utils/camera.js";
import { buildLocationProofLabel, captureCurrentLocation, formatLocationLabel } from "./utils/location.js";
import { clearSession, loadSession, saveSession } from "./utils/sessionStore.js";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const LEGAL_VERSION = import.meta.env.VITE_LEGAL_VERSION || "2026.07";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const ENABLE_OFFLINE_FALLBACK = import.meta.env.VITE_ENABLE_OFFLINE_FALLBACK === "true";
const DEFAULT_QUOTE_DRAFT = {
  titulo: "Preciso de ajuda com instalacao eletrica",
  categoria: "Reformas e Reparos",
  subcategoria: "Eletricista",
  descricao: "Preciso avaliar a instalacao de um chuveiro e possivel ajuste no disjuntor.",
  bairro: "Vila Mariana",
  cidade: "Sao Paulo",
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

function createNegotiationSeed(selectedService) {
  return {
    ...DEFAULT_NEGOTIATION_FLOW,
    paymentAligned: true,
    messages: [
      {
        id: `${selectedService.professionalId}-intro`,
        author: "prestador",
        tone: "neutral",
        text: `Posso atender ${selectedService.title.toLowerCase()} com confirmacao pelo app. Antes da liberacao do endereco, vamos alinhar escopo, janela de atendimento e forma de pagamento.`,
      },
      {
        id: `${selectedService.professionalId}-cliente`,
        author: "cliente",
        tone: "soft",
        text: `Perfeito. A regiao aproximada atende. Quero confirmar o servico em ${selectedService.date} por volta de ${selectedService.time}.`,
      },
    ],
  };
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
        <span className="option-label">Obrigatorio</span>
        <h2 id="legal-consent-title">Aceite de Termos e Privacidade</h2>
        <p>
          Antes de usar recursos com impacto financeiro, validacao de identidade, geolocalizacao, camera ou
          comprovacao de servico, precisamos registrar seu aceite desta versao juridica.
        </p>

        <div className="legal-summary">
          <div>
            <strong>Termos de Uso</strong>
            <span>Define responsabilidades, pagamento, contestacoes e conduta na plataforma.</span>
          </div>
          <div>
            <strong>Politica de Privacidade</strong>
            <span>Explica uso de documento, localizacao, imagens e trilhas de auditoria.</span>
          </div>
          <div>
            <strong>Versao juridica</strong>
            <span>{LEGAL_VERSION}</span>
          </div>
        </div>

        <label className="terms-panel legal-accept-panel">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>
            Li e aceito os <strong>Termos de Uso</strong> e a <strong>Politica de Privacidade</strong> desta versao.
            Estou ciente de que o aceite sera registrado para liberar o uso do app.
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
        <h2 id="version-notice-title">Verificacao de versao</h2>
        <p>{status.message}</p>
        <div className="legal-summary">
          <div>
            <strong>Versao instalada</strong>
            <span>{APP_VERSION}</span>
          </div>
          <div>
            <strong>Status</strong>
            <span>{status.type === "error" ? "Validacao indisponivel" : status.type === "warning" ? "Atencao" : "Compativel"}</span>
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
        <strong>Sessao ativa</strong>
        <span>{auth.nomeExibicao || auth.email || "Prestador autenticado"}</span>
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
          Endereco completo liberado apenas depois da confirmacao do atendimento pelas duas partes.
        </div>
      ) : null}

      <div className="price-row">
        <span>Valor do servico</span>
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
    { id: "checkout", label: "Pedidos", icon: BriefcaseBusiness },
    { id: "complete", label: "Concluir", icon: CheckCircle2 },
    { id: "wallet", label: "Carteira", icon: Wallet },
    { id: "profile", label: "Perfil", icon: UserRound },
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
        <span>{category.subcategorias.length} servicos</span>
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
        <span>Endereco completo so aparece apos confirmacao mutua</span>
        <span>Nota {Number(item.notaMedia).toFixed(1)}</span>
        <strong>A partir de {currency.format(Number(item.precoInicial))}</strong>
      </div>
      <button className="secondary-action" onClick={() => onHire(item)}>
        Selecionar servico
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
        <span>Endereco completo segue bloqueado ate confirmacao mutua</span>
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
  const categoryNames = useMemo(() => categorias.map((item) => item.nome), [categorias]);
  const selectedCategoryData = useMemo(
    () => categorias.find((item) => item.nome === quoteFlow.draft.categoria) || categorias[0] || null,
    [categorias, quoteFlow.draft.categoria],
  );
  const availableSubcategories = selectedCategoryData?.subcategorias || [];

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
      setStatus({ type: "success", message: "Pedido publicado. As propostas iniciais ja estao disponiveis para analise." });
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

  return (
    <main className="screen">
      <AppHeader title="Aberto a Orcamentos" subtitle="Publique a necessidade e compare propostas com seguranca" />

      <section className="kyc-card">
        <div className="completion-heading">
          <IconBox>
            <FileText size={21} />
          </IconBox>
          <div>
            <strong>Pedido do contratante</strong>
            <small>Use apenas regiao aproximada. O endereco completo segue protegido ate a confirmacao mutua.</small>
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
          <label>
            Titulo do servico
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
            Descricao
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
      <button className="primary-action" disabled={!canPublish || quoteFlow.loading} onClick={publicarSolicitacao}>
        {quoteFlow.loading ? "Publicando..." : "Publicar pedido"}
      </button>

      {quoteFlow.solicitation ? (
        <section className="section-block">
          <h3>Propostas recebidas</h3>
          <div className="professional-results">
            {quoteFlow.proposals.map((proposal) => (
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
        bairro: selectedService.neighborhood?.split(" - ")[1] || "Regiao validada",
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
            message: `Nao foi possivel iniciar a negociacao com a API: ${error.message}`,
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
        setStatus({ type: "warning", message: "API de negociacao ainda nao publicada. Fluxo local de teste mantido temporariamente." });
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
      setStatus({ type: "error", message: "Defina data e horario antes de registrar a janela do atendimento." });
      return;
    }

    if (negotiationFlow.offlineMode || !negotiationFlow.id) {
      pushMessage({
        author: "sistema",
        tone: "soft",
        text: `Janela sugerida atualizada para ${negotiationFlow.suggestedDate} as ${negotiationFlow.suggestedTime}. O endereco completo continua bloqueado ate a confirmacao mutua.`,
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
      <AppHeader title="Conversa e Combinacao" subtitle="Alinhe escopo, horario e pagamento antes da confirmacao final" />
      <ServiceCard selectedService={selectedService} />

      <section className="agreement-note">
        <ShieldAlert size={18} />
        <p>Esta etapa compartilha apenas contexto operacional minimo. Rua, numero, telefone e dados sensiveis seguem bloqueados ate a confirmacao mutua.</p>
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
          <button onClick={() => addQuickMessage("Se precisar, posso ajustar a janela de atendimento.")}>Ajustar horario</button>
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
        Ir para confirmacao mutua
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
        setReviewsStatus({ type: "error", message: `Nao foi possivel carregar as avaliacoes publicas: ${error.message}` });
      });

    return () => {
      active = false;
    };
  }, [selectedService.professionalId]);

  return (
    <main className="screen">
      <AppHeader title="Combinar Servico" subtitle="Endereco completo so aparece apos confirmacao mutua" />
      <ServiceCard selectedService={selectedService} />

      <section className="section-block">
        <h3>Reputacao publica</h3>
        <StatusMessage state={reviewsStatus} />
        <section className="settings-card">
          <div className="rating-summary-row">
            <div>
              <strong>{reviewsSummary?.totalAvaliacoes ? Number(reviewsSummary.notaMedia).toFixed(1) : "Novo perfil"}</strong>
              <span>{reviewsSummary?.totalAvaliacoes ? `${reviewsSummary.totalAvaliacoes} avaliacoes liberadas` : "Ainda sem avaliacoes publicas liberadas"}</span>
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
              <span>O profissional aceitou executar o servico nas condicoes combinadas.</span>
            </div>
            <input type="checkbox" checked={prestadorConfirmou} onChange={(event) => setPrestadorConfirmou(event.target.checked)} />
          </label>
        </section>
      </section>

      <section className="agreement-note">
        <ShieldAlert size={18} />
        <p>
          Enquanto uma das confirmacoes estiver pendente, a plataforma exibe apenas regiao aproximada. Rua, numero e
          complemento ficam bloqueados ate a combinacao mutua.
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
        Liberar endereco e continuar
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
      setStatus({ type: "error", message: "Autorize o uso de localizacao antes de validar sua posicao." });
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
      <AppHeader title="Checkout" subtitle="Confirme e pague com seguranca" />
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
              pela qualidade do servico executado fora do aplicativo. Confirmo que li e aceito o termo de renuncia.
            </p>
          </div>
        </section>
      ) : (
        <label className="terms-panel">
          <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
          <span>
            Estou ciente e de acordo com os <strong>Termos de Uso</strong>, <strong>Politica de Privacidade</strong> e
            aceito o compartilhamento dos meus dados de localizacao estritamente para validacao da prestacao do servico
            fisico.
          </span>
        </label>
      )}

      <section className="privacy-panel compact">
        <Shield size={17} />
        <p>
          A localizacao e usada apenas para validar a combinacao e a execucao fisica do servico, respeitando o aceite juridico ja registrado.
        </p>
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <div>
            <strong>Permitir geolocalizacao operacional</strong>
            <span>Necessaria para validar contratacao e conclusao do servico em ambiente real.</span>
          </div>
          <input type="checkbox" checked={locationConsent} onChange={(event) => setLocationConsent(event.target.checked)} />
        </label>
        <button className="secondary-action" disabled={loading} onClick={validarLocalizacao}>
          {loading ? "Validando localizacao..." : locationProof ? "Atualizar localizacao" : "Validar localizacao atual"}
        </button>
        <div className={`inline-result ${locationProof ? "success" : ""}`}>
          {locationProof ? `Localizacao pronta: ${formatLocationLabel(locationProof)}` : "Nenhuma localizacao validada para este checkout."}
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
      setStatus({ type: "success", message: `Localizacao de conclusao validada com precisao aproximada de ${proof.accuracy || 0}m.` });
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
      setStatus({ type: "error", message: "Valide a localizacao atual antes de concluir com token." });
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
      setStatus({ type: "error", message: "Crie um projeto no checkout antes de concluir o servico." });
      return;
    }
    if (!locationProof) {
      setStatus({ type: "error", message: "Valide a localizacao atual antes de concluir com foto." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const imagePayload = await captureServiceImage();
      if (!imagePayload?.base64) {
        setStatus({ type: "error", message: "Captura cancelada. Escolha uma foto para concluir o servico." });
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
      setStatus({ type: "error", message: "Finalize o projeto e mantenha a sessao ativa para avaliar." });
      return;
    }

    if (projetoAtual.status !== "FINALIZADO") {
      setStatus({ type: "error", message: "A avaliacao cega so abre depois da finalizacao do servico." });
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
            ? "Avaliacao registrada e liberada pelo modo cego."
            : response.statusModeracao === "PENDENTE_REVISAO"
              ? "Avaliacao registrada e enviada para moderacao."
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
          <span>Finalize primeiro um checkout para liberar as acoes de conclusao.</span>
        )}
      </section>

      <section className="settings-card">
        <label className="toggle-row">
          <div>
            <strong>Prova de localizacao</strong>
            <span>Valide sua posicao atual antes de concluir o atendimento no app.</span>
          </div>
          <button className="mini-button" onClick={validarLocalizacaoConclusao} disabled={loading}>
            {loading ? "..." : "Validar"}
          </button>
        </label>
        <div className={`inline-result ${locationProof ? "success" : ""}`}>
          {locationProof ? `Conclusao validada em ${buildLocationProofLabel(locationProof)}` : "Localizacao ainda nao validada para esta conclusao."}
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
            <small>Peca ao cliente o codigo de 4 digitos.</small>
          </div>
        </div>
        <input
          className="token-input"
          inputMode="numeric"
          maxLength={4}
          value={token}
          onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="____"
          aria-label="Token de confirmacao"
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

      <span className="option-label">Opcao B - Sem codigo</span>
      <section className="completion-card">
        <div className="completion-heading">
          <IconBox>
            <Camera size={21} />
          </IconBox>
          <div>
            <strong>Concluir sem Codigo</strong>
            <small>Envie uma foto do servico concluido.</small>
          </div>
        </div>
        <button className={`photo-drop ${photoSent ? "done" : ""}`} onClick={concluirComFoto} disabled={loading}>
          <Camera size={28} />
          <strong>{photoSent ? "Foto enviada para analise" : "Tirar foto agora"}</strong>
          <span>{photoSent ? "Cronometro de 48 horas iniciado" : "Enquadre a area onde o servico foi executado"}</span>
        </button>
        {photoPreview ? (
          <div className="photo-preview-card">
            <img src={photoPreview} alt="Comprovacao do servico enviado" />
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
                <span>Envie sua nota sem expor a contraparte antes da liberacao do modo cego.</span>
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
              {reviewSent ? "Avaliacao enviada" : "Enviar avaliacao"}
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
  const [filter, setFilter] = useState("positive");
  const [wallet, setWallet] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

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
      amount: Number(movement.valor),
      type: Number(movement.valor) >= 0 ? "credit" : "debit",
    }));

    if (filter === "debt") {
      return normalized.filter((movement) => movement.type === "debit");
    }

    return normalized;
  }, [filter, wallet]);

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
    <main className="screen">
      <AppHeader title="Carteira" subtitle="Seus recebimentos e taxas" right={<Eye size={20} />} />
      <SessionBanner auth={auth} onReset={auth?.logout} />
      <div className="wallet-tabs">
        <button className={filter === "positive" ? "active" : ""} onClick={() => setFilter("positive")}>
          Saldo positivo
        </button>
        <button className={filter === "debt" ? "active" : ""} onClick={() => setFilter("debt")}>
          Devendo (perto do limite)
        </button>
        <button className={filter === "blocked" ? "active muted" : "muted"} onClick={() => setFilter("blocked")}>
          Conta bloqueada
        </button>
      </div>

      <section className="balance-card">
        <span>Saldo atual</span>
        <strong>{currency.format(Number(wallet?.saldoAtual || 0))}</strong>
        <div className="debt-meter">
          <div>
            <span>Debito por dinheiro</span>
            <strong>
              {currency.format(Number(wallet?.saldoDevedor || 0))} / {currency.format(Number(wallet?.limiteDevedor || 50))}
            </strong>
          </div>
          <meter min="0" max={Number(wallet?.limiteDevedor || 50)} value={Number(wallet?.saldoDevedor || 0)} />
        </div>
        <div className="balance-actions">
          <button disabled={!wallet?.podeSacar || loading} onClick={solicitarSaque}>
            <ArrowDownLeft size={20} />
            {loading ? "Enviando" : "Sacar"}
          </button>
          <button disabled>
            <ChevronDown size={20} />
            Rendimento
          </button>
          <button onClick={recarregarCarteira} disabled={loading}>
            <Clock3 size={20} />
            Extrato
          </button>
        </div>
      </section>

      <section className="section-block">
        <h3>Movimentacoes recentes</h3>
        <StatusMessage state={status} />
        <section className="wallet-rule-panel">
          <ShieldAlert size={17} />
          Saques sao liberados a partir de {currency.format(Number(wallet?.valorMinimoSaque || 50))}. Debitos em dinheiro iguais ou
          acima de {currency.format(Number(wallet?.limiteDevedor || 50))} suspendem novos projetos.
        </section>
        <div className="movement-list">
          {filter === "blocked" ? (
            <div className="empty-state">
              <ShieldAlert size={22} />
              <strong>{wallet?.bloqueada ? "Conta temporariamente bloqueada" : "Nenhum bloqueio ativo"}</strong>
              <span>
                {wallet?.bloqueada
                  ? "Seu saldo devedor atingiu o limite e precisa ser regularizado."
                  : "O limite de saldo devedor esta regular neste momento."}
              </span>
            </div>
          ) : loading && !wallet ? (
            <div className="empty-state">
              <Clock3 size={22} />
              <strong>Carregando carteira</strong>
              <span>Buscando saldo e movimentos reais da API.</span>
            </div>
          ) : !auth?.accessToken ? (
            <div className="empty-state">
              <ShieldAlert size={22} />
              <strong>Login necessario</strong>
              <span>Entre com o cadastro seguro para ver a carteira real.</span>
            </div>
          ) : visibleMovements.length === 0 ? (
            <div className="empty-state">
              <Clock3 size={22} />
              <strong>Sem movimentacoes</strong>
              <span>A carteira ainda nao registrou operacoes para este usuario.</span>
            </div>
          ) : (
            visibleMovements.map((movement) => (
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
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function ProfileScreen({ auth, profileSettings, setProfileSettings, versaoStatus, legalAcceptedAt }) {
  const [draft, setDraft] = useState(profileSettings);
  const [status, setStatus] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

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

  return (
    <main className="screen">
      <AppHeader title="Perfil" subtitle="Dados pessoais e configuracoes do aplicativo" />
      <SessionBanner auth={auth} onReset={auth?.logout} />

      <section className="profile-card">
        <div className="profile-hero">
          <button className="profile-avatar" onClick={handlePhoto} disabled={loadingPhoto} aria-label="Alterar foto de perfil">
            {draft.avatarPreviewUrl ? (
              <img src={draft.avatarPreviewUrl} alt="Foto de perfil" />
            ) : (
              <span>{(draft.nomeExibicao || "RS").slice(0, 2).toUpperCase()}</span>
            )}
          </button>
          <div className="profile-hero-copy">
            <strong>{draft.nomeExibicao || "Seu perfil"}</strong>
            <span>{draft.categoriaPrincipal || "Prestador de servicos"}</span>
            <small>{loadingPhoto ? "Processando foto..." : "Toque na foto para alterar"}</small>
          </div>
        </div>

        <div className="form-stack">
          <label>
            Nome exibido
            <input value={draft.nomeExibicao} onChange={(event) => updateDraft("nomeExibicao", event.target.value.slice(0, 60))} />
          </label>
          <label>
            Categoria principal
            <input
              value={draft.categoriaPrincipal}
              onChange={(event) => updateDraft("categoriaPrincipal", event.target.value.slice(0, 60))}
            />
          </label>
          <label>
            Descricao profissional
            <textarea
              className="multiline-input"
              value={draft.descricao}
              onChange={(event) => updateDraft("descricao", event.target.value.slice(0, 280))}
              placeholder="Conte um pouco sobre sua experiencia, especialidades e atendimento."
            />
          </label>
        </div>
      </section>

      <section className="section-block">
        <h3>Configuracoes comuns</h3>
        <section className="settings-card">
          <label className="toggle-row">
            <div>
              <strong>Notificacoes push</strong>
              <span>Novos pedidos, atualizacoes e alertas importantes.</span>
            </div>
            <input
              type="checkbox"
              checked={draft.notificacoesPush}
              onChange={(event) => updateDraft("notificacoesPush", event.target.checked)}
            />
          </label>
          <label className="toggle-row">
            <div>
              <strong>Notificacoes por email</strong>
              <span>Resumo de movimentacoes e confirmacoes da conta.</span>
            </div>
            <input
              type="checkbox"
              checked={draft.notificacoesEmail}
              onChange={(event) => updateDraft("notificacoesEmail", event.target.checked)}
            />
          </label>
          <label className="toggle-row">
            <div>
              <strong>Modo silencioso</strong>
              <span>Reduz avisos sonoros durante o expediente.</span>
            </div>
            <input
              type="checkbox"
              checked={draft.modoSilencioso}
              onChange={(event) => updateDraft("modoSilencioso", event.target.checked)}
            />
          </label>
          <label className="toggle-row">
            <div>
              <strong>Receber novidades do app</strong>
              <span>Lancamentos, melhorias e dicas de uso.</span>
            </div>
            <input
              type="checkbox"
              checked={draft.receberNovidades}
              onChange={(event) => updateDraft("receberNovidades", event.target.checked)}
            />
          </label>
        </section>
      </section>

      <section className="section-block">
        <h3>Conta e aplicativo</h3>
        <section className="settings-card">
          <div className="settings-row">
            <strong>Conta ativa</strong>
            <span>{auth?.nomeExibicao || auth?.email || "Nao autenticado"}</span>
          </div>
          <div className="settings-row">
            <strong>Versao do app</strong>
            <span>{APP_VERSION}</span>
          </div>
          <div className="settings-row">
            <strong>Compatibilidade</strong>
            <span>{versaoStatus?.message || "Validacao pendente"}</span>
          </div>
          <div className="settings-row">
            <strong>Termos aceitos</strong>
            <span>{legalAcceptedAt ? formatAcceptedDate(legalAcceptedAt) : "Pendente"}</span>
          </div>
          <div className="settings-row">
            <strong>Foto de perfil</strong>
            <span>Salvamos apenas uma versao compactada para evitar arquivos pesados.</span>
          </div>
        </section>
      </section>

      <StatusMessage state={status} />
      <button className="primary-action" onClick={saveProfile}>
        Salvar perfil
      </button>
    </main>
  );
}

function OnboardingScreen({ onAuthenticated }) {
  const [documento, setDocumento] = useState("52998224725");
  const [accepted, setAccepted] = useState(false);
  const [otpSent, setOtpSent] = useState(null);
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [credentials] = useState(() => ({
    email: `rafael.secure.${Date.now()}@example.com`,
    senha: "SenhaForte123",
  }));
  const documentReady = documento.replace(/\D/g, "").length >= 11;

  const register = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await api.cadastrar({
        email: credentials.email,
        nomeExibicao: "Rafael Souza",
        senha: credentials.senha,
        documento,
        telefone: "11988887777",
        tipoUsuario: "FREELANCER",
        turnstileToken: "sandbox-token",
        aceiteTermos: accepted,
        ipOrigem: "127.0.0.1",
      });
      setOtpSent(response);
      setStatus({ type: "success", message: "Cadastro criado em sandbox. Codigos OTP recebidos pelos canais simulados." });
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
        codigoEmail: otpSent.canalEmailSandbox,
        codigoTelefone: otpSent.canalTelefoneSandbox,
      });
      const login = await api.login(credentials);
      onAuthenticated(login);
      setVerified(true);
      setStatus({ type: "success", message: "Conta ativada e token JWT recebido em memoria." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="screen">
      <AppHeader title="Cadastro Seguro" subtitle="KYC, OTP e aceite juridico" />

      <section className="kyc-card">
        <div className="completion-heading">
          <IconBox>
            <UserPlus size={21} />
          </IconBox>
          <div>
            <strong>Dados do prestador</strong>
            <small>Validacao local antes de consultar gateways externos.</small>
          </div>
        </div>

        <div className="form-stack">
          <label>
            Nome
            <input value="Rafael Souza" readOnly />
          </label>
          <label>
            CPF ou CNPJ
            <input value={documento} onChange={(event) => setDocumento(event.target.value)} />
          </label>
          <label>
            Telefone
            <input value="11988887777" readOnly />
          </label>
        </div>

        <div className={`validation-row ${documentReady ? "ok" : ""}`}>
          <FileCheck size={18} />
          <span>{documentReady ? "Documento com formato pronto para validacao" : "Informe CPF ou CNPJ valido"}</span>
        </div>
      </section>

      <label className="terms-panel">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>
          Li os Termos de Uso e a Politica de Privacidade. O aceite gera trilha de auditoria com IP, data do servidor e
          hash SHA-256 da versao juridica vigente.
        </span>
      </label>

      <button className="primary-action" disabled={!documentReady || !accepted || loading} onClick={register}>
        {loading ? "Validando..." : "Gerar OTP de duplo canal"}
      </button>

      {otpSent ? (
        <section className="otp-panel">
          <div>
            <Mail size={18} />
            <strong>Email</strong>
            <span>{otpSent.canalEmailSandbox}</span>
          </div>
          <div>
            <Smartphone size={18} />
            <strong>Telefone</strong>
            <span>{otpSent.canalTelefoneSandbox}</span>
          </div>
          <button onClick={validateOtpAndLogin} disabled={loading}>
            <CheckCircle2 size={18} />
            Validar codigos
          </button>
        </section>
      ) : null}

      <StatusMessage state={status} />

      {verified ? (
        <section className="inline-result success">
          <Check size={17} />
          Conta ativada. Status alterado para ATIVO apos OTP de email e telefone.
        </section>
      ) : null}
    </main>
  );
}

function HomeScreen({
  setPayment,
  onSelectProfessional,
  onOpenQuotes,
  onOpenOnboarding,
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
    <main className="screen">
      <header className="home-top">
        <div>
          <h1>Ola</h1>
          <p>
            <MapPin size={14} />
            {serviceOrder.neighborhood}
          </p>
        </div>
      </header>

      <label className="search-box">
        <Search size={19} />
        <input
          placeholder="Buscar servico ou profissional"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      <div className="category-strip">
        {categoryNames.map((item) => (
          <button key={item} className={item === selectedCategory ? "active" : ""} onClick={() => setSelectedCategory(item)}>
            {item}
          </button>
        ))}
      </div>

      <button className="kyc-shortcut" onClick={onOpenOnboarding}>
        <IconBox>
          <Shield size={20} />
        </IconBox>
        <span>
          <strong>Cadastro com KYC/KYB</strong>
          <small>Validacao anti-bot, documento e OTP de dois canais</small>
        </span>
      </button>

      <button className="kyc-shortcut" onClick={onOpenQuotes}>
        <IconBox>
          <FileText size={20} />
        </IconBox>
        <span>
          <strong>Pedido aberto a orcamentos</strong>
          <small>Publique a necessidade e receba propostas antes de fechar o servico.</small>
        </span>
      </button>

      <section className="info-section">
        <h2>Categorias reais da plataforma</h2>
        <p>Busque por categoria ou subcategoria usando os dados carregados da API.</p>
        <StatusMessage state={categoriasStatus} />
        <div className="category-results">
          {categoriasLoading ? (
            <div className="empty-state compact-state">
              <Clock3 size={20} />
              <strong>Carregando categorias</strong>
              <span>Consultando a API publicada.</span>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="empty-state compact-state">
              <Search size={20} />
              <strong>Nenhum resultado encontrado</strong>
              <span>Ajuste a busca ou troque a categoria selecionada.</span>
            </div>
          ) : (
            visibleCategories.map((category) => (
              <CategoryCard key={category.id} category={category} onSelectSubcategory={setSearchTerm} />
            ))
          )}
        </div>
      </section>

      <section className="info-section">
        <h2>Profissionais disponiveis</h2>
        <p>Selecione um servico real do catalogo publico para seguir ao checkout.</p>
        <StatusMessage state={profissionaisStatus} />
        <div className="professional-results">
          {profissionaisLoading ? (
            <div className="empty-state compact-state">
              <Clock3 size={20} />
              <strong>Carregando vitrine</strong>
              <span>Buscando profissionais publicos da API.</span>
            </div>
          ) : visibleProfessionals.length === 0 ? (
            <div className="empty-state compact-state">
              <Search size={20} />
              <strong>Nenhum profissional encontrado</strong>
              <span>Tente outra categoria ou ajuste a busca.</span>
            </div>
          ) : (
            visibleProfessionals.map((item) => (
              <ProfessionalCard key={item.id} item={item} onHire={onSelectProfessional} />
            ))
          )}
        </div>
      </section>

      <section className="info-section">
        <h2>Como funciona o pagamento</h2>
        <p>Escolha a forma que preferir na hora de contratar.</p>
        <div className="home-payment-list">
          {paymentMethods.map((method) => (
            <PaymentMethod key={method.id} method={method} compact onSelect={() => setPayment(method.id)} />
          ))}
        </div>
      </section>

      <section className="notice-panel">
        <ShieldAlert size={20} />
        <p>
          <strong>Aviso:</strong> ao optar por dinheiro no local, a plataforma cobra uma pequena taxa de servico do
          profissional. Debitos acima de R$ 50,00 suspendem a conta.
        </p>
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
  const [sessionReady, setSessionReady] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalCheckbox, setLegalCheckbox] = useState(false);
  const [legalAcceptedAt, setLegalAcceptedAt] = useState(null);
  const [profileSettings, setProfileSettings] = useState({
    nomeExibicao: "Rafael Souza",
    categoriaPrincipal: "Eletricista Profissional",
    descricao: "Atendimento residencial com foco em instalacoes, reparos e finalizacao segura do servico.",
    notificacoesPush: true,
    notificacoesEmail: true,
    modoSilencioso: false,
    receberNovidades: false,
    avatarBase64: "",
    avatarPreviewUrl: "",
  });
  const [selectedService, setSelectedService] = useState({
    title: serviceOrder.title,
    description: "Instalar chuveiro 220V com validacao de garantia e seguranca operacional.",
    date: serviceOrder.date,
    time: serviceOrder.time,
    location: serviceOrder.location,
    neighborhood: serviceOrder.neighborhood,
    fullLocation: "Rua validada e liberada apos confirmacao mutua.",
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
        setAuth(session.auth || null);
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
      legalConsent: legalAccepted
        ? {
            acceptedAt: legalAcceptedAt || new Date().toISOString(),
            version: LEGAL_VERSION,
          }
        : null,
    });
  }, [activeScreen, auth, legalAccepted, legalAcceptedAt, negotiationFlow, payment, profileSettings, projetoAtual, quoteFlow, selectedService, sessionReady]);

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
        setCategoriasStatus({ type: "error", message: `Nao foi possivel carregar categorias reais: ${error.message}` });
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
        setProfissionaisStatus({ type: "error", message: `Nao foi possivel carregar a vitrine: ${error.message}` });
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
          message: `${response.mensagem}. Instalada ${APP_VERSION} | minima ${response.versaoMinima}.`,
        });
        setShowVersionModal(true);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setVersaoStatus({
          type: "error",
          message: `Nao foi possivel validar a versao do app: ${error.message}`,
        });
        setShowVersionModal(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const resetSession = async () => {
    setAuth(null);
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
      fullLocation: `Endereco completo em ${item.bairro} - ${item.cidade}, liberado somente apos confirmacao mutua.`,
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
      fullLocation: `Endereco completo em ${accepted.bairro} - ${accepted.cidade}, liberado somente apos confirmacao mutua.`,
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

  if (!sessionReady) {
    return (
      <div className="app-shell">
        <div className="phone-frame">
          <main className="screen loading-screen">
            <div className="empty-state">
              <Clock3 size={22} />
              <strong>Preparando aplicativo</strong>
              <span>Restaurando sua sessao de teste com seguranca.</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {activeScreen === "home" ? (
          <HomeScreen
            setPayment={selectPayment}
            onSelectProfessional={selectProfessional}
            onOpenQuotes={() => setActiveScreen("quotes")}
            onOpenOnboarding={() => setActiveScreen("onboarding")}
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
        {activeScreen === "onboarding" ? <OnboardingScreen onAuthenticated={setAuth} /> : null}
        {activeScreen === "quotes" ? (
          <QuoteRequestScreen categorias={categorias} quoteFlow={quoteFlow} setQuoteFlow={setQuoteFlow} onAcceptProposal={acceptQuoteProposal} />
        ) : null}
        {activeScreen === "negotiation" ? (
          <NegotiationScreen
            selectedService={selectedService}
            negotiationFlow={negotiationFlow}
            setNegotiationFlow={setNegotiationFlow}
            onBack={() => setActiveScreen("home")}
            onContinue={() => setActiveScreen("agreement")}
          />
        ) : null}
        {activeScreen === "agreement" ? (
          <AgreementScreen
            selectedService={selectedService}
            onBack={() => setActiveScreen("negotiation")}
            onAgreementConfirmed={confirmAgreement}
          />
        ) : null}
        {activeScreen === "checkout" ? (
          <CheckoutScreen
            payment={payment}
            setPayment={setPayment}
            auth={authWithActions}
            onProjectCreated={setProjetoAtual}
            onOpenCompletion={() => setActiveScreen("complete")}
            selectedService={selectedService}
          />
        ) : null}
        {activeScreen === "complete" ? (
          <CompleteScreen auth={authWithActions} projetoAtual={projetoAtual} onProjectUpdated={setProjetoAtual} selectedService={selectedService} />
        ) : null}
        {activeScreen === "wallet" ? (
          <WalletScreen auth={authWithActions} />
        ) : null}
        {activeScreen === "profile" ? (
          <ProfileScreen
            auth={authWithActions}
            profileSettings={profileSettings}
            setProfileSettings={setProfileSettings}
            versaoStatus={versaoStatus}
            legalAcceptedAt={legalAcceptedAt}
          />
        ) : null}
        <BottomNav active={activeScreen} onChange={setActiveScreen} />
        {!legalAccepted ? (
          <LegalConsentModal accepted={legalCheckbox} setAccepted={setLegalCheckbox} onAccept={acceptLegalTerms} />
        ) : null}
        {legalAccepted && showVersionModal ? (
          <VersionNoticeModal status={versaoStatus} onClose={() => setShowVersionModal(false)} />
        ) : null}
      </div>
    </div>
  );
}
