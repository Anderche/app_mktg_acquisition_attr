import { Attribution } from "./components/Attribution";
import { Campaigns } from "./components/Campaigns";
import { ChannelPerformance } from "./components/ChannelPerformance";
import { DataNotes } from "./components/DataNotes";
import { Header } from "./components/Header";
import { KpiStrip } from "./components/KpiStrip";
import { Paths } from "./components/Paths";
import { FiltersProvider } from "./filters";
import { ModeContext, useColorMode } from "./theme";

export default function App() {
  const [mode, setMode] = useColorMode();
  return (
    <ModeContext.Provider value={mode}>
      <FiltersProvider>
        <div className="min-h-screen bg-page font-sans">
          <Header mode={mode} onModeChange={setMode} />
          <main className="mx-auto grid max-w-[1400px] grid-cols-12 gap-x-4 gap-y-8 px-4 py-6 md:px-6">
            <section aria-label="Key metrics" className="col-span-12 min-w-0">
              <KpiStrip />
            </section>
            <ChannelPerformance />
            <Attribution />
            <Paths />
            <Campaigns />
          </main>
          <DataNotes />
        </div>
      </FiltersProvider>
    </ModeContext.Provider>
  );
}
