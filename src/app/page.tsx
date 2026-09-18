import SlotMachine from "@/components/SlotMachine";
import AuthGate from "@/components/AuthGate";
import PlayerProvider from "@/components/PlayerProvider";
import { readSupabaseEnv } from "@/lib/supabase/config";

// The credentials are read per request rather than inlined at build time, so
// rotating a key in Vercel takes effect without a rebuild.
export const dynamic = "force-dynamic";

export default function Home() {
  const supabaseConfig = readSupabaseEnv();

  return (
    <PlayerProvider supabaseConfig={supabaseConfig}>
      <main className="page">
        <AuthGate />
        <SlotMachine />
        <p className="footer-note">
          Play money only — nothing here can be bought, cashed out, or wagered.
          Open source under the MIT licence.{" "}
          <a
            href="https://www.begambleaware.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Gambling help &amp; advice
          </a>
        </p>
      </main>
    </PlayerProvider>
  );
}
