import test from 'node:test';
import assert from 'node:assert/strict';
import { __resetConnectorCache, __setConnectorResolution, resolveConnectorForInstitution } from './providers/pluggy/connectorResolver.js';

const fakeConfig = {
  pluggyConnectorCacheFile: '/tmp/pluggy-resolver-cache-test.json'
};

test('resolver retorna cache para instituição já mapeada', async () => {
  __resetConnectorCache();
  __setConnectorResolution('BB', { status: 'SUPPORTED', connectorId: 1234, connectorName: 'Banco do Brasil' });

  const result = await resolveConnectorForInstitution({
    config: fakeConfig,
    institution: { key: 'BB', name: 'Banco do Brasil' }
  });

  assert.equal(result.status, 'SUPPORTED');
  assert.equal(result.connectorId, 1234);
});
