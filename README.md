# Thrust Studio

Astro rebuild of https://www.thruststudio.co/ for Vercel. No CMS, database, WordPress runtime, or WordPress asset dependencies. Original branding, local fonts, background textures, client logos and separate desktop/mobile showreels are included. The portfolio videos continue to use the existing Vimeo embeds.

## Develop

Use Node.js 24 LTS.

```sh
npm ci
cp .env.example .env
npm run dev
```

Content lives in `src/pages/index.astro`; project video markup is in `src/components/Project.astro`; styling is in `src/styles/global.css`. Assets live in `public/assets`. Editing these files and deploying updates the site.

```sh
npm run check
npm test
npm run build
```

## Deploy on Vercel

Import `mikegauci/thurst` into the intended Vercel team, select Astro, and use Node.js 24.x. The root is this repository, the build command is `npm run build`, and the adapter generates Vercel's static site and contact function. The home page is prerendered; only `/api/contact` runs on the server.

Set the following **server-side** environment variables for the intended deployment environments:

| Variable | Value |
| --- | --- |
| `MAILJET_API_KEY` | Mailjet public API key |
| `MAILJET_SECRET_KEY` | Mailjet secret API key |
| `CONTACT_FROM` | Sender on a Mailjet-verified domain, e.g. `Thrust Studio <website@thruststudio.co>` |
| `CONTACT_TO` | Destination mailbox, normally `info@thruststudio.co` |

Redeploy after setting variables. The contact endpoint validates input, limits request sizes, checks browser origin, discards honeypot submissions, and sends plain-text email with the visitor as reply-to. Without these variables it returns an honest failure message with the contact email. Tests mock Mailjet: no real email is sent by tests. End-to-end delivery must be verified after credentials and the sender domain are configured. Use Vercel Firewall rate limiting on `/api/contact` for production abuse protection; the honeypot is only basic filtering.

## Domain cutover

1. Review the Vercel deployment on desktop and mobile, play the Vimeo projects, and verify real form delivery.
2. Add `www.thruststudio.co` and `thruststudio.co` to the Vercel project. Redirect the apex to `www` to preserve the existing canonical URL.
3. Apply the DNS records shown by Vercel. Preserve existing MX and mail-related TXT records so email keeps working. Add only the sender-verification records required by Mailjet.
4. Confirm HTTPS, both hostnames, navigation, video playback, and form delivery on the final domain.
5. Archive the WordPress backup and retire WordPress hosting after the new site is verified. No code or asset requests to the old hosting are required.

The videos and fonts were copied from the existing site's public assets. Keep the owner's existing font and media licenses when deploying. This repository contains no API keys.
