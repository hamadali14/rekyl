/* Rekyl — schemalagd körning av intervjupåminnelser.
 *
 * Körs automatiskt varje timme av Netlify (även när ingen har appen öppen).
 * Skickar en påminnelse till kandidater vars intervju är om ~24 timmar.
 * Dubbelutskick förhindras av ett unikt index i tabellen reminders_sent.
 *
 * Kräver SUPABASE_SERVICE_ROLE_KEY (läser organisationernas sparade state).
 */

import { runReminders, runOutbox, json } from "../lib/mail.mjs";

export default async () => {
  /* Utskickskön körs varje gång. Påminnelser bara en gång i timmen (de är dagsbaserade). */
  const out = await runOutbox();
  if (out.error) console.error("[rekyl] utskickskö: " + out.error);
  else console.log("[rekyl] utskickskö: " + out.sent + " skickade, " + out.errors.length + " fel");

  const topOfHour = new Date().getMinutes() < 5;
  let rem = { skipped: "ej dags" };
  if (topOfHour) {
    rem = await runReminders(null);
    if (rem.error) console.error("[rekyl] paminnelser: " + rem.error);
    else console.log("[rekyl] paminnelser: " + rem.sent + " skickade, " + rem.errors.length + " fel");
  }
  return json(200, { outbox: out, reminders: rem });
};

/* Var femte minut — schemalagda mejl ska inte behöva vänta en timme. */
export const config = { schedule: "*/5 * * * *" };
