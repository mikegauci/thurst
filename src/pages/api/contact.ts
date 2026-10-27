import type { APIRoute } from 'astro';
import { handleContact } from '../../lib/contact';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleContact(request, {
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY,
  CONTACT_FROM: process.env.CONTACT_FROM ?? import.meta.env.CONTACT_FROM,
  CONTACT_TO: process.env.CONTACT_TO ?? import.meta.env.CONTACT_TO,
});
