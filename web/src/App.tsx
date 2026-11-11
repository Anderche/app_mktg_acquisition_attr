import { Attribution } from "./components/Attribution";
import { Campaigns } from "./components/Campaigns";
import { Section } from "./components/Card";
import { ChannelPerformance } from "./components/ChannelPerformance";
import { DataNotes } from "./components/DataNotes";
import { Header } from "./components/Header";
import { Intro } from "./components/Intro";
import { KpiStrip } from "./components/KpiStrip";
import { Paths } from "./components/Paths";
import { ReferenceTiles } from "./components/ReferenceTiles";
import { FiltersProvider } from "./filters";
import { ModeContext, useColorMode } from "./theme";

export default function App() {
  const [mode, setMode] = useColorMode();
  return (
    <ModeContext.Provider value={mode}>
      <FiltersProvider>
        <div className="min-h-screen bg-page font-sans">
          <Header mode={mode} onModeChange={setMode} />
          <main className="mx-auto grid max-w-[1400px] grid-cols-12 gap-x-4 gap-y-12 px-4 py-8 md:px-6">
            <div className="col-span-12 grid min-w-0 grid-cols-12 gap-y-6">
              <Intro />
              <ReferenceTiles />
            </div>
            <Section id="overview" title="Overview" subtitle="Headline numbers for the selected slice, with the change against the previous period.">
              <KpiStrip />
            </Section>
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
