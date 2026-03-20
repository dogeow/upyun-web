import { Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export function AuthScreen({
  authForm,
  authHistory,
  busy,
  error,
  message,
  onSubmit,
  onFieldChange,
  onRememberChange,
  onSelectHistory,
  onRemoveHistory,
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.14),transparent_38%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_38%),linear-gradient(180deg,#09090b_0%,#111827_100%)]">
      <div className="mx-auto max-w-md">
        <Card className="border-border bg-card shadow-xl shadow-stone-200/40 dark:shadow-black/25">
          <CardHeader>
            <CardTitle>连接又拍云空间</CardTitle>
            <CardDescription>输入服务名、操作员和密码后进入目录。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                placeholder="服务名 / Bucket"
                autoComplete="organization"
                value={authForm.bucketName}
                onChange={(event) => onFieldChange('bucketName', event.target.value)}
              />
              <Input
                placeholder="操作员"
                autoComplete="username"
                value={authForm.operatorName}
                onChange={(event) => onFieldChange('operatorName', event.target.value)}
              />
              <Input
                type="password"
                placeholder="密码"
                autoComplete="current-password"
                value={authForm.password}
                onChange={(event) => onFieldChange('password', event.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={authForm.remember} onChange={(event) => onRememberChange(event.target.checked)} />
                记住此账号
              </label>
              <Button className="w-full" disabled={busy}>
                {busy ? '登录中...' : '登录并进入目录'}
              </Button>
            </form>

            {authHistory.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">最近账号</div>
                  <Badge variant="secondary">{authHistory.length}</Badge>
                </div>
                <div className="space-y-2">
                  {authHistory.map((record) => (
                    <div key={record.key} className="flex items-center justify-between rounded-xl border bg-muted px-3 py-2 text-sm">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelectHistory(record)}>
                        <div className="truncate font-medium">{record.key}</div>
                        <div className="truncate text-muted-foreground">{record.bucketName}</div>
                      </button>
                      <Button variant="ghost" size="icon-sm" onClick={() => onRemoveHistory(record.key)}>
                        <Trash2Icon />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(error || message) && (
              <div
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm',
                  error
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                )}>
                {error || message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
