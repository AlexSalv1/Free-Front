export const professional = {
  name: "Rafael Souza",
  role: "Eletricista Profissional",
  verified: true,
  initials: "RS",
};

export const serviceOrder = {
  title: "Instalacao de Chuveiro Eletrico",
  date: "Sex, 15/05",
  time: "14:00",
  location: "Regiao aproximada: Vila Mariana - Sao Paulo",
  neighborhood: "Sao Paulo - Vila Mariana",
  value: 180,
};

export const paymentMethods = [
  {
    id: "CARTAO",
    title: "Cartao de Credito",
    description: "Cobranca imediata - garantia total",
    badge: "Garantia total",
  },
  {
    id: "PIX_APP",
    title: "Pix no App",
    description: "Aprovacao instantanea - garantia total",
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
    title: "Instalacao chuveiro - Marina L.",
    date: "Hoje - 09:12",
    amount: 180,
    type: "credit",
  },
  {
    id: 2,
    title: "Taxa servico em dinheiro - Ana P.",
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
    title: "Taxa servico em dinheiro - Beatriz R.",
    date: "10/05 - 11:20",
    amount: -22,
    type: "debit",
  },
];
