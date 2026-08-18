import { QueryClient } from '@tanstack/react-query'

// Disabled globally per spec §17: refetchOnWindowFocus is a documented cause
// of form-content loss (tab focus -> refetch -> state reset). Individual
// queries that genuinely want fresh data on focus can opt back in per-query.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})
