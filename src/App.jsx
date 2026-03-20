import { AuthScreen } from '@/components/app/auth-screen'
import { AppShell } from '@/components/app/app-shell'
import { removeStoredProfile } from '@/lib/upyun-app'
import { useUpyunAppController } from '@/hooks/use-upyun-app-controller'

export default function App() {
  const controller = useUpyunAppController()
  const { auth } = controller

  if (!auth.token || !auth.profile) {
    return (
      <AuthScreen
        authForm={auth.authForm}
        authHistory={auth.authHistory}
        busy={auth.busy}
        error={auth.error}
        message={auth.message}
        onSubmit={auth.handleLogin}
        onFieldChange={auth.handleAuthFieldChange}
        onRememberChange={(checked) => auth.handleAuthFieldChange('remember', checked)}
        onSelectHistory={auth.handleSelectAuthHistory}
        onRemoveHistory={(key) => auth.setAuthHistory(removeStoredProfile(key))}
      />
    )
  }

  return <AppShell controller={controller} />
}
