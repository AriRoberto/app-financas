import fs from 'node:fs';
import path from 'node:path';
import { getPluggyApiKey } from './pluggyAuth.js';

const connectorCache = new Map();

function normalizeText(value) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function loadFileCache(config) {
  try {
    if (!fs.existsSync(config.pluggyConnectorCacheFile)) return;
    const raw = fs.readFileSync(config.pluggyConnectorCacheFile, 'utf8');
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([key, value]) => connectorCache.set(key, value));
  } catch {
    // ignore cache file errors
  }
}

function persistFileCache(config) {
  try {
    const dir = path.dirname(config.pluggyConnectorCacheFile);
    fs.mkdirSync(dir, { recursive: true });
    const obj = Object.fromEntries(connectorCache.entries());
    fs.writeFileSync(config.pluggyConnectorCacheFile, JSON.stringify(obj, null, 2));
  } catch {
    // ignore cache file errors
  }
}

async function listConnectors(config) {
  const apiKey = await getPluggyApiKey(config);
  const response = await fetch(`${config.pluggyApiBaseUrl}/connectors?country=BR`, {
    headers: { 'X-API-KEY': apiKey }
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Falha ao listar conectores Pluggy.');
  return data.results || data.connectors || [];
}

function resolveByHeuristics(institution, connectors) {
  const target = normalizeText(institution.name);
  return connectors.find((connector) => {
    const name = normalizeText(connector.name);
    const legalName = normalizeText(connector.legalName);
    const tags = (connector.tags || []).map(normalizeText).join(' ');
    return name.includes(target) || legalName.includes(target) || tags.includes(target);
  }) || null;
}

export async function resolveConnectorForInstitution({ config, institution }) {
  if (connectorCache.size === 0) {
    loadFileCache(config);
  }

  if (connectorCache.has(institution.key)) {
    return connectorCache.get(institution.key);
  }

  const connectors = await listConnectors(config);
  const connector = resolveByHeuristics(institution, connectors);

  const result = connector
    ? { status: 'SUPPORTED', connectorId: connector.id, connectorName: connector.name }
    : { status: 'UNSUPPORTED', connectorId: null, connectorName: null };

  connectorCache.set(institution.key, result);
  persistFileCache(config);
  return result;
}

export function __setConnectorResolution(key, value) {
  connectorCache.set(key, value);
}

export function __resetConnectorCache() {
  connectorCache.clear();
}
