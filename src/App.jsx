import { useMemo, useState } from "react";
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
  Home,
  KeyRound,
  Landmark,
  Mail,
  MapPin,
  QrCode,
  Search,
  Shield,
  ShieldAlert,
  Smartphone,
  UserPlus,
  Wallet,
} from "lucide-react";
import { api } from "./api/client.js";
import { movements, paymentMethods, professional, serviceOrder } from "./data/mockData.js";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

function ServiceCard() {
  return (
    <section className="service-card">
      <div className="professional-row">
        <div className="avatar">{professional.initials}</div>
        <div className="professional-copy">
          <strong>{professional.name}</strong>
          <span>{professional.role}</span>
        </div>
        <span className="verified-pill">
          <BadgeCheck size={13} />
          Verificado
        </span>
      </div>

      <div className="service-divider" />

      <h2>{serviceOrder.title}</h2>
      <div className="service-meta">
        <span>
          <CalendarDays size={16} />
          {serviceOrder.date} - {serviceOrder.time}
        </span>
        <span>
          <MapPin size={16} />
          {serviceOrder.location}
        </span>
      </div>

      <div className="price-row">
        <span>Valor do servico</span>
        <strong>{currency.format(serviceOrder.value)}</strong>
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

function CheckoutScreen({ payment, setPayment, auth }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cashAccepted, setCashAccepted] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const isCash = payment === "DINHEIRO_LOCAL";
  const canConfirm = isCash ? cashAccepted : termsAccepted;

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
          prestadorId: "22222222-2222-2222-2222-222222222222",
          tituloServico: serviceOrder.title,
          descricaoEscopo: "Instalar chuveiro 220V com validacao de garantia e LGPD.",
          valorTotal: serviceOrder.value,
          tipoPagamento: payment,
          tipoFluxo: "DIRETO",
          dataAgendamento: "2026-07-15T14:00:00-03:00",
          aceiteTermos: termsAccepted,
          aceiteIsencaoGarantia: cashAccepted,
        },
        auth.accessToken,
      );
      setStatus({ type: "success", message: `Projeto criado com status ${projeto.status}. Token: ${projeto.tokenValidacao}` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="screen">
      <AppHeader title="Checkout" subtitle="Confirme e pague com seguranca" />
      <ServiceCard />

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

      <StatusMessage state={status} />
      <button className="primary-action" disabled={!canConfirm || loading} onClick={confirmPayment}>
        {loading ? "Processando..." : `Confirmar Pagamento - ${currency.format(serviceOrder.value)}`}
      </button>
    </main>
  );
}

function CompleteScreen() {
  const [token, setToken] = useState("");
  const [photoSent, setPhotoSent] = useState(false);
  const tokenComplete = token.length === 4;

  return (
    <main className="screen">
      <AppHeader title="Concluir Servico" subtitle="Confirme a entrega para liberar o pagamento" />

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
            Token validado. Liquidacao instantanea liberada.
          </div>
        ) : null}
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
        <button className={`photo-drop ${photoSent ? "done" : ""}`} onClick={() => setPhotoSent(true)}>
          <Camera size={28} />
          <strong>{photoSent ? "Foto enviada para analise" : "Tirar foto agora"}</strong>
          <span>{photoSent ? "Cronometro de 48 horas iniciado" : "Enquadre a area onde o servico foi executado"}</span>
        </button>
      </section>

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

function WalletScreen() {
  const [filter, setFilter] = useState("positive");
  const wallet = {
    balance: 1247.85,
    debt: 38.5,
    debtLimit: 50,
    minimumWithdraw: 50,
  };
  const visibleMovements = useMemo(() => {
    if (filter === "debt") return movements.filter((movement) => movement.type === "debit");
    return movements;
  }, [filter]);

  return (
    <main className="screen">
      <AppHeader title="Carteira" subtitle="Seus recebimentos e taxas" right={<Eye size={20} />} />
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
        <strong>{currency.format(wallet.balance)}</strong>
        <div className="debt-meter">
          <div>
            <span>Debito por dinheiro</span>
            <strong>
              {currency.format(wallet.debt)} / {currency.format(wallet.debtLimit)}
            </strong>
          </div>
          <meter min="0" max={wallet.debtLimit} value={wallet.debt} />
        </div>
        <div className="balance-actions">
          <button>
            <ArrowDownLeft size={20} />
            Sacar
          </button>
          <button>
            <ChevronDown size={20} />
            Rendimento
          </button>
          <button>
            <Clock3 size={20} />
            Extrato
          </button>
        </div>
      </section>

      <section className="section-block">
        <h3>Movimentacoes recentes</h3>
        <section className="wallet-rule-panel">
          <ShieldAlert size={17} />
          Saques sao liberados a partir de {currency.format(wallet.minimumWithdraw)}. Debitos em dinheiro iguais ou
          acima de {currency.format(wallet.debtLimit)} suspendem novos projetos.
        </section>
        <div className="movement-list">
          {filter === "blocked" ? (
            <div className="empty-state">
              <ShieldAlert size={22} />
              <strong>Nenhum bloqueio ativo</strong>
              <span>O limite de saldo devedor esta regular neste momento.</span>
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

function OnboardingScreen({ onAuthenticated }) {
  const [documento, setDocumento] = useState("52998224725");
  const [accepted, setAccepted] = useState(false);
  const [otpSent, setOtpSent] = useState(null);
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const credentials = {
    email: "rafael.secure@example.com",
    senha: "SenhaForte123",
  };
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

function HomeScreen({ setPayment, onOpenOnboarding }) {
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
        <span className="lgpd-pill">
          <Shield size={13} />
          LGPD
        </span>
      </header>

      <label className="search-box">
        <Search size={19} />
        <input placeholder="Buscar servico ou profissional" />
      </label>

      <div className="category-strip">
        {["Todos", "Eletrica", "Hidraulica", "Limpeza", "Reparos"].map((item) => (
          <button key={item} className={item === "Todos" ? "active" : ""}>
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

      <section className="privacy-panel compact">
        <Shield size={17} />
        <p>
          <strong>LGPD:</strong> seus dados de localizacao sao usados exclusivamente para validar a prestacao do servico
          fisico.
        </p>
      </section>

      <section className="version-panel">
        <CheckCircle2 size={17} />
        Versao 1.0.0 compativel com a API minima exigida.
      </section>
    </main>
  );
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState("home");
  const [payment, setPayment] = useState("CARTAO");
  const [auth, setAuth] = useState(null);

  const selectPayment = (methodId) => {
    setPayment(methodId);
    setActiveScreen("checkout");
  };

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {activeScreen === "home" ? (
          <HomeScreen setPayment={selectPayment} onOpenOnboarding={() => setActiveScreen("onboarding")} />
        ) : null}
        {activeScreen === "onboarding" ? <OnboardingScreen onAuthenticated={setAuth} /> : null}
        {activeScreen === "checkout" ? <CheckoutScreen payment={payment} setPayment={setPayment} auth={auth} /> : null}
        {activeScreen === "complete" ? <CompleteScreen /> : null}
        {activeScreen === "wallet" ? <WalletScreen /> : null}
        <BottomNav active={activeScreen} onChange={setActiveScreen} />
      </div>
    </div>
  );
}
