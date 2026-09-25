import { AppHeader } from './components/AppHeader'
import { Dashboard } from './components/Dashboard'
import { EmptyState, ErrorState, LoadingState } from './components/StatusViews'
import { loadAccessKey, saveAccessKey } from './data/accessKey'
import { useProjects } from './hooks/useProjects'

export default function App() {
  const { state, isRefreshing, sourceLabel, reload } = useProjects()

  return (
    <div className="min-h-dvh">
      <AppHeader
        sourceLabel={sourceLabel}
        fetchedAt={state.phase === 'ready' ? state.fetchedAt : undefined}
        isRefreshing={isRefreshing || state.phase === 'loading'}
        canReload={state.phase !== 'error' || state.error.code !== 'NOT_CONFIGURED'}
        onReload={reload}
        onForgetKey={
          state.phase === 'ready' && loadAccessKey()
            ? () => {
                saveAccessKey('')
                reload()
              }
            : undefined
        }
      />
      <main className="mx-auto max-w-7xl px-4 pt-5 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-7 lg:px-8">
        {state.phase === 'loading' && <LoadingState />}
        {state.phase === 'error' && <ErrorState error={state.error} onRetry={reload} />}
        {state.phase === 'ready' &&
          (state.projects.length === 0 ? <EmptyState onRetry={reload} /> : <Dashboard projects={state.projects} />)}
      </main>
    </div>
  )
}
