import assert from 'node:assert/strict';
import test from 'node:test';
import { ConnectorJobPollingAborted, waitForConnectorJob } from '../src/lib/connectorJobPolling';
import { ConnectorJob } from '../src/lib/connector';

const job = (status: ConnectorJob['status']): ConnectorJob => ({ id: 'job-1', label: 'Test', command: 'test', status, output: '', startedAt: '', finishedAt: status === 'running' ? null : '', ok: status === 'succeeded' });

test('polls until the terminal connector state and publishes every state', async () => {
  const observed: string[] = [];
  const responses = [job('running'), job('succeeded')];
  const result = await waitForConnectorJob(job('running'), { getJob: async () => responses.shift()! }, (current) => observed.push(current.status), 1, async () => undefined);

  assert.equal(result.status, 'succeeded');
  assert.deepEqual(observed, ['running', 'running', 'succeeded']);
});

test('does not poll a job that is already terminal', async () => {
  let reads = 0;
  const result = await waitForConnectorJob(job('failed'), { getJob: async () => { reads += 1; return job('failed'); } }, () => undefined, 1, async () => undefined);

  assert.equal(result.status, 'failed');
  assert.equal(reads, 0);
});

test('stops polling before another connector request when aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(waitForConnectorJob(job('running'), { getJob: async () => job('running') }, () => undefined, 1, async () => undefined, controller.signal), ConnectorJobPollingAborted);
});

test('waits for a hidden document before polling again', async () => {
  let visible = false; let reads = 0; let waited = 0;
  const result = await waitForConnectorJob(job('running'), { getJob: async () => { reads += 1; return job('succeeded'); } }, () => undefined, 1, async () => undefined, undefined, { hidden: () => !visible, waitUntilVisible: async () => { waited += 1; visible = true; } });
  assert.equal(result.status, 'succeeded');
  assert.equal(reads, 1);
  assert.equal(waited, 1);
});
