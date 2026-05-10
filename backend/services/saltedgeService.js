import axios from 'axios';

function getClient() {
  return axios.create({
    baseURL: process.env.SALTEDGE_BASE_URL || 'https://www.saltedge.com/api/v5',
    headers: {
      'App-id': process.env.SALTEDGE_APP_ID,
      'Secret': process.env.SALTEDGE_SECRET,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 30000,
  });
}

export async function createCustomer(identifier) {
  const { data } = await getClient().post('/customers', {
    data: { identifier: String(identifier) },
  });
  return data.data;
}

export async function findCustomerByIdentifier(identifier) {
  const client = getClient();
  let nextId = null;
  do {
    const params = nextId ? { from_id: nextId } : {};
    const { data } = await client.get('/customers', { params });
    const match = data.data.find((c) => c.identifier === String(identifier));
    if (match) {
      if (!match.customer_id && match.id) match.customer_id = match.id;
      return match;
    }
    nextId = data.meta?.next_id || null;
  } while (nextId);
  return null;
}

export async function getOrCreateCustomer(identifier) {
  try {
    return await createCustomer(identifier);
  } catch (e) {
    if (e.response?.data?.error?.class === 'DuplicatedCustomer') {
      const existing = await findCustomerByIdentifier(identifier);
      if (existing) return existing;
    }
    throw e;
  }
}

export async function createConnectSession(customerId, returnTo) {
  const paths = ['/connections/connect', '/connect_sessions/create'];
  let lastErr;
  for (const path of paths) {
    try {
      const { data } = await getClient().post(path, {
        data: {
          customer_id: customerId,
          consent: { scopes: ['account_details', 'transactions_details'] },
          attempt: {
            return_to: returnTo,
            fetch_scopes: ['accounts', 'transactions'],
          },
        },
      });
      return data.data;
    } catch (e) {
      lastErr = e;
      if (e.response?.status !== 404) throw e;
    }
  }
  throw lastErr;
}

export async function listConnections(customerId) {
  const { data } = await getClient().get('/connections', {
    params: { customer_id: customerId },
  });
  return data.data;
}

export async function getConnection(connectionId) {
  const { data } = await getClient().get(`/connections/${connectionId}`);
  return data.data;
}

export async function refreshConnection(connectionId) {
  const { data } = await getClient().put(`/connections/${connectionId}/refresh`, {
    data: { fetch_scopes: ['accounts', 'transactions'] },
  });
  return data.data;
}

export async function removeConnection(connectionId) {
  const { data } = await getClient().delete(`/connections/${connectionId}`);
  return data.data;
}

export async function listAccounts(connectionId) {
  const { data } = await getClient().get('/accounts', {
    params: { connection_id: connectionId },
  });
  return data.data;
}

export async function listTransactions(connectionId, accountId, fromId = null) {
  const all = [];
  let nextId = fromId;
  const client = getClient();
  do {
    const params = { connection_id: connectionId, account_id: accountId };
    if (nextId) params.from_id = nextId;
    const { data } = await client.get('/transactions', { params });
    all.push(...data.data);
    nextId = data.meta?.next_id || null;
  } while (nextId);
  return all;
}
