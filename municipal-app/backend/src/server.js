import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const CATEGORIES = [
  'ILUMINACAO_PUBLICA',
  'BURACO_EM_VIA',
  'LIMPEZA_URBANA',
  'MANUTENCAO_ESPACO_PUBLICO'
];

const STATUS_FLOW = ['RECEBIDO', 'EM_ANALISE', 'EM_EXECUCAO', 'CONCLUIDO'];

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    return { users: [], requests: [] };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function makeProtocol() {
  const now = new Date();
  return `AMS-${now.getFullYear()}-${nanoid(8).toUpperCase()}`;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => {
  const { nome, cpf, email } = req.body;
  if (!nome || !cpf || !email) {
    return res.status(400).json({ message: 'nome, cpf e email são obrigatórios' });
  }

  const db = loadDb();
  const existing = db.users.find((u) => u.cpf === cpf || u.email === email);
  if (existing) {
    return res.status(409).json({ message: 'Usuário já existe', user: existing });
  }

  const user = {
    id: nanoid(),
    nome,
    cpf,
    email,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  saveDb(db);

  return res.status(201).json({ user });
});

app.post('/api/requests', (req, res) => {
  const { userId, category, descricao, endereco, latitude, longitude, fotoUrl } = req.body;
  if (!userId || !category || !descricao || latitude == null || longitude == null) {
    return res.status(400).json({
      message: 'Campos obrigatórios: userId, category, descricao, latitude e longitude'
    });
  }

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ message: 'Categoria inválida', categories: CATEGORIES });
  }

  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  const item = {
    id: nanoid(),
    protocol: makeProtocol(),
    userId,
    category,
    descricao,
    endereco: endereco || '',
    latitude,
    longitude,
    fotoUrl: fotoUrl || null,
    status: 'RECEBIDO',
    timeline: [{ status: 'RECEBIDO', at: new Date().toISOString(), by: 'SISTEMA' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.requests.push(item);
  saveDb(db);

  return res.status(201).json(item);
});

app.get('/api/requests', (req, res) => {
  const { userId, status, category } = req.query;
  const db = loadDb();

  let items = [...db.requests];
  if (userId) items = items.filter((i) => i.userId === userId);
  if (status) items = items.filter((i) => i.status === status);
  if (category) items = items.filter((i) => i.category === category);

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(items);
});

app.patch('/api/admin/requests/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, observacao, servidor = 'OPERADOR_PREFEITURA' } = req.body;
  if (!STATUS_FLOW.includes(status)) {
    return res.status(400).json({ message: 'Status inválido', allowed: STATUS_FLOW });
  }

  const db = loadDb();
  const index = db.requests.findIndex((i) => i.id === id);
  if (index < 0) return res.status(404).json({ message: 'Solicitação não encontrada' });

  const curr = db.requests[index];
  curr.status = status;
  curr.updatedAt = new Date().toISOString();
  curr.timeline.push({ status, observacao: observacao || '', by: servidor, at: curr.updatedAt });

  db.requests[index] = curr;
  saveDb(db);

  return res.json(curr);
});

app.get('/api/meta', (req, res) => {
  res.json({ categories: CATEGORIES, statusFlow: STATUS_FLOW });
});

const PORT = process.env.PORT || 3334;
app.listen(PORT, () => {
  console.log(`AMS API rodando em http://localhost:${PORT}`);
});
