const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8083";

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = {
    Accept: "application/json",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  cadastrar: (payload) => apiRequest("/api/v1/auth/cadastro", { method: "POST", body: payload }),
  verificarOtp: (usuarioId, payload) =>
    apiRequest(`/api/v1/auth/usuarios/${usuarioId}/verificar-otp`, { method: "POST", body: payload }),
  login: (payload) => apiRequest("/api/v1/auth/login", { method: "POST", body: payload }),
  criarCheckout: (payload, token) =>
    apiRequest("/api/v1/projetos/checkout", { method: "POST", body: payload, token }),
  checarVersao: (payload) => apiRequest("/api/v1/versao/check", { method: "POST", body: payload }),
};
