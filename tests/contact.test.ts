import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleContact } from '../src/lib/contact.ts';

const env = { RESEND_API_KEY: 'test-only-key', CONTACT_FROM: 'Thrust <website@example.com>', CONTACT_TO: 'studio@example.com' };
function submission(fields: Record<string, string> = {}, headers: Record<string, string> = {}) {
  return new Request('https://www.thruststudio.co/api/contact', {
    method: 'POST',
    headers: { Accept: 'application/json', Origin: 'https://www.thruststudio.co', ...headers },
    body: new URLSearchParams({ name: 'Test Visitor', email: 'visitor@example.com', message: 'A project enquiry.', ...fields }),
  });
}
const mustNotSend: typeof fetch = async () => { assert.fail('Unexpected email delivery attempt'); };

test('sends through Resend with the verified sender and visitor as reply-to', async () => {
  let calls = 0;
  const response = await handleContact(submission(), env, async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.resend.com/emails');
    const payload = JSON.parse(init?.body as string);
    assert.equal(payload.from, env.CONTACT_FROM);
    assert.deepEqual(payload.to, [env.CONTACT_TO]);
    assert.equal(payload.reply_to, 'visitor@example.com');
    assert.match(payload.text, /A project enquiry\./);
    assert.equal(payload.html, undefined);
    return Response.json({ id: 'mock-id' });
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
});
test('invalid and header-injection fields never send', async () => {
  const invalidFields: Record<string, string>[] = [{ name: '' }, { name: 'Name\r\nBcc: other@example.com' }, { email: 'bad-address' }, { email: 'a@example.com\r\nBcc: b@example.com' }, { message: 'x'.repeat(5001) }];
  for (const fields of invalidFields) {
    assert.equal((await handleContact(submission(fields), env, mustNotSend)).status, 400);
  }
});
test('honeypot submissions are discarded', async () => {
  assert.equal((await handleContact(submission({ website: 'bot-site' }), env, mustNotSend)).status, 200);
});
test('cross-origin requests are rejected', async () => {
  assert.equal((await handleContact(submission({}, { Origin: 'https://other.example' }), env, mustNotSend)).status, 403);
});
test('bodies above the size limit are rejected even without Content-Length', async () => {
  assert.equal((await handleContact(submission({ message: 'x'.repeat(25000) }), env, mustNotSend)).status, 413);
});
test('missing configuration does not pretend to send', async () => {
  assert.equal((await handleContact(submission(), {}, mustNotSend)).status, 503);
});
test('provider failures and timeouts produce a retryable error without exposing internals', async () => {
  for (const send of [async () => new Response('secret provider diagnostic', { status: 429 }), async () => { throw new Error('secret provider diagnostic'); }]) {
    const response = await handleContact(submission(), env, send);
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /secret provider diagnostic/);
  }
});
test('non-JavaScript submissions receive an HTML response', async () => {
  const response = await handleContact(submission({}, { Accept: 'text/html' }), {}, mustNotSend);
  assert.equal(response.status, 503);
  assert.match(response.headers.get('content-type')!, /text\/html/);
  assert.match(await response.text(), /Return to Thrust Studio/);
});
