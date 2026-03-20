import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  Clock3Icon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileArchiveIcon,
  FileCode2Icon,
  FileIcon,
  FileImageIcon,
  FileJsonIcon,
  FileMusicIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderIcon,
  FolderPlusIcon,
  GlobeIcon,
  HardDriveIcon,
  InfoIcon,
  LayoutGridIcon,
  ListIcon,
  LogOutIcon,
  MoonIcon,
  MoreHorizontalIcon,
  PanelLeftOpenIcon,
  PanelRightOpenIcon,
  PencilIcon,
  Settings2Icon,
  SunIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const AUTH_HISTORY_KEY = 'upyun-web.auth-history'
const PROFILE_KEY = 'upyun-web.profile'
const TOKEN_KEY = 'upyun-web.token'
const USAGE_KEY = 'upyun-web.usage'
const VIEW_MODE_KEY = 'upyun-web.view-mode'
const THEME_KEY = 'upyun-web.theme'
const GRID_DENSITY_KEY = 'upyun-web.grid-density'
const OPERATION_HISTORY_KEY = 'upyun-web.operation-history'
const TASKS_KEY = 'upyun-web.tasks'
const PROFILE_SETTINGS_KEY = 'upyun-web.profile-settings'
const MAX_HISTORY_ITEMS = 30
const MAX_TASK_ITEMS = 200
const PROFILE_SETTINGS_DEFAULTS = {
  domain: '',
  urlCopyType: 'url',
}
const COPY_TYPE_OPTIONS = [
  { key: 'url', label: 'URL' },
  { key: 'markdown', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
]

const GRID_DENSITY_OPTIONS = [
  { key: '1', label: '一行一个', columns: 1 },
  { key: '2', label: '一行二个', columns: 2 },
  { key: '3', label: '一行三个', columns: 3 },
  { key: '4', label: '一行四个', columns: 4 },
  { key: '5', label: '一行五个', columns: 5 },
  { key: '6', label: '一行六个', columns: 6 },
  { key: '7', label: '一行七个', columns: 7 },
  { key: '8', label: '一行八个', columns: 8 },
]
const ITEM_FILTER_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'folder', label: '文件夹' },
  { key: 'file', label: '文件' },
]
const SIDEBAR_VIEW_OPTIONS = [
  { key: 'history', label: '操作历史' },
  { key: 'uploads', label: '上传任务' },
  { key: 'downloads', label: '下载任务' },
]
const TASK_STATUS_MAP = {
  running: '进行中',
  completed: '已完成',
  error: '错误',
}
const LEGACY_GRID_DENSITY_MAP = {
  xs: '8',
  s: '6',
  m: '4',
  l: '3',
  xl: '2',
}

const initialAuthForm = {
  bucketName: '',
  operatorName: '',
  password: '',
  remember: true,
}

function readStoredProfileSettingsMap() {
  try {
    const raw = localStorage.getItem(PROFILE_SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function readStoredProfileSettings(profileKey = '') {
  if (!profileKey) return { ...PROFILE_SETTINGS_DEFAULTS }
  const map = readStoredProfileSettingsMap()
  return {
    ...PROFILE_SETTINGS_DEFAULTS,
    ...(map[profileKey] || {}),
  }
}

function persistStoredProfileSettings(profileKey = '', settings = {}) {
  if (!profileKey) return { ...PROFILE_SETTINGS_DEFAULTS, ...settings }

  const map = readStoredProfileSettingsMap()
  const nextSettings = {
    ...PROFILE_SETTINGS_DEFAULTS,
    ...(map[profileKey] || {}),
    ...settings,
  }

  map[profileKey] = nextSettings
  localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(map))
  return nextSettings
}

function readStoredProfiles() {
  try {
    const raw = localStorage.getItem(AUTH_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistStoredProfiles(list) {
  localStorage.setItem(AUTH_HISTORY_KEY, JSON.stringify(list))
}

function upsertStoredProfile(profile) {
  const next = [profile, ...readStoredProfiles().filter((item) => item.key !== profile.key)].slice(0, 6)
  persistStoredProfiles(next)
  return next
}

function removeStoredProfile(key) {
  const next = readStoredProfiles().filter((item) => item.key !== key)
  persistStoredProfiles(next)
  return next
}

function readStoredViewMode() {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function readStoredGridDensity() {
  try {
    const raw = localStorage.getItem(GRID_DENSITY_KEY)
    if (GRID_DENSITY_OPTIONS.some((item) => item.key === raw)) return raw
    return LEGACY_GRID_DENSITY_MAP[raw] || '4'
  } catch {
    return '4'
  }
}

function readStoredOperationHistory() {
  try {
    const raw = sessionStorage.getItem(OPERATION_HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item) => item?.type !== 'upload' && item?.type !== 'download') : []
  } catch {
    return []
  }
}

function readStoredTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistStoredTasks(list) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(list))
}

function createTaskRecord({
  type,
  title,
  detail,
  profileKey = '',
  status = 'running',
  total = 0,
  completed = 0,
  errorMessage = '',
}) {
  const now = Date.now()
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    detail,
    profileKey,
    status,
    total,
    completed,
    errorMessage,
    createdAt: now,
    updatedAt: now,
  }
}

function isTaskEnded(task) {
  return task.status === 'completed' || task.status === 'error'
}

function getTaskStatusLabel(task) {
  return TASK_STATUS_MAP[task.status] || task.status || '--'
}

function getTaskBadgeVariant(task) {
  if (task.status === 'error') return 'destructive'
  if (task.status === 'completed') return 'outline'
  return 'secondary'
}

function formatTaskProgress(task) {
  if (!task.total) return '--'
  return `${task.completed || 0}/${task.total}`
}

function getTaskEmptyText(type) {
  if (type === 'upload') return '没有上传任务'
  if (type === 'download') return '没有下载任务'
  return '暂无操作记录'
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return '--'
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(timestamp) {
  if (!timestamp) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

function formatHistoryTime(timestamp) {
  if (!timestamp) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

function getParentPath(targetPath = '/') {
  const parts = targetPath.split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `/${parts.join('/')}/` : '/'
}

function getPathSegments(targetPath = '/') {
  const parts = targetPath.split('/').filter(Boolean)
  return [{ label: '/', path: '/' }, ...parts.map((part, index) => ({
    label: part,
    path: `/${parts.slice(0, index + 1).join('/')}/`,
  }))]
}

function getFileKind(item) {
  if (item.folderType === 'F') return 'folder'
  const extension = item.filename.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image'
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) return 'audio'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(extension)) return 'video'
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(extension)) return 'archive'
  if (['json'].includes(extension)) return 'json'
  if (['js', 'jsx', 'ts', 'tsx', 'vue', 'css', 'scss', 'html', 'md'].includes(extension)) return 'code'
  if (['txt', 'log'].includes(extension)) return 'text'
  return 'file'
}

function getItemNameFromPath(targetPath = '') {
  const name = targetPath.split('/').filter(Boolean).pop() || targetPath

  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

function getMovedPath(sourcePath = '', targetPath = '') {
  const itemName = sourcePath.split('/').filter(Boolean).pop() || ''
  if (!itemName || !targetPath) return ''
  return `${targetPath}${itemName}${sourcePath.endsWith('/') ? '/' : ''}`
}

function getDefaultDomain(profile) {
  return profile?.bucketName ? `http://${profile.bucketName}.test.upcdn.net` : ''
}

function normalizeConfiguredDomain(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const parsed = new URL(trimmed)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('域名必须以 http:// 或 https:// 开头')
  }

  const pathname = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.origin}${pathname}`
}

function getPublicBaseUrl(profile, settings) {
  const configured = String(settings?.domain || '').trim()

  if (configured) {
    try {
      return normalizeConfiguredDomain(configured)
    } catch {
      return getDefaultDomain(profile)
    }
  }

  return getDefaultDomain(profile)
}

function buildPublicUrl(profile, settings, targetPath = '') {
  const baseUrl = getPublicBaseUrl(profile, settings)
  if (!baseUrl || !targetPath) return ''

  try {
    return new URL(String(targetPath).replace(/^\/+/, ''), `${baseUrl.replace(/\/+$/, '')}/`).href
  } catch {
    return ''
  }
}

function getDomainConsoleUrl(profile) {
  return profile?.bucketName
    ? `https://console.upyun.com/services/${profile.bucketName}/domainsFile/`
    : 'https://console.upyun.com/services/create/file/'
}

function getCreateBucketUrl() {
  return 'https://console.upyun.com/services/create/file/'
}

function buildCopyText(type, item, link) {
  if (!item || !link) return ''

  const title = getItemNameFromPath(item.uri || item.filename || '')
  const baseTitle = title.includes('.') ? title.replace(/\.[^.]+$/, '') : title
  const kind = getFileKind(item)

  if (type === 'markdown') {
    return kind === 'image' ? `![${baseTitle}](${link})` : `[${baseTitle}](${link})`
  }

  if (type === 'html') {
    if (kind === 'image') return `<img src="${link}" alt="${baseTitle}">`
    if (kind === 'audio') return `<audio src="${link}"></audio>`
    if (kind === 'video') return `<video src="${link}"></video>`
    return `<a href="${link}">${baseTitle}</a>`
  }

  return link
}

async function copyTextToClipboard(value = '') {
  if (!value) return

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureDirectoryHandle(rootHandle, relativePath = '') {
  const segments = relativePath.split('/').filter(Boolean)
  let currentHandle = rootHandle

  for (const segment of segments) {
    currentHandle = await currentHandle.getDirectoryHandle(segment, { create: true })
  }

  return currentHandle
}

async function writeResponseToFile(fileHandle, response) {
  const writable = await fileHandle.createWritable()

  if (response.body?.pipeTo) {
    await response.body.pipeTo(writable)
    return
  }

  const blob = await response.blob()
  await writable.write(blob)
  await writable.close()
}

function normalizeDownloadRelativePath(rootName = '', relativePath = '') {
  const normalizedRoot = String(rootName || '').replace(/^\/+|\/+$/g, '')
  const normalizedPath = String(relativePath || '').replace(/^\/+/, '')

  if (!normalizedRoot || !normalizedPath) {
    return normalizedPath
  }

  const rootPrefix = `${normalizedRoot}/`
  if (normalizedPath === normalizedRoot) {
    return ''
  }

  if (normalizedPath.startsWith(rootPrefix)) {
    return normalizedPath.slice(rootPrefix.length)
  }

  return normalizedPath
}

function canMovePath(sourcePath = '', targetPath = '') {
  if (!sourcePath || !targetPath) return false
  if (sourcePath === targetPath) return false
  if (getParentPath(sourcePath) === targetPath) return false
  if (sourcePath.endsWith('/') && targetPath.startsWith(sourcePath)) return false
  return true
}

function FileTypeIcon({ item, className }) {
  const kind = getFileKind(item)
  const classes = cn(
    'size-4 shrink-0',
    kind === 'folder' && 'text-amber-500',
    kind === 'image' && 'text-sky-500',
    kind === 'audio' && 'text-rose-500',
    kind === 'video' && 'text-indigo-500',
    kind === 'archive' && 'text-orange-500',
    kind === 'json' && 'text-emerald-500',
    kind === 'code' && 'text-violet-500',
    kind === 'text' && 'text-stone-500',
    kind === 'file' && 'text-muted-foreground',
    className,
  )

  if (kind === 'folder') return <FolderIcon className={classes} />
  if (kind === 'image') return <FileImageIcon className={classes} />
  if (kind === 'audio') return <FileMusicIcon className={classes} />
  if (kind === 'video') return <FileVideoIcon className={classes} />
  if (kind === 'archive') return <FileArchiveIcon className={classes} />
  if (kind === 'json') return <FileJsonIcon className={classes} />
  if (kind === 'code') return <FileCode2Icon className={classes} />
  if (kind === 'text') return <FileTextIcon className={classes} />
  return <FileIcon className={classes} />
}

function ThumbnailPreview({ item, token }) {
  const [imageFailed, setImageFailed] = useState(false)
  const kind = getFileKind(item)

  if (item.folderType === 'F') {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fef3c7_0%,#f5f5f4_100%)] text-amber-500">
        <FolderIcon className="size-18" />
      </div>
    )
  }

  if (kind === 'image' && token && !imageFailed) {
    return (
      <img
        alt={item.filename}
        className="h-full w-full object-cover"
        src={api.previewUrl(token, item.uri)}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fafaf9_0%,#f1f5f9_100%)] text-stone-500">
      <FileTypeIcon item={item} className="size-18" />
    </div>
  )
}

function GridItemCard({
  item,
  token,
  active,
  busy,
  touchMode,
  selectionMode,
  dropActive,
  previewAspectClassName,
  actions,
  onToggleSelection,
  onClick,
  onDoubleClick,
  onKeyDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const cardRef = useRef(null)
  const [cardWidth, setCardWidth] = useState(160)

  useEffect(() => {
    const node = cardRef.current
    if (!node) return

    const updateWidth = () => {
      setCardWidth(node.getBoundingClientRect().width)
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width
      setCardWidth(width || node.getBoundingClientRect().width)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const showCheckbox = cardWidth > 80 && (!touchMode || selectionMode)
  const showMoreButton = touchMode || cardWidth > 80
  const showMeta = cardWidth >= 120

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      draggable={!busy}
      className={cn(
        'overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:shadow-black/20',
        active && 'border-sky-300 ring-2 ring-sky-200',
        dropActive && 'border-sky-400 bg-sky-50 ring-2 ring-sky-300',
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}>
      <div className={cn('relative overflow-hidden bg-muted', previewAspectClassName)}>
        <ThumbnailPreview item={item} token={token} />
        {(showCheckbox || showMoreButton) && (
          <div className="absolute inset-x-1.5 top-1.5 z-10 flex items-center justify-between gap-2">
            {showCheckbox ? (
              <label
                className="flex size-7 items-center justify-center rounded-lg bg-background/85 backdrop-blur-sm"
                onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => onToggleSelection(event.target.checked)}
                />
              </label>
            ) : (
              <div />
            )}
            {showMoreButton && (
              <div
                className="rounded-lg bg-background/85 backdrop-blur-sm"
                onClick={(event) => event.stopPropagation()}>
                {actions}
              </div>
            )}
          </div>
        )}
        {dropActive && (
          <div className="absolute inset-x-4 bottom-4 rounded-full bg-sky-600/90 px-3 py-1 text-center text-xs font-medium text-white">
            移动到这里
          </div>
        )}
      </div>

      {showMeta && (
        <div className="space-y-1 border-t px-2.5 py-2.5">
          <div className="truncate text-sm font-medium leading-tight">{item.filename}</div>
          {item.folderType !== 'F' && (
            <div className="truncate text-xs text-muted-foreground">{formatBytes(item.size)}</div>
          )}
        </div>
      )}
    </div>
  )
}

function compareStrings(a, b) {
  return a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' })
}

function matchesItemFilter(item, itemFilter) {
  if (itemFilter === 'folder') return item.folderType === 'F'
  if (itemFilter === 'file') return item.folderType !== 'F'
  return true
}

function sortItems(items, sortState) {
  const list = [...items]
  list.sort((left, right) => {
    if (left.folderType !== right.folderType) {
      return left.folderType === 'F' ? -1 : 1
    }

    let result = 0
    if (sortState.key === 'size') {
      result = Number(left.size) - Number(right.size)
    } else if (sortState.key === 'lastModified') {
      result = Number(left.lastModified) - Number(right.lastModified)
    } else {
      result = compareStrings(left.filename, right.filename)
    }

    if (result === 0) {
      result = compareStrings(left.filename, right.filename)
    }

    return sortState.direction === 'asc' ? result : -result
  })

  return list
}

export default function App() {
  const storedProfile = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || 'null')
    } catch {
      return null
    }
  })()
  const storedProfileSettings = readStoredProfileSettings(storedProfile?.key)

  const [authForm, setAuthForm] = useState({
    ...initialAuthForm,
    bucketName: storedProfile?.bucketName || '',
    operatorName: storedProfile?.operatorName || '',
  })
  const [authHistory, setAuthHistory] = useState(readStoredProfiles)
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [profile, setProfile] = useState(storedProfile)
  const [usage, setUsage] = useState(() => Number(sessionStorage.getItem(USAGE_KEY) || 0))
  const [items, setItems] = useState([])
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedPaths, setSelectedPaths] = useState([])
  const [sortState, setSortState] = useState({ key: 'lastModified', direction: 'desc' })
  const [viewMode, setViewMode] = useState(readStoredViewMode)
  const [theme, setTheme] = useState(readStoredTheme)
  const [gridDensity, setGridDensity] = useState(readStoredGridDensity)
  const [itemFilter, setItemFilter] = useState('all')
  const [profileSettings, setProfileSettings] = useState(storedProfileSettings)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState('history')
  const [operationHistory, setOperationHistory] = useState(readStoredOperationHistory)
  const [tasks, setTasks] = useState(readStoredTasks)
  const [dragSourcePath, setDragSourcePath] = useState('')
  const [dropTargetPath, setDropTargetPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [touchMode, setTouchMode] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [domainValue, setDomainValue] = useState(storedProfileSettings.domain || '')
  const [domainError, setDomainError] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailPath, setDetailPath] = useState('')
  const [detailHeaders, setDetailHeaders] = useState({})
  const [detailHeadersOpen, setDetailHeadersOpen] = useState(false)
  const [detailFolderSummary, setDetailFolderSummary] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveTargets, setMoveTargets] = useState([])
  const [moveBrowsePath, setMoveBrowsePath] = useState('/')
  const [moveFolders, setMoveFolders] = useState([])
  const [moveLoading, setMoveLoading] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const moveLoadTokenRef = useRef(0)
  const detailLoadTokenRef = useRef(0)

  const selectedItems = useMemo(
    () => items.filter((item) => selectedPaths.includes(item.uri)),
    [items, selectedPaths],
  )
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null
  const selectedFileItem = selectedItem && selectedItem.folderType !== 'F' ? selectedItem : null
  const sortedItems = useMemo(() => sortItems(items, sortState), [items, sortState])
  const visibleItems = useMemo(
    () => sortedItems.filter((item) => matchesItemFilter(item, itemFilter)),
    [itemFilter, sortedItems],
  )
  const currentProfileTasks = useMemo(
    () => tasks.filter((task) => task.profileKey === (profile?.key || '')),
    [profile?.key, tasks],
  )
  const latestUndoEntry = useMemo(
    () =>
      operationHistory.find(
        (item) => item.status === 'done' && item.undo && (item.type === 'move' || item.type === 'rename'),
      ) || null,
    [operationHistory],
  )
  const uploadTasks = useMemo(
    () => currentProfileTasks.filter((task) => task.type === 'upload'),
    [currentProfileTasks],
  )
  const downloadTasks = useMemo(
    () => currentProfileTasks.filter((task) => task.type === 'download'),
    [currentProfileTasks],
  )
  const runningTaskCount = useMemo(
    () => currentProfileTasks.filter((task) => task.status === 'running').length,
    [currentProfileTasks],
  )
  const statusIndicatorText = error || message || (runningTaskCount ? `${runningTaskCount} 个任务进行中` : '任务与历史')
  const detailItem = useMemo(() => items.find((item) => item.uri === detailPath) || null, [items, detailPath])
  const activePublicBaseUrl = useMemo(() => getPublicBaseUrl(profile, profileSettings), [profile, profileSettings])
  const detailPublicUrl = useMemo(
    () =>
      detailItem && detailItem.folderType !== 'F'
        ? buildPublicUrl(profile, profileSettings, detailItem.uri)
        : '',
    [detailItem, profile, profileSettings],
  )
  const detailHeaderEntries = useMemo(() => Object.entries(detailHeaders || {}), [detailHeaders])
  const canRenameSelected = Boolean(selectedItem)
  const canDownloadSelected = selectedPaths.length > 0
  const canDeleteSelected = selectedPaths.length > 0
  const canCopyLinkSelected = Boolean(selectedFileItem)
  const canOpenInBrowserSelected = Boolean(selectedFileItem)
  const canViewDetailSelected = Boolean(selectedItem)
  const canConfirmMove = Boolean(
    moveTargets.length &&
    moveTargets.every((item) => canMovePath(item.uri, moveBrowsePath)),
  )
  const availableGridDensityOptions = useMemo(
    () => (touchMode ? GRID_DENSITY_OPTIONS.filter((item) => item.columns <= 4) : GRID_DENSITY_OPTIONS),
    [touchMode],
  )
  const activeGridDensity = useMemo(
    () =>
      availableGridDensityOptions.find((item) => item.key === gridDensity) ||
      availableGridDensityOptions[availableGridDensityOptions.length - 1] ||
      GRID_DENSITY_OPTIONS[3],
    [availableGridDensityOptions, gridDensity],
  )
  const gridColumnsStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${activeGridDensity.columns}, minmax(0, 1fr))` }),
    [activeGridDensity],
  )
  const gridGapClass = useMemo(() => {
    if (activeGridDensity.columns >= 7) return 'gap-2'
    if (activeGridDensity.columns >= 4) return 'gap-3'
    return 'gap-4'
  }, [activeGridDensity])

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    localStorage.setItem(GRID_DENSITY_KEY, gridDensity)
  }, [gridDensity])

  useEffect(() => {
    if (!availableGridDensityOptions.some((item) => item.key === gridDensity)) {
      setGridDensity(availableGridDensityOptions[availableGridDensityOptions.length - 1]?.key || '4')
    }
  }, [availableGridDensityOptions, gridDensity])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

    const mediaQuery = window.matchMedia('(hover: none), (pointer: coarse)')
    const updateTouchMode = () => setTouchMode(mediaQuery.matches)

    updateTouchMode()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateTouchMode)
      return () => mediaQuery.removeEventListener('change', updateTouchMode)
    }

    mediaQuery.addListener(updateTouchMode)
    return () => mediaQuery.removeListener(updateTouchMode)
  }, [])

  useEffect(() => {
    if (!touchMode) {
      setSelectionMode(false)
    }
  }, [touchMode])

  useEffect(() => {
    setSelectedPaths((current) => current.filter((path) => {
      const item = items.find((entry) => entry.uri === path)
      return item ? matchesItemFilter(item, itemFilter) : false
    }))
  }, [itemFilter, items])

  useEffect(() => {
    sessionStorage.setItem(OPERATION_HISTORY_KEY, JSON.stringify(operationHistory))
  }, [operationHistory])

  useEffect(() => {
    persistStoredTasks(tasks)
  }, [tasks])

  useEffect(() => {
    const nextSettings = readStoredProfileSettings(profile?.key)
    setProfileSettings(nextSettings)
    setDomainValue(nextSettings.domain || '')
    setDomainError('')
  }, [profile?.key])

  useEffect(() => {
    if (!detailOpen || !selectedItem || selectedItem.uri === detailPath) return
    setDetailPath(selectedItem.uri)
  }, [detailOpen, detailPath, selectedItem])

  useEffect(() => {
    setDetailHeadersOpen(false)
  }, [detailPath])

  useEffect(() => {
    if (!detailOpen) return

    if (!detailPath || !detailItem) {
      setDetailOpen(false)
      setDetailPath('')
      setDetailHeaders({})
      setDetailFolderSummary(null)
      setDetailError('')
      setDetailLoading(false)
      detailLoadTokenRef.current += 1
    }
  }, [detailItem, detailOpen, detailPath])

  useEffect(() => {
    if (!detailOpen || !detailItem || !token) return

    const requestToken = ++detailLoadTokenRef.current
    setDetailLoading(true)
    setDetailError('')
    setDetailHeaders({})
    setDetailFolderSummary(null)

    if (detailItem.folderType === 'F') {
      api
        .list(token, detailItem.uri)
        .then((response) => {
          if (requestToken !== detailLoadTokenRef.current) return
          const children = response.data || []
          const folders = children.filter((item) => item.folderType === 'F').length
          const files = children.length - folders
          setDetailFolderSummary({
            total: children.length,
            folders,
            files,
            sample: children.slice(0, 8),
          })
        })
        .catch((requestError) => {
          if (requestToken !== detailLoadTokenRef.current) return
          setDetailError(requestError.message)
        })
        .finally(() => {
          if (requestToken === detailLoadTokenRef.current) {
            setDetailLoading(false)
          }
        })
      return
    }

    api
      .meta(token, detailItem.uri)
      .then((response) => {
        if (requestToken !== detailLoadTokenRef.current) return
        setDetailHeaders(response.headers || {})
      })
      .catch((requestError) => {
        if (requestToken !== detailLoadTokenRef.current) return
        setDetailHeaders({})
        setDetailError(requestError.message)
      })
      .finally(() => {
        if (requestToken === detailLoadTokenRef.current) {
          setDetailLoading(false)
        }
      })
  }, [detailItem, detailOpen, token])

  useEffect(() => {
    if (!moveOpen || !moveTargets.length || !token) return

    const requestToken = ++moveLoadTokenRef.current
    setMoveLoading(true)

    api
      .list(token, moveBrowsePath)
      .then((response) => {
        if (requestToken !== moveLoadTokenRef.current) return
        const targetPaths = new Set(moveTargets.map((item) => item.uri))
        const folders = response.data.filter(
          (item) =>
            item.folderType === 'F' &&
            !targetPaths.has(item.uri) &&
            !moveTargets.some((target) => target.uri.endsWith('/') && item.uri.startsWith(target.uri)),
        )
        setMoveFolders(folders)
      })
      .catch((requestError) => {
        if (requestToken !== moveLoadTokenRef.current) return
        setMoveFolders([])
        setError(requestError.message)
      })
      .finally(() => {
        if (requestToken === moveLoadTokenRef.current) {
          setMoveLoading(false)
        }
      })
  }, [moveBrowsePath, moveOpen, moveTargets, token])

  async function loadDirectory(nextPath = currentPath) {
    if (!token) return
    setLoading(true)
    setError('')
    setDropTargetPath('')

    try {
      const response = await api.list(token, nextPath)
      setCurrentPath(response.path)
      setItems(response.data)
      setSelectedPaths([])
    } catch (requestError) {
      setError(requestError.message)
      if (/未登录|过期/.test(requestError.message)) {
        clearSession(false)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadDirectory('/').catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function rememberSession(nextToken, nextProfile, nextUsage) {
    sessionStorage.setItem(TOKEN_KEY, nextToken)
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile))
    sessionStorage.setItem(USAGE_KEY, String(nextUsage || 0))
  }

  function clearTransientDragState() {
    setDragSourcePath('')
    setDropTargetPath('')
  }

  function pushHistoryEntry(entry) {
    setOperationHistory((current) => [entry, ...current].slice(0, MAX_HISTORY_ITEMS))
  }

  function replaceHistoryEntry(entryId, updater) {
    setOperationHistory((current) =>
      current.map((item) => (item.id === entryId ? { ...item, ...updater(item) } : item)),
    )
  }

  function createHistoryEntry({ type, title, detail, undo = null }) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      detail,
      undo,
      createdAt: Date.now(),
      status: 'done',
    }
  }

  function prependTask(task) {
    setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, MAX_TASK_ITEMS))
  }

  function updateTask(taskId, updater) {
    setTasks((current) =>
      current.map((item) => {
        if (item.id !== taskId) return item
        const next = typeof updater === 'function' ? updater(item) : updater
        return {
          ...item,
          ...next,
          updatedAt: Date.now(),
        }
      }),
    )
  }

  function deleteTask(taskId) {
    setTasks((current) => current.filter((item) => item.id !== taskId))
  }

  function clearCompletedTasks(type) {
    setTasks((current) => current.filter((item) => !(item.type === type && item.profileKey === (profile?.key || '') && isTaskEnded(item))))
  }

  function clearSession(notify = true) {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(PROFILE_KEY)
    sessionStorage.removeItem(USAGE_KEY)
    sessionStorage.removeItem(OPERATION_HISTORY_KEY)
    setToken('')
    setProfile(null)
    setUsage(0)
    setItems([])
    setSelectedPaths([])
    setCurrentPath('/')
    setOperationHistory([])
    setHistoryOpen(false)
    setActivityOpen(false)
    setSidebarView('history')
    setProfileSettings({ ...PROFILE_SETTINGS_DEFAULTS })
    setSettingsOpen(false)
    setDomainValue('')
    setDomainError('')
    setDetailOpen(false)
    setDetailPath('')
    setDetailHeaders({})
    setDetailFolderSummary(null)
    setDetailError('')
    setDetailLoading(false)
    clearTransientDragState()
    if (notify) {
      setMessage('已退出当前账号')
    }
  }

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  function saveProfileSettings(updates) {
    const nextSettings = persistStoredProfileSettings(profile?.key, updates)
    setProfileSettings(nextSettings)
    return nextSettings
  }

  function handleSettingsOpenChange(nextOpen) {
    setSettingsOpen(nextOpen)
    if (nextOpen) {
      setDomainValue(profileSettings.domain || '')
      setDomainError('')
    }
  }

  async function handleSaveDomain() {
    setBusy(true)
    setDomainError('')
    setError('')

    try {
      const normalizedDomain = domainValue.trim() ? normalizeConfiguredDomain(domainValue) : ''
      const nextSettings = saveProfileSettings({ domain: normalizedDomain })
      pushHistoryEntry(
        createHistoryEntry({
          type: 'settings',
          title: '链接设置',
          detail: normalizedDomain ? `已更新加速域名为 ${normalizedDomain}` : '已恢复为默认测试域名',
        }),
      )
      setDomainValue(nextSettings.domain || '')
      setSettingsOpen(false)
      setMessage(normalizedDomain ? '已更新加速域名' : '已恢复为默认测试域名')
    } catch (requestError) {
      setDomainError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCopyLink(item = selectedFileItem, copyType = profileSettings.urlCopyType) {
    if (!item || item.folderType === 'F') return

    const publicUrl = buildPublicUrl(profile, profileSettings, item.uri)
    if (!publicUrl) {
      setError('当前无法生成外链，请先检查链接设置')
      return
    }

    try {
      await copyTextToClipboard(buildCopyText(copyType, item, publicUrl))
      saveProfileSettings({ urlCopyType: copyType })
      setMessage(`已复制 ${COPY_TYPE_OPTIONS.find((item) => item.key === copyType)?.label || '链接'}`)
    } catch (requestError) {
      setError(requestError.message || '复制失败')
    }
  }

  function openDetail(item = selectedItem) {
    if (!item) return
    selectOnly(item.uri)
    setDetailPath(item.uri)
    setDetailOpen(true)
  }

  function handleDetailOpenChange(nextOpen) {
    setDetailOpen(nextOpen)
    if (!nextOpen) {
      detailLoadTokenRef.current += 1
      setDetailPath('')
      setDetailHeaders({})
      setDetailError('')
      setDetailLoading(false)
    }
  }

  function handleOpenInBrowser(item = selectedFileItem) {
    if (!item || item.folderType === 'F') return

    const url = buildPublicUrl(profile, profileSettings, item.uri)
    if (!url) {
      setError('当前无法生成外链')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
    setMessage(`已在浏览器中打开 ${item.filename}`)
  }

  async function handleLogin(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const response = await api.login({
        bucketName: authForm.bucketName.trim(),
        operatorName: authForm.operatorName.trim(),
        password: authForm.password,
      })

      setToken(response.token)
      setProfile(response.profile)
      setUsage(response.usage)
      rememberSession(response.token, response.profile, response.usage)

      if (authForm.remember) {
        const history = upsertStoredProfile({
          key: response.profile.key,
          bucketName: authForm.bucketName.trim(),
          operatorName: authForm.operatorName.trim(),
          password: authForm.password,
        })
        setAuthHistory(history)
      }

      setAuthForm((current) => ({ ...current, password: '' }))
      setOperationHistory([])
      setMessage('登录成功')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    try {
      if (token) {
        await api.logout(token)
      }
    } catch {
      // Ignore logout errors; local cleanup still matters.
    } finally {
      clearSession()
    }
  }

  function selectOnly(itemPath) {
    setSelectedPaths([itemPath])
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => {
      const next = !current
      if (!next) {
        setSelectedPaths([])
      }
      return next
    })
  }

  function toggleSelection(itemPath, checked) {
    setSelectedPaths((current) => {
      if (checked) {
        return current.includes(itemPath) ? current : [...current, itemPath]
      }
      return current.filter((path) => path !== itemPath)
    })
  }

  function handleSort(key) {
    setSortState((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  function prepareRename(item) {
    if (!item) return
    setRenameValue(item.filename)
    setRenameOpen(true)
  }

  function prepareMove(item) {
    if (!item) return
    selectOnly(item.uri)
    setMoveTargets([item])
    setMoveBrowsePath(getParentPath(item.uri))
    setMoveFolders([])
    setMoveOpen(true)
    setError('')
  }

  function prepareMoveSelected() {
    if (selectedItems.length < 2) return
    setMoveTargets(selectedItems)
    setMoveBrowsePath(getParentPath(selectedItems[0].uri))
    setMoveFolders([])
    setMoveOpen(true)
    setError('')
  }

  function handleMoveDialogChange(nextOpen) {
    setMoveOpen(nextOpen)
    if (!nextOpen) {
      setMoveTargets([])
      setMoveBrowsePath('/')
      setMoveFolders([])
      setMoveLoading(false)
      moveLoadTokenRef.current += 1
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return
    setBusy(true)
    setError('')

    try {
      const response = await api.createFolder(token, {
        path: currentPath,
        folderName: newFolderName.trim(),
      })
      pushHistoryEntry(
        createHistoryEntry({
          type: 'folder',
          title: '新建文件夹',
          detail: `${currentPath}${newFolderName.trim()}/`,
        }),
      )
      setItems(response.listing.data)
      setMessage(`已创建文件夹 ${newFolderName.trim()}`)
      setNewFolderName('')
      setCreateOpen(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRename() {
    if (!selectedItem || !renameValue.trim()) return
    setBusy(true)
    setError('')

    const oldPath = selectedItem.uri
    const isFolder = oldPath.endsWith('/')
    const parentPath = getParentPath(oldPath)
    const nextName = renameValue.trim()
    const newPath = `${parentPath}${nextName}${isFolder ? '/' : ''}`

    try {
      const response = await api.rename(token, {
        oldPath,
        newPath,
        isFolder,
        currentPath,
      })
      const entry = createHistoryEntry({
        type: 'rename',
        title: '重命名',
        detail: `${getItemNameFromPath(oldPath)} -> ${nextName}`,
        undo: {
          oldPath: newPath,
          newPath: oldPath,
          isFolder,
          name: getItemNameFromPath(oldPath),
        },
      })
      pushHistoryEntry(entry)
      setItems(response.listing.data)
      setSelectedPaths([])
      setRenameOpen(false)
      setMessage(`已重命名为 ${nextName}`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(sourcePath, targetPath) {
    return handleMoveMany([sourcePath], targetPath)
  }

  async function handleMoveMany(sourcePaths, targetPath) {
    if (!sourcePaths.length) return false
    if (sourcePaths.some((sourcePath) => !canMovePath(sourcePath, targetPath))) return false

    setBusy(true)
    setError('')
    clearTransientDragState()

    try {
      const response = await api.move(token, {
        sourcePaths,
        targetPath,
        currentPath,
      })

      if (sourcePaths.length === 1) {
        const sourcePath = sourcePaths[0]
        const movedPath = getMovedPath(sourcePath, targetPath)
        const entry = createHistoryEntry({
          type: 'move',
          title: '移动',
          detail: `${getItemNameFromPath(sourcePath)} -> ${targetPath}`,
          undo: {
            sourcePath: movedPath,
            targetPath: getParentPath(sourcePath),
            name: getItemNameFromPath(sourcePath),
          },
        })
        pushHistoryEntry(entry)
        setMessage(`已移动 ${getItemNameFromPath(sourcePath)} 到 ${targetPath}`)
      } else {
        pushHistoryEntry(
          createHistoryEntry({
            type: 'move',
            title: '批量移动',
            detail: `${sourcePaths.length} 项 -> ${targetPath}`,
          }),
        )
        setMessage(`已移动 ${sourcePaths.length} 项到 ${targetPath}`)
      }

      setItems(response?.listing?.data || [])
      setSelectedPaths([])
      return true
    } catch (requestError) {
      if (requestError?.data?.listing?.data) {
        setItems(requestError.data.listing.data)
        setSelectedPaths([])
      }
      setError(requestError.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleMoveFromDialog() {
    if (!moveTargets.length) return
    if (moveTargets.some((item) => !canMovePath(item.uri, moveBrowsePath))) {
      setError('目标目录与当前目录相同，或目标目录无效')
      return
    }

    const succeeded = await handleMoveMany(moveTargets.map((item) => item.uri), moveBrowsePath)
    if (succeeded) {
      handleMoveDialogChange(false)
    }
  }

  async function handleUndoMove(entry) {
    if (!entry?.undo || entry.type !== 'move') return

    setBusy(true)
    setError('')

    try {
      const response = await api.move(token, {
        sourcePath: entry.undo.sourcePath,
        targetPath: entry.undo.targetPath,
        currentPath,
      })
      setItems(response.listing.data)
      setSelectedPaths([])
      replaceHistoryEntry(entry.id, () => ({ status: 'undone' }))
      setMessage(`已撤销移动 ${entry.undo.name}`)
    } catch (requestError) {
      if (requestError?.data?.listing?.data) {
        setItems(requestError.data.listing.data)
        setSelectedPaths([])
      }
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleUndoRename(entry) {
    if (!entry?.undo || entry.type !== 'rename') return

    setBusy(true)
    setError('')

    try {
      const response = await api.rename(token, {
        oldPath: entry.undo.oldPath,
        newPath: entry.undo.newPath,
        isFolder: entry.undo.isFolder,
        currentPath,
      })
      setItems(response.listing.data)
      setSelectedPaths([])
      replaceHistoryEntry(entry.id, () => ({ status: 'undone' }))
      setMessage(`已撤销重命名 ${entry.undo.name}`)
    } catch (requestError) {
      if (requestError?.data?.listing?.data) {
        setItems(requestError.data.listing.data)
        setSelectedPaths([])
      }
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleUndoAction(entry = latestUndoEntry) {
    if (!entry?.undo) return

    if (entry.type === 'move') {
      await handleUndoMove(entry)
      return
    }

    if (entry.type === 'rename') {
      await handleUndoRename(entry)
    }
  }

  async function handleDelete(targets = selectedPaths) {
    if (!targets.length) return
    const confirmText =
      targets.length === 1 ? '确定删除当前文件吗？此操作不可恢复。' : `确定删除这 ${targets.length} 项吗？此操作不可恢复。`

    if (!window.confirm(confirmText)) return

    setBusy(true)
    setError('')

    try {
      const response = await api.deleteFiles(token, {
        paths: targets,
        currentPath,
      })
      pushHistoryEntry(
        createHistoryEntry({
          type: 'delete',
          title: '删除',
          detail: targets.length === 1 ? getItemNameFromPath(targets[0]) : `共删除 ${targets.length} 项`,
        }),
      )
      setItems(response.listing.data)
      setSelectedPaths([])
      setMessage('删除完成')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const task = createTaskRecord({
      type: 'upload',
      title: files.length === 1 ? files[0].name : `${files.length} 个文件`,
      detail: `${currentPath} 等待上传`,
      profileKey: profile?.key || '',
      total: files.length,
      completed: 0,
    })

    prependTask(task)
    setBusy(true)
    setError('')

    try {
      const relativePaths = files.map((file) => file.webkitRelativePath || file.name)
      const response = await api.upload(token, {
        remotePath: currentPath,
        files,
        relativePaths,
      })

      const succeeded = response.results.filter((item) => item.result).length
      updateTask(task.id, {
        status: succeeded === response.results.length ? 'completed' : 'error',
        detail: `${currentPath} 成功 ${succeeded}/${response.results.length}`,
        total: response.results.length,
        completed: succeeded,
        errorMessage: succeeded === response.results.length ? '' : '部分文件上传失败',
      })
      setItems(response.listing.data)
      setSelectedPaths([])
      setMessage(`上传完成，成功 ${succeeded}/${response.results.length}`)
    } catch (requestError) {
      updateTask(task.id, {
        status: 'error',
        detail: `${currentPath} 上传失败`,
        total: files.length,
        completed: 0,
        errorMessage: requestError.message,
      })
      setError(requestError.message)
    } finally {
      event.target.value = ''
      setBusy(false)
    }
  }

  async function handleDownload(target = selectedItem) {
    const downloadTargets = Array.isArray(target)
      ? target
      : target
        ? [target]
        : selectedItems

    if (!downloadTargets.length) return

    const task = createTaskRecord({
      type: 'download',
      title: downloadTargets.length === 1 ? downloadTargets[0].filename : `${downloadTargets.length} 个项目`,
      detail: '等待下载',
      profileKey: profile?.key || '',
      total: downloadTargets.length,
      completed: 0,
    })

    prependTask(task)
    setError('')
    setBusy(true)

    try {
      const hasFolders = downloadTargets.some((item) => item.folderType === 'F')
      const canPickDirectory =
        typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

      if (hasFolders && canPickDirectory) {
        updateTask(task.id, { detail: '等待选择保存目录' })
        setMessage(`请选择 ${downloadTargets.length} 个项目的保存位置`)
        const baseHandle = await window.showDirectoryPicker({ mode: 'readwrite' })

        for (const [targetIndex, currentTarget] of downloadTargets.entries()) {
          if (currentTarget.folderType === 'F') {
            const plan = await api.downloadPlan(token, currentTarget.uri)
            const entries = plan.entries || []
            const rootHandle = await baseHandle.getDirectoryHandle(currentTarget.filename, { create: true })

            for (const [entryIndex, entry] of entries.entries()) {
              const localRelativePath = normalizeDownloadRelativePath(currentTarget.filename, entry.relativePath)
              const parts = localRelativePath.split('/').filter(Boolean)
              const fileName = parts.pop()
              if (!fileName) continue

              const parentHandle = await ensureDirectoryHandle(rootHandle, parts.join('/'))
              const fileHandle = await parentHandle.getFileHandle(fileName, { create: true })
              const response = await fetch(api.downloadUrl(token, entry.absolutePath))
              if (!response.ok) {
                throw new Error(`下载 ${entry.relativePath} 失败`)
              }

              updateTask(task.id, {
                detail: `正在保存 ${currentTarget.filename} ${entryIndex + 1}/${entries.length}`,
                completed: targetIndex,
              })
              setMessage(`正在保存 ${targetIndex + 1}/${downloadTargets.length}：${currentTarget.filename} ${entryIndex + 1}/${entries.length}`)
              await writeResponseToFile(fileHandle, response)
            }
            updateTask(task.id, {
              detail: `已保存 ${currentTarget.filename}`,
              completed: targetIndex + 1,
            })
            continue
          }

          const response = await fetch(api.downloadUrl(token, currentTarget.uri))
          if (!response.ok) {
            throw new Error(`下载 ${currentTarget.filename} 失败`)
          }

          const fileHandle = await baseHandle.getFileHandle(currentTarget.filename, { create: true })
          updateTask(task.id, {
            detail: `正在保存 ${currentTarget.filename}`,
            completed: targetIndex,
          })
          setMessage(`正在保存 ${targetIndex + 1}/${downloadTargets.length}：${currentTarget.filename}`)
          await writeResponseToFile(fileHandle, response)
          updateTask(task.id, {
            detail: `已保存 ${currentTarget.filename}`,
            completed: targetIndex + 1,
          })
        }

        updateTask(task.id, {
          status: 'completed',
          detail: downloadTargets.length === 1
            ? `${downloadTargets[0].filename}（保存到本地目录）`
            : `${downloadTargets.length} 个项目（保存到本地目录）`,
          completed: downloadTargets.length,
        })
        setMessage(`已保存 ${downloadTargets.length} 个项目到你选择的目录`)
        return
      }

      for (const [index, currentTarget] of downloadTargets.entries()) {
        if (currentTarget.folderType === 'F') {
          const plan = await api.downloadPlan(token, currentTarget.uri)
          const entries = plan.entries || []

          for (const entry of entries) {
            const localRelativePath = normalizeDownloadRelativePath(currentTarget.filename, entry.relativePath)
            const link = document.createElement('a')
            link.href = api.downloadUrl(token, entry.absolutePath)
            link.download = (localRelativePath || entry.relativePath).replaceAll('/', '__')
            document.body.append(link)
            link.click()
            link.remove()
            await wait(180)
          }
          updateTask(task.id, {
            detail: `已触发浏览器下载 ${currentTarget.filename}`,
            completed: index + 1,
          })
          continue
        }

        const link = document.createElement('a')
        link.href = api.downloadUrl(token, currentTarget.uri)
        link.download = currentTarget.filename
        document.body.append(link)
        link.click()
        link.remove()
        await wait(180)
        updateTask(task.id, {
          detail: `已触发浏览器下载 ${currentTarget.filename}`,
          completed: index + 1,
        })
      }

      updateTask(task.id, {
        status: 'completed',
        detail: hasFolders
          ? `已触发浏览器下载 ${downloadTargets.length} 个项目，文件夹按文件逐个下载`
          : downloadTargets.length === 1
            ? downloadTargets[0].filename
            : `${downloadTargets.length} 个项目`,
        completed: downloadTargets.length,
      })
      setMessage(
        hasFolders
          ? `已开始下载 ${downloadTargets.length} 个项目，文件夹会按文件逐个下载`
          : `已开始下载 ${downloadTargets.length} 个项目`,
      )
    } catch (requestError) {
      if (requestError?.name === 'AbortError') {
        updateTask(task.id, {
          status: 'error',
          detail: '已取消下载',
          errorMessage: '用户取消操作',
        })
        setMessage('已取消下载')
      } else {
        updateTask(task.id, {
          status: 'error',
          detail: '下载失败',
          errorMessage: requestError.message,
        })
        setError(requestError.message)
      }
    } finally {
      setBusy(false)
    }
  }

  function handleRowOpen(item) {
    if (item.folderType === 'F') {
      loadDirectory(item.uri).catch(() => {})
      return
    }

    openDetail(item)
  }

  function handleItemClick(item) {
    if (touchMode) {
      if (selectionMode) {
        toggleSelection(item.uri, !selectedPaths.includes(item.uri))
        return
      }

      handleRowOpen(item)
      return
    }

    selectOnly(item.uri)
  }

  function handleItemKeyDown(event, item) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    handleRowOpen(item)
  }

  function handleDragStart(event, item) {
    if (busy) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.uri)
    setDragSourcePath(item.uri)
    selectOnly(item.uri)
  }

  function handleDragEnd() {
    clearTransientDragState()
  }

  function handleDragOver(event, targetPath) {
    const sourcePath = dragSourcePath || event.dataTransfer.getData('text/plain')
    if (!canMovePath(sourcePath, targetPath)) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetPath(targetPath)
  }

  function handleDragLeave(targetPath) {
    setDropTargetPath((current) => (current === targetPath ? '' : current))
  }

  async function handleDrop(event, targetPath) {
    const sourcePath = dragSourcePath || event.dataTransfer.getData('text/plain')
    event.preventDefault()
    clearTransientDragState()

    if (!canMovePath(sourcePath, targetPath)) return
    await handleMove(sourcePath, targetPath)
  }

  function renderItemActions(item) {
    const isFile = item.folderType !== 'F'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              selectOnly(item.uri)
            }}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openDetail(item)}>
            详情
          </DropdownMenuItem>
          {isFile && (
            <DropdownMenuItem onClick={() => void handleCopyLink(item)}>
              复制链接
            </DropdownMenuItem>
          )}
          {isFile && (
            <DropdownMenuItem onClick={() => handleOpenInBrowser(item)}>
              在浏览器中打开
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleDownload(item)}>
            下载
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => prepareMove(item)}>
            移动到
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => prepareRename(item)}>
            重命名
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => handleDelete([item.uri])}>
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  function renderBreadcrumbBar() {
    return renderPathBreadcrumb(currentPath, {
      rightSlot: (
        <div className="shrink-0 text-sm text-muted-foreground">{visibleItems.length} 项</div>
      ),
      enableDrop: true,
      onNavigate: (targetPath) => loadDirectory(targetPath),
    })
  }

  function renderPathBreadcrumb(path, { rightSlot = null, enableDrop = false, onNavigate }) {
    const pathItems = getPathSegments(path)

    return (
      <div className="flex items-center justify-between gap-3 px-0 text-sm">
        <div className="min-w-0 overflow-x-auto">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap">
              {pathItems.map((item, index) => {
                const canDrop = enableDrop && index < pathItems.length - 1 && canMovePath(dragSourcePath, item.path)

                return (
                  <Fragment key={item.path}>
                    <BreadcrumbItem>
                      {index === pathItems.length - 1 ? (
                        <BreadcrumbPage className="rounded-md px-1.5 py-0.5">{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <button
                            type="button"
                            className={cn(
                              'cursor-pointer rounded-md px-1.5 py-0.5 transition',
                              dropTargetPath === item.path && 'bg-sky-100 text-sky-700',
                            )}
                            onClick={() => onNavigate(item.path)}
                            onDragOver={canDrop ? (event) => handleDragOver(event, item.path) : undefined}
                            onDragLeave={canDrop ? () => handleDragLeave(item.path) : undefined}
                            onDrop={canDrop ? (event) => void handleDrop(event, item.path) : undefined}>
                            {item.label}
                          </button>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < pathItems.length - 1 && <BreadcrumbSeparator className="mx-0.5" />}
                  </Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {rightSlot}
      </div>
    )
  }

  function renderToolbar() {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        <div className="flex shrink-0 items-center rounded-xl border bg-background p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            title="新建文件夹"
            aria-label="新建文件夹"
            onClick={() => setCreateOpen(true)}
            disabled={busy}>
            <FolderPlusIcon />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                title="上传"
                aria-label="上传"
                disabled={busy}>
                <UploadIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                上传文件
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>
                上传文件夹
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex shrink-0 items-center rounded-xl border bg-background p-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                title="筛选"
                aria-label="筛选">
                {ITEM_FILTER_OPTIONS.find((option) => option.key === itemFilter)?.label || '全部'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-32">
              <DropdownMenuRadioGroup value={itemFilter} onValueChange={setItemFilter}>
                {ITEM_FILTER_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.key} value={option.key}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {touchMode && (
          <div className="flex shrink-0 items-center rounded-xl border bg-background p-1">
            <Button
              variant={selectionMode ? 'secondary' : 'ghost'}
              size="sm"
              className="shrink-0"
              onClick={toggleSelectionMode}>
              {selectionMode ? '完成' : '选择'}
            </Button>
          </div>
        )}

        {selectedPaths.length > 1 && (
          <div className="flex shrink-0 items-center rounded-xl border bg-background p-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              title="移动到"
              aria-label="移动到"
              onClick={prepareMoveSelected}
              disabled={busy}>
              <FolderIcon />
            </Button>
            {canRenameSelected && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                title="重命名"
                aria-label="重命名"
                onClick={() => prepareRename(selectedItem)}
                disabled={busy}>
                <PencilIcon />
              </Button>
            )}
            {canDownloadSelected && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                title="下载"
                aria-label="下载"
                onClick={() => handleDownload(selectedItems)}
                disabled={busy}>
                <DownloadIcon />
              </Button>
            )}
            {canViewDetailSelected && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                title="详情"
                aria-label="详情"
                onClick={() => openDetail(selectedItem)}
                disabled={busy}>
                <InfoIcon />
              </Button>
            )}
            {canCopyLinkSelected && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                title="复制链接"
                aria-label="复制链接"
                onClick={() => void handleCopyLink(selectedFileItem)}
                disabled={busy}>
                <CopyIcon className="size-4" />
              </Button>
            )}
            {canOpenInBrowserSelected && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                title="浏览器打开"
                aria-label="浏览器打开"
                onClick={() => handleOpenInBrowser(selectedFileItem)}
                disabled={busy}>
                <ExternalLinkIcon />
              </Button>
            )}
            {canDeleteSelected && (
              <Button
                variant="destructive"
                size="icon-sm"
                className="shrink-0"
                title="删除"
                aria-label="删除"
                onClick={() => handleDelete()}
                disabled={busy}>
                <Trash2Icon />
              </Button>
            )}
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center rounded-xl border bg-background p-1">
          <DropdownMenu onOpenChange={(open) => {
            if (open) setViewMode('grid')
          }}>
            <DropdownMenuTrigger asChild>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-sm"
                className="shrink-0"
                title="缩略图"
                aria-label="缩略图">
                <LayoutGridIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuRadioGroup value={gridDensity} onValueChange={setGridDensity}>
                {availableGridDensityOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.key} value={option.key}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="shrink-0"
            title="列表"
            aria-label="列表"
            onClick={() => setViewMode('list')}>
            <ListIcon />
          </Button>
        </div>
      </div>
    )
  }

  function renderGridView() {
    if (loading) {
      return <div className="py-18 text-center text-sm text-muted-foreground">正在读取目录…</div>
    }

    if (!visibleItems.length) {
      return <div className="py-18 text-center text-sm text-muted-foreground">当前目录为空，可以直接新建文件夹或上传文件。</div>
    }

    const previewAspectClassName = activeGridDensity.columns >= 4 ? 'aspect-square' : 'aspect-[4/3]'

    return (
      <div className={cn('grid content-start', gridGapClass)} style={gridColumnsStyle}>
        {visibleItems.map((item) => {
          const active = selectedPaths.includes(item.uri)
          const dropActive = item.folderType === 'F' && dropTargetPath === item.uri

          return (
            <GridItemCard
              key={item.uri}
              item={item}
              token={token}
              active={active}
              busy={busy}
              touchMode={touchMode}
              selectionMode={selectionMode}
              dropActive={dropActive}
              previewAspectClassName={previewAspectClassName}
              actions={renderItemActions(item)}
              onToggleSelection={(checked) => toggleSelection(item.uri, checked)}
              onClick={() => handleItemClick(item)}
              onDoubleClick={() => handleRowOpen(item)}
              onKeyDown={(event) => handleItemKeyDown(event, item)}
              onDragStart={(event) => handleDragStart(event, item)}
              onDragEnd={handleDragEnd}
              onDragOver={item.folderType === 'F' ? (event) => handleDragOver(event, item.uri) : undefined}
              onDragLeave={item.folderType === 'F' ? () => handleDragLeave(item.uri) : undefined}
              onDrop={item.folderType === 'F' ? (event) => void handleDrop(event, item.uri) : undefined}
            />
          )
        })}
      </div>
    )
  }

  function renderListView() {
    return (
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/70">
            <TableHead className="w-9"></TableHead>
            <TableHead className="w-auto">
              <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort('filename')}>
                名称
                <ArrowUpDownIcon className="size-3.5" />
              </button>
            </TableHead>
            <TableHead className="hidden w-40 xl:table-cell">
              <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort('lastModified')}>
                修改时间
                <ArrowUpDownIcon className="size-3.5" />
              </button>
            </TableHead>
            <TableHead className="hidden w-28 lg:table-cell">
              <button type="button" className="inline-flex items-center gap-1" onClick={() => handleSort('size')}>
                大小
                <ArrowUpDownIcon className="size-3.5" />
              </button>
            </TableHead>
            <TableHead className="w-14"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleItems.map((item) => {
            const active = selectedPaths.includes(item.uri)
            const dropActive = item.folderType === 'F' && dropTargetPath === item.uri

            return (
              <TableRow
                key={item.uri}
                data-state={active ? 'selected' : undefined}
                draggable={!busy}
                className={cn('cursor-pointer', dropActive && 'bg-sky-50 ring-1 ring-inset ring-sky-300')}
                onClick={() => handleItemClick(item)}
                onDoubleClick={() => handleRowOpen(item)}
                onDragStart={(event) => handleDragStart(event, item)}
                onDragEnd={handleDragEnd}
                onDragOver={item.folderType === 'F' ? (event) => handleDragOver(event, item.uri) : undefined}
                onDragLeave={item.folderType === 'F' ? () => handleDragLeave(item.uri) : undefined}
                onDrop={item.folderType === 'F' ? (event) => void handleDrop(event, item.uri) : undefined}>
                <TableCell className="w-9 pr-0 pl-1">
                  <input
                    type="checkbox"
                    checked={active}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => toggleSelection(item.uri, event.target.checked)}
                  />
                </TableCell>
                <TableCell className="w-auto pl-0.5">
                  <div className="flex items-center gap-2">
                    <FileTypeIcon item={item} />
                    <div className="min-w-0 overflow-hidden">
                      <div className="truncate font-medium">{item.filename}</div>
                      <div className="truncate text-xs text-muted-foreground xl:hidden">{formatDate(item.lastModified)}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">{formatDate(item.lastModified)}</TableCell>
                <TableCell className="hidden lg:table-cell">{item.folderType === 'F' ? '--' : formatBytes(item.size)}</TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  {renderItemActions(item)}
                </TableCell>
              </TableRow>
            )
          })}

          {!visibleItems.length && !loading && (
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                当前目录为空，可以直接新建文件夹或上传文件。
              </TableCell>
            </TableRow>
          )}

          {loading && (
            <TableRow>
              <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                正在读取目录…
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    )
  }

  function renderTaskList(type, list) {
    const title = type === 'upload' ? '上传任务' : '下载任务'
    const canClearCompleted = list.some(isTaskEnded)

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{title}</div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{list.length}</Badge>
            {canClearCompleted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => clearCompletedTasks(type)}>
                清空已完成
              </Button>
            )}
          </div>
        </div>

        {!list.length ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
            {getTaskEmptyText(type)}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((task) => (
              <div key={task.id} className="rounded-2xl border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-1 break-all text-sm text-muted-foreground">{task.detail}</div>
                    {task.errorMessage && (
                      <div className="mt-1 break-all text-sm text-destructive">{task.errorMessage}</div>
                    )}
                  </div>
                  <Badge variant={getTaskBadgeVariant(task)}>{getTaskStatusLabel(task)}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Clock3Icon className="size-3.5" />
                      <span>{formatHistoryTime(task.updatedAt || task.createdAt)}</span>
                    </div>
                    <span>{formatTaskProgress(task)}</span>
                  </div>
                  {isTaskEnded(task) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => deleteTask(task.id)}>
                      删除
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderHistoryDrawer() {
    return (
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          className="left-0 right-auto top-0 h-full w-[min(18rem,calc(100%-0.75rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-r-2xl p-0 sm:max-w-none"
          aria-describedby={undefined}>
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b px-4 py-4 pr-12">
              <DialogTitle>{profile.key}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-3 pb-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <HardDriveIcon className="size-4" />
                    <span>已用容量</span>
                  </span>
                  <span>{formatBytes(usage)}</span>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-0 hover:bg-transparent"
                  onClick={() => handleSettingsOpenChange(true)}>
                  <Settings2Icon />
                  链接设置
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-0 hover:bg-transparent"
                  onClick={() => window.open(getDomainConsoleUrl(profile), '_blank', 'noopener,noreferrer')}>
                  <ExternalLinkIcon />
                  打开域名控制台
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-0 hover:bg-transparent"
                  onClick={() => window.open(getCreateBucketUrl(), '_blank', 'noopener,noreferrer')}>
                  <ExternalLinkIcon />
                  创建云存储服务
                </Button>
                <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent" onClick={toggleTheme}>
                  {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                  {theme === 'dark' ? '浅色模式' : '深色模式'}
                </Button>
                <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent" onClick={handleLogout}>
                  <LogOutIcon />
                  退出
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  function renderActivityDrawer() {
    return (
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent
          className="right-0 left-auto top-0 h-full w-[min(24rem,calc(100%-0.75rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-l-2xl p-0 sm:max-w-none"
          aria-describedby={undefined}>
          <div className="flex h-full flex-col">
            <DialogHeader className="min-h-12 justify-center border-b px-4 py-4 pr-12">
              <DialogTitle className="sr-only">任务与历史</DialogTitle>
            </DialogHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex items-center rounded-xl border bg-background p-1">
                {SIDEBAR_VIEW_OPTIONS.map((option) => (
                  <Button
                    key={option.key}
                    variant={sidebarView === option.key ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSidebarView(option.key)}>
                    {option.label}
                  </Button>
                ))}
              </div>

              {sidebarView === 'history' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">操作历史</div>
                    <Badge variant="secondary">{operationHistory.length}</Badge>
                  </div>

                  {!operationHistory.length ? (
                    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                      暂无操作记录
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {operationHistory.map((item) => {
                        const canUndo = item.status === 'done' && Boolean(item.undo)

                        return (
                          <div key={item.id} className="rounded-2xl border bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium">{item.title}</div>
                                <div className="mt-1 break-all text-sm text-muted-foreground">{item.detail}</div>
                              </div>
                              <Badge variant={item.status === 'undone' ? 'outline' : 'secondary'}>
                                {item.status === 'undone' ? '已撤销' : canUndo ? '可撤销' : '已完成'}
                              </Badge>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock3Icon className="size-3.5" />
                                <span>{formatHistoryTime(item.createdAt)}</span>
                              </div>
                              {canUndo && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => void handleUndoAction(item)}>
                                  Undo
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : sidebarView === 'uploads' ? renderTaskList('upload', uploadTasks) : renderTaskList('download', downloadTasks)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  function renderMoveDialog() {
    const targetPreviewPath = moveTargets.length === 1
      ? getMovedPath(moveTargets[0].uri, moveBrowsePath)
      : moveTargets.length
        ? `${moveTargets.length} 项 -> ${moveBrowsePath}`
        : ''

    return (
      <Dialog open={moveOpen} onOpenChange={handleMoveDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移动到</DialogTitle>
            <DialogDescription>
              {moveTargets.length > 1 ? `选择目标目录，确认后移动这 ${moveTargets.length} 项。` : '选择目标目录，确认后移动当前项目。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {renderPathBreadcrumb(moveBrowsePath, {
              onNavigate: (targetPath) => setMoveBrowsePath(targetPath),
            })}

            <div className="max-h-80 min-h-64 overflow-y-auto rounded-xl border bg-card">
              {moveLoading ? (
                <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                  正在读取目录…
                </div>
              ) : moveFolders.length ? (
                <div className="divide-y">
                  {moveFolders.map((folder) => (
                    <button
                      key={folder.uri}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted"
                      onClick={() => setMoveBrowsePath(folder.uri)}>
                      <FolderIcon className="size-4 shrink-0 text-amber-500" />
                      <span className="truncate">{folder.filename}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                  当前目录下没有子文件夹
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div>当前目标目录：{moveBrowsePath}</div>
              <div>将移动为：{targetPreviewPath || '--'}</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleMoveDialogChange(false)}>取消</Button>
            <Button onClick={() => void handleMoveFromDialog()} disabled={busy || !canConfirmMove}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  function renderSettingsDialog() {
    const defaultDomain = getDefaultDomain(profile)

    return (
      <Dialog open={settingsOpen} onOpenChange={handleSettingsOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>链接设置</DialogTitle>
            <DialogDescription>配置公开链接的加速域名。不填写时使用默认测试域名。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">自定义加速域名</div>
              <Input
                placeholder="https://cdn.example.com"
                value={domainValue}
                onChange={(event) => {
                  setDomainValue(event.target.value)
                  setDomainError('')
                }}
              />
              {domainError && <div className="text-sm text-destructive">{domainError}</div>}
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">当前生效</span>
                <span className="max-w-80 break-all text-right">{activePublicBaseUrl || '--'}</span>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <span className="text-muted-foreground">默认测试域名</span>
                <span className="max-w-80 break-all text-right">{defaultDomain || '--'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">复制格式</div>
              <div className="flex flex-wrap gap-2">
                {COPY_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.key}
                    size="sm"
                    variant={profileSettings.urlCopyType === option.key ? 'secondary' : 'outline'}
                    onClick={() => saveProfileSettings({ urlCopyType: option.key })}>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleSettingsOpenChange(false)}>取消</Button>
            <Button onClick={() => void handleSaveDomain()} disabled={busy}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  function renderDetailDrawer() {
    return (
      <Dialog open={detailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogContent
          className="max-h-[calc(100vh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
          aria-describedby={undefined}>
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="border-b px-4 py-4 pr-12">
              <DialogTitle>{detailItem?.filename || '文件详情'}</DialogTitle>
              {detailItem && (
                <DialogDescription className="break-all">
                  {detailItem.uri}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {!detailItem ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                  当前项目已不存在
                </div>
              ) : (
                <>
                  {detailItem.folderType !== 'F' && getFileKind(detailItem) === 'image' && (
                    <div className="overflow-hidden rounded-2xl border bg-muted">
                      <img
                        alt={detailItem.filename}
                        className="max-h-72 w-full object-contain"
                        src={api.previewUrl(token, detailItem.uri)}
                      />
                    </div>
                  )}

                  <div className="rounded-2xl border bg-card p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">修改时间</span>
                        <span>{formatDate(detailItem.lastModified)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">大小</span>
                        <span>{detailItem.folderType === 'F' ? '--' : formatBytes(detailItem.size)}</span>
                      </div>
                    </div>
                  </div>

                  {detailItem.folderType !== 'F' && (
                    <div className="rounded-2xl border bg-card p-4">
                      <div className="mb-3 text-sm font-medium">公开链接</div>
                      <div className="rounded-xl border bg-background px-3 py-2 text-sm break-all">
                        {detailPublicUrl}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          title="复制链接"
                          aria-label="复制链接"
                          onClick={() => void handleCopyLink(detailItem)}>
                          <CopyIcon />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenInBrowser(detailItem)}>
                          <ExternalLinkIcon />
                          浏览器打开
                        </Button>
                      </div>
                    </div>
                  )}

                  {detailItem.folderType === 'F' && (
                    <div className="rounded-2xl border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">目录内容</div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleDetailOpenChange(false)
                            void loadDirectory(detailItem.uri)
                          }}>
                          打开目录
                        </Button>
                      </div>

                      {detailLoading ? (
                        <div className="text-sm text-muted-foreground">正在统计目录内容…</div>
                      ) : detailError ? (
                        <div className="text-sm text-destructive">{detailError}</div>
                      ) : detailFolderSummary ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="rounded-xl bg-muted/40 p-3 text-center">
                              <div className="text-lg font-medium">{detailFolderSummary.total}</div>
                              <div className="mt-1 text-xs text-muted-foreground">直接子项</div>
                            </div>
                            <div className="rounded-xl bg-muted/40 p-3 text-center">
                              <div className="text-lg font-medium">{detailFolderSummary.folders}</div>
                              <div className="mt-1 text-xs text-muted-foreground">文件夹</div>
                            </div>
                            <div className="rounded-xl bg-muted/40 p-3 text-center">
                              <div className="text-lg font-medium">{detailFolderSummary.files}</div>
                              <div className="mt-1 text-xs text-muted-foreground">文件</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">前几个子项</div>
                            {detailFolderSummary.sample.length ? (
                              <div className="space-y-2">
                                {detailFolderSummary.sample.map((child) => (
                                  <div key={child.uri} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                                    <FileTypeIcon item={child} />
                                    <span className="min-w-0 truncate">{child.filename}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">当前目录为空。</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">暂无目录统计信息。</div>
                      )}
                    </div>
                  )}

                  {detailItem.folderType !== 'F' && (
                    <div className="overflow-hidden rounded-2xl border bg-card">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        onClick={() => setDetailHeadersOpen((open) => !open)}>
                        <span className="text-sm font-medium">Response Headers</span>
                        <ChevronDownIcon
                          className={cn(
                            'size-4 text-muted-foreground transition-transform',
                            detailHeadersOpen && 'rotate-180',
                          )}
                        />
                      </button>

                      {detailHeadersOpen && (
                        <div className="border-t px-4 py-3">
                          {detailLoading ? (
                            <div className="text-sm text-muted-foreground">正在读取头信息…</div>
                          ) : detailError ? (
                            <div className="text-sm text-destructive">{detailError}</div>
                          ) : detailHeaderEntries.length ? (
                            <div className="divide-y text-sm">
                              {detailHeaderEntries.map(([key, value]) => (
                                <div key={key} className="py-2 first:pt-0 last:pb-0">
                                  <div className="font-medium">{key}</div>
                                  <div className="mt-1 break-all text-muted-foreground">{String(value)}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">暂无可显示的头信息。</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!token || !profile) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.14),transparent_38%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_38%),linear-gradient(180deg,#09090b_0%,#111827_100%)]">
        <div className="mx-auto max-w-md">
          <Card className="border-border bg-card shadow-xl shadow-stone-200/40 dark:shadow-black/25">
            <CardHeader>
              <CardTitle>连接又拍云空间</CardTitle>
              <CardDescription>输入服务名、操作员和密码后进入目录。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="space-y-4" onSubmit={handleLogin}>
                <Input
                  placeholder="服务名 / Bucket"
                  autoComplete="organization"
                  value={authForm.bucketName}
                  onChange={(event) => setAuthForm((current) => ({ ...current, bucketName: event.target.value }))}
                />
                <Input
                  placeholder="操作员"
                  autoComplete="username"
                  value={authForm.operatorName}
                  onChange={(event) => setAuthForm((current) => ({ ...current, operatorName: event.target.value }))}
                />
                <Input
                  type="password"
                  placeholder="密码"
                  autoComplete="current-password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={authForm.remember}
                    onChange={(event) => setAuthForm((current) => ({ ...current, remember: event.target.checked }))}
                  />
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
                      <div
                        key={record.key}
                        className="flex items-center justify-between rounded-xl border bg-muted px-3 py-2 text-sm">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() =>
                            setAuthForm({
                              bucketName: record.bucketName,
                              operatorName: record.operatorName,
                              password: record.password,
                              remember: true,
                            })
                          }>
                          <div className="truncate font-medium">{record.key}</div>
                          <div className="truncate text-muted-foreground">{record.bucketName}</div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setAuthHistory(removeStoredProfile(record.key))}>
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

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_24%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_24%),linear-gradient(180deg,#09090b_0%,#111827_100%)]">
      <input ref={fileInputRef} className="hidden" type="file" multiple onChange={handleUpload} />
      <input ref={folderInputRef} className="hidden" type="file" multiple webkitdirectory="true" onChange={handleUpload} />

      <div className="mx-auto flex h-full max-w-7xl flex-col gap-3 px-3 py-3 lg:px-5">
        <div className="px-1 py-1">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  title="打开侧边栏"
                  aria-label="打开侧边栏"
                  onClick={() => setHistoryOpen(true)}>
                  <PanelLeftOpenIcon />
                </Button>
                <div className="min-w-0 truncate">{profile.key}</div>
              </div>
              <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
                {(error || message) && (
                  <div
                    className={cn(
                      'max-w-[min(28rem,50vw)] truncate text-sm',
                      error ? 'text-destructive' : 'text-emerald-700',
                    )}>
                    {error || message}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="icon-sm"
                  className={cn(error && 'border-destructive/30 text-destructive')}
                  title={statusIndicatorText}
                  aria-label={statusIndicatorText}
                  onClick={() => setActivityOpen(true)}>
                  <PanelRightOpenIcon className="size-4 shrink-0" />
                </Button>
                {!error && latestUndoEntry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto shrink-0 px-0 hover:bg-transparent hover:underline"
                    onClick={() => void handleUndoAction(latestUndoEntry)}
                    disabled={busy}>
                    Undo
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {renderBreadcrumbBar()}

            {renderToolbar()}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className={cn('h-full overflow-auto', viewMode === 'grid' ? 'p-4' : 'p-0')}>
            {viewMode === 'grid' ? renderGridView() : renderListView()}
          </div>
        </div>
      </div>

      {renderHistoryDrawer()}

      {renderActivityDrawer()}

      {renderSettingsDialog()}

      {renderDetailDrawer()}

      {renderMoveDialog()}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
            <DialogDescription>在当前目录 {currentPath} 下创建一个新的文件夹。</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="例如：assets、docs、backup"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreateFolder} disabled={busy || !newFolderName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名</DialogTitle>
            <DialogDescription>只修改当前选中项目的名称，不改变所在目录。</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>取消</Button>
            <Button onClick={handleRename} disabled={busy || !renameValue.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
