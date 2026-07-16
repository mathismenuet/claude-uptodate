import { Resend } from "resend";

// Resend est server-only : à utiliser dans des Server Actions, Route Handlers
// ou API routes — jamais dans un composant client.
// Renseigne RESEND_API_KEY dans .env.local.
export const resend = new Resend(process.env.RESEND_API_KEY);
