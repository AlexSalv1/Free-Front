const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8083";

function mapApiErrorMessage(status, apiMessage) {
  const normalized = (apiMessage || "").toLowerCase();

  if (status === 400) {
    if (normalized.includes("otp")) {
      return "Codigo de verificacao invalido ou expirado. Solicite um novo codigo e tente novamente.";
    }
    if (normalized.includes("token")) {
      return "Nao foi possivel validar esta operacao. Atualize a tela e tente novamente.";
    }
    if (normalized.includes("documento")) {
      return "Os dados informados nao passaram na validacao. Revise o documento e tente novamente.";
    }
    return "Nao foi possivel concluir a solicitacao. Revise os dados informados e tente novamente.";
  }

  if (status === 401) {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }

  if (status === 403) {
    if (normalized.includes("demo")) {
      return "Esta funcao nao esta disponivel para a conta demo.";
    }
    if (normalized.includes("verificada")) {
      return "Sua conta ainda nao foi liberada para esta acao. Conclua a verificacao para continuar.";
    }
    return "Voce nao tem permissao para realizar esta acao no momento.";
  }

  if (status === 404) {
    return "Nao encontramos o recurso solicitado. Atualize a tela e tente novamente.";
  }

  if (status === 409) {
    if (normalized.includes("email")) {
      return "Ja existe uma conta com este e-mail.";
    }
    if (normalized.includes("documento")) {
      return "Ja existe um cadastro com este documento.";
    }
    return "Ja existe um registro com esses dados. Revise as informacoes e tente novamente.";
  }

  if (status === 422) {
    return "Os dados enviados nao puderam ser processados. Revise as informacoes e tente novamente.";
  }

  if (status === 429) {
    return "Voce fez muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
  }

  if (status >= 500) {
    return "Nosso servidor esta instavel no momento. Tente novamente em alguns instantes.";
  }

  if (apiMessage) {
    return apiMessage;
  }

  return `Nao foi possivel concluir a solicitacao. Erro HTTP ${status}.`;
}

export async function apiRequest(path, { method = "GET", body, token, headers: customHeaders } = {}) {
  const headers = {
    Accept: "application/json",
    ...(customHeaders || {}),
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Falha de conexao com o servidor. Verifique sua internet e tente novamente.");
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const apiMessage = data?.message || data?.error || "";
    throw new Error(mapApiErrorMessage(response.status, apiMessage));
  }

  return data;
}

export const api = {
  listarCategorias: () => apiRequest("/api/v1/categorias"),
  listarProfissionais: () => apiRequest("/api/v1/catalogo/profissionais"),
  criarSolicitacaoOrcamento: (payload) => apiRequest("/api/v1/orcamentos/solicitacoes", { method: "POST", body: payload }),
  listarPropostasOrcamento: (solicitacaoId, tokenAcesso) =>
    apiRequest(`/api/v1/orcamentos/solicitacoes/${solicitacaoId}/propostas`, {
      headers: tokenAcesso
        ? {
            "X-Solicitacao-Token": tokenAcesso,
          }
        : undefined,
    }),
  aceitarPropostaOrcamento: (propostaId, tokenAcesso) =>
    apiRequest(`/api/v1/orcamentos/propostas/${propostaId}/aceitar`, {
      method: "POST",
      body: { tokenAcesso: tokenAcesso || "" },
    }),
  criarNegociacao: (payload) => apiRequest("/api/v1/negociacoes", { method: "POST", body: payload }),
  buscarNegociacao: (negociacaoId, tokenAcesso) =>
    apiRequest(`/api/v1/negociacoes/${negociacaoId}`, {
      headers: tokenAcesso
        ? {
            "X-Negociacao-Token": tokenAcesso,
          }
        : undefined,
    }),
  enviarMensagemNegociacao: (negociacaoId, tokenAcesso, payload) =>
    apiRequest(`/api/v1/negociacoes/${negociacaoId}/mensagens`, {
      method: "POST",
      headers: tokenAcesso
        ? {
            "X-Negociacao-Token": tokenAcesso,
          }
        : undefined,
      body: payload,
    }),
  atualizarNegociacao: (negociacaoId, tokenAcesso, payload) =>
    apiRequest(`/api/v1/negociacoes/${negociacaoId}`, {
      method: "PUT",
      headers: tokenAcesso
        ? {
            "X-Negociacao-Token": tokenAcesso,
          }
        : undefined,
      body: payload,
    }),
  listarAvaliacoesProfissional: (avaliadoId) => apiRequest(`/api/v1/avaliacoes/profissionais/${avaliadoId}`),
  criarAvaliacaoProjeto: (projetoId, payload, token) =>
    apiRequest(`/api/v1/avaliacoes/projetos/${projetoId}`, { method: "POST", body: payload, token }),
  cadastrar: (payload) => apiRequest("/api/v1/auth/cadastro", { method: "POST", body: payload }),
  verificarOtp: (usuarioId, payload) =>
    apiRequest(`/api/v1/auth/usuarios/${usuarioId}/verificar-otp`, { method: "POST", body: payload }),
  login: (payload) => apiRequest("/api/v1/auth/login", { method: "POST", body: payload }),
  buscarUsuario: (usuarioId, token) => apiRequest(`/api/v1/auth/usuarios/${usuarioId}`, { token }),
  criarCheckout: (payload, token) =>
    apiRequest("/api/v1/projetos/checkout", { method: "POST", body: payload, token }),
  confirmarToken: (projetoId, payload, token) =>
    apiRequest(`/api/v1/projetos/${projetoId}/confirmar-token`, { method: "POST", body: payload, token }),
  concluirComFoto: (projetoId, payload, token) =>
    apiRequest(`/api/v1/projetos/${projetoId}/concluir-com-foto`, { method: "POST", body: payload, token }),
  liquidarPorDecurso: (projetoId, token) =>
    apiRequest(`/api/v1/projetos/${projetoId}/liquidar-decurso`, { method: "POST", token }),
  buscarCarteira: (prestadorId, token) => apiRequest(`/api/v1/carteiras/${prestadorId}`, { token }),
  solicitarSaque: (prestadorId, payload, token) =>
    apiRequest(`/api/v1/carteiras/${prestadorId}/saques`, { method: "POST", body: payload, token }),
  registrarDebito: (prestadorId, payload, token) =>
    apiRequest(`/api/v1/carteiras/${prestadorId}/debitos`, { method: "POST", body: payload, token }),
  checarVersao: (payload) => apiRequest("/api/v1/versao/check", { method: "POST", body: payload }),
};
