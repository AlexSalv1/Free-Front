export const professional = {
  name: "Rafael Souza",
  role: "Eletricista Profissional",
  verified: true,
  initials: "RS",
};

export const serviceOrder = {
  title: "Instalação de Chuveiro Elétrico",
  date: "Sex, 15/05",
  time: "14:00",
  location: "Região aproximada: Vila Mariana - São Paulo",
  neighborhood: "São Paulo - Vila Mariana",
  value: 180,
};

export const paymentMethods = [
  {
    id: "CARTAO",
    title: "Cartão de Crédito",
    description: "Cobrança imediata - garantia total",
    badge: "Garantia total",
  },
  {
    id: "PIX_APP",
    title: "Pix no App",
    description: "Aprovação instantânea - garantia total",
    badge: "Garantia total",
  },
  {
    id: "DINHEIRO_LOCAL",
    title: "Dinheiro no Local",
    description: "Pagamento direto ao profissional",
    badge: "Sem garantia",
  },
];

export const movements = [
  {
    id: 1,
    title: "Instalação de chuveiro - Marina L.",
    date: "Hoje - 09:12",
    amount: 180,
    type: "credit",
  },
  {
    id: 2,
    title: "Taxa de serviço em dinheiro - Ana P.",
    date: "Ontem - 18:30",
    amount: -16.5,
    type: "debit",
  },
  {
    id: 3,
    title: "Reparo tomada - Carlos M.",
    date: "12/05 - 14:02",
    amount: 95,
    type: "credit",
  },
  {
    id: 4,
    title: "Taxa de serviço em dinheiro - Beatriz R.",
    date: "10/05 - 11:20",
    amount: -22,
    type: "debit",
  },
];
