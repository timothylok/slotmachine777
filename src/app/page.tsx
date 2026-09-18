import SlotMachine from "@/components/SlotMachine";
import AuthGate from "@/components/AuthGate";
import PlayerProvider from "@/components/PlayerProvider";

export default function Home() {
  return (
    <PlayerProvider>
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
