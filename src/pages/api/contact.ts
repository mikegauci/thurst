import type { APIRoute } from 'astro';
import { handleContact } from '../../lib/contact';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleContact(request, {
  MAILJET_API_KEY: process.env.MAILJET_API_KEY ?? import.meta.env.MAILJET_API_KEY,
  MAILJET_SECRET_KEY: process.env.MAILJET_SECRET_KEY ?? import.meta.env.MAILJET_SECRET_KEY,
  CONTACT_FROM: process.env.CONTACT_FROM ?? import.meta.env.CONTACT_FROM,
  CONTACT_TO: process.env.CONTACT_TO ?? import.meta.env.CONTACT_TO,
});
