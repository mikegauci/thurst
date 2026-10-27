interface ContactEnvironment {
  RESEND_API_KEY?: string;
  CONTACT_FROM?: string;
  CONTACT_TO?: string;
}

const MAX_BODY_BYTES = 24_000;
const SUCCESS = 'Thank you for your message. It has been sent.';
const UNAVAILABLE = 'Your message could not be sent. Please email info@thruststudio.co or try again later.';

function reply(request: Request, message: string, status: number): Response {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (request.headers.get('accept')?.includes('application/json')) {
    return Response.json({ message }, { status, headers });
  }
  // A usable confirmation/error page when JavaScript is unavailable.
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Contact — Thrust Studio</title><style>body{max-width:40rem;margin:15vh auto;padding:2rem;font:20px/1.6 system-ui}a{color:inherit}</style><h1>${status === 200 ? 'Thank you' : 'Message not sent'}</h1><p>${message}</p><a href="/#contact">Return to Thrust Studio</a></html>`, {
    status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function boundedFormData(request: Request): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError('Body too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Request(request.url, { method: 'POST', headers: request.headers, body: bytes }).formData();
}

export async function handleContact(request: Request, env: ContactEnvironment, send: typeof fetch = fetch): Promise<Response> {
  const respond = (message: string, status: number) => reply(request, message, status);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return respond('Please submit the form from this website.', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return respond('Please submit the form from this website.', 403);
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return respond('Your message is too long.', 413);
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data') && !contentType.startsWith('application/x-www-form-urlencoded')) {
    return respond('Please use the contact form to send your message.', 415);
  }
  let data: FormData;
  try { data = await boundedFormData(request); }
  catch (error) { return respond(error instanceof RangeError ? 'Your message is too long.' : 'Please check the form and try again.', error instanceof RangeError ? 413 : 400); }

  if (data.get('website')) return respond(SUCCESS, 200);
  const name = data.get('name');
  const email = data.get('email');
  const message = data.get('message') ?? '';
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || /[\r\n\x00]/.test(name)) return respond('Please enter your name.', 400);
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return respond('Please enter a valid email address.', 400);
  if (typeof message !== 'string' || message.length > 5000) return respond('Please keep your message under 5,000 characters.', 400);

  if (!env.RESEND_API_KEY || !env.CONTACT_FROM || !env.CONTACT_TO) return respond(UNAVAILABLE, 503);
  try {
    const result = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        reply_to: email.trim(),
        subject: `Website enquiry from ${name.trim()}`,
        text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok) return respond(UNAVAILABLE, 502);
    return respond(SUCCESS, 200);
  } catch { return respond(UNAVAILABLE, 502); }
}
