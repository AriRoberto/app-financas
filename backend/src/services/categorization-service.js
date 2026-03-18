const DEFAULT_CATEGORY_BY_TYPE = {
  income: 'Renda extra',
  expense: 'Outros',
  investment: 'Outros investimentos'
};

const RULE_DEFINITIONS = [
  { type: 'income', category: 'Salário', keywords: ['salario', 'salário', 'folha', 'holerite', 'pro labore'] },
  { type: 'income', category: 'Freelance', keywords: ['freela', 'freelance', 'pix cliente', 'pagamento cliente'] },
  { type: 'income', category: 'Bônus', keywords: ['bonus', 'bônus', 'plr', 'comissao', 'comissão'] },
  { type: 'income', category: 'Renda extra', keywords: ['reembolso', 'estorno credito', 'cashback', 'renda extra'] },
  { type: 'expense', category: 'Moradia', keywords: ['aluguel', 'condominio', 'condomínio', 'energia', 'luz', 'agua', 'água', 'gas', 'gás', 'iptu', 'imovel', 'imóvel'] },
  { type: 'expense', category: 'Alimentação', keywords: ['mercado', 'supermercado', 'padaria', 'ifood', 'restaurante', 'lanche', 'feira', 'hortifruti', 'delivery'] },
  { type: 'expense', category: 'Transporte', keywords: ['uber', '99app', 'combustivel', 'combustível', 'posto', 'pedagio', 'pedágio', 'onibus', 'ônibus', 'metro', 'metrô', 'estacionamento'] },
  { type: 'expense', category: 'Saúde', keywords: ['farmacia', 'farmácia', 'consulta', 'medico', 'médico', 'hospital', 'laboratorio', 'laboratório', 'plano saude', 'plano saúde'] },
  { type: 'expense', category: 'Educação', keywords: ['escola', 'faculdade', 'curso', 'livro', 'material escolar', 'mensalidade'] },
  { type: 'expense', category: 'Lazer', keywords: ['cinema', 'viagem', 'show', 'parque', 'bar', 'restaurante premium', 'lazer'] },
  { type: 'expense', category: 'Assinaturas', keywords: ['spotify', 'netflix', 'amazon prime', 'youtube premium', 'globoplay', 'assinatura', 'mensalidade app', 'internet'] },
  { type: 'expense', category: 'Reserva para investir', keywords: ['reserva investimento', 'aporte reserva', 'transferencia corretora', 'transferência corretora'] },
  { type: 'investment', category: 'Renda fixa', keywords: ['cdb', 'tesouro', 'lci', 'lca', 'renda fixa'] },
  { type: 'investment', category: 'Fundos', keywords: ['fundo', 'fii', 'multimercado'] },
  { type: 'investment', category: 'Ações', keywords: ['acao', 'ação', 'acoes', 'ações', 'etf', 'bdr'] },
  { type: 'investment', category: 'Previdência', keywords: ['previdencia', 'previdência', 'vgbl', 'pgbl'] },
  { type: 'investment', category: 'Cripto', keywords: ['bitcoin', 'btc', 'ethereum', 'eth', 'cripto', 'binance'] },
  { type: 'investment', category: 'Reserva de emergência', keywords: ['reserva emergencia', 'reserva emergência', 'caixinha reserva'] }
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreRule(rule, text) {
  return rule.keywords.reduce((score, keyword) => (text.includes(normalizeText(keyword)) ? score + 1 : score), 0);
}

export function categorizeTransaction({ description, type, categoriesByType = {} }) {
  const normalized = normalizeText(description);
  const candidates = RULE_DEFINITIONS.filter((rule) => rule.type === type);
  const scored = candidates
    .map((rule) => ({ rule, score: scoreRule(rule, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.rule.keywords.length - a.rule.keywords.length);

  const allowed = new Set(categoriesByType[type] || []);
  const winner = scored.find((entry) => !allowed.size || allowed.has(entry.rule.category));

  if (winner) {
    return {
      category: winner.rule.category,
      confidence: Math.min(0.45 + winner.score * 0.18, 0.98),
      rule: winner.rule.keywords.find((keyword) => normalized.includes(normalizeText(keyword))) || 'keyword-match',
      normalizedDescription: normalized,
      matchedBy: 'keyword'
    };
  }

  return {
    category: DEFAULT_CATEGORY_BY_TYPE[type] || 'Outros',
    confidence: 0.2,
    rule: 'fallback-default',
    normalizedDescription: normalized,
    matchedBy: 'fallback'
  };
}

export function explainCategorizationRules() {
  return RULE_DEFINITIONS.map((rule) => ({
    type: rule.type,
    category: rule.category,
    keywords: rule.keywords
  }));
}
