import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useFilters } from "./filters";

// Filter changes keep the previous render on screen (dimmed) until new data
// arrives, instead of flashing skeletons.

export function useMeta() {
  return useQuery({ queryKey: ["meta"], queryFn: api.meta, staleTime: Infinity });
}

export function useKpis() {
  const { filters } = useFilters();
  return useQuery({ queryKey: ["kpis", filters], queryFn: () => api.kpis(filters), placeholderData: keepPreviousData });
}

export function useChannels() {
  const { filters } = useFilters();
  return useQuery({ queryKey: ["channels", filters], queryFn: () => api.channels(filters), placeholderData: keepPreviousData });
}

export function useAttribution() {
  return useQuery({ queryKey: ["attribution"], queryFn: api.attribution, staleTime: Infinity });
}

export function useRemovalEffects() {
  return useQuery({ queryKey: ["removal-effects"], queryFn: api.removalEffects, staleTime: Infinity });
}

export function useSankey(top: number) {
  const { filters } = useFilters();
  return useQuery({
    queryKey: ["sankey", filters, top],
    queryFn: () => api.sankey(filters, top),
    placeholderData: keepPreviousData,
  });
}

export function useCampaigns() {
  const { filters } = useFilters();
  return useQuery({ queryKey: ["campaigns", filters], queryFn: () => api.campaigns(filters), placeholderData: keepPreviousData });
}
