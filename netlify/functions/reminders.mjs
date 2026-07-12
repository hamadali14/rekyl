/* Rekyl — schemalagd körning av intervjupåminnelser.
 *
 * Körs automatiskt varje timme av Netlify (även när ingen har appen öppen).
 * Skickar en påminnelse till kandidater vars intervju är om ~24 timmar.
 * Dubbelutskick förhindras av ett unikt index i tabellen reminders_sent.
 *
 * Kräver SUPABASE_SERVICE_ROLE_KEY (läser organisationernas sparade state).
 */

import { runReminders, json } from "../lib/mail.mjs";

export default async () => {
  const res = await runReminders(null);
  if (res.error) {
    console.error("[rekyl] paminnelser: " + res.error);
    return json(500, res);
  }
  console.log("[rekyl] paminnelser: " + res.sent + " skickade, " + res.skipped + " hoppade over, " + res.errors.length + " fel");
  return json(200, res);
};

export const config = { schedule: "0 * * * *" };
