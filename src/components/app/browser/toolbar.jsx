import {
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FolderIcon,
  FolderPlusIcon,
  InfoIcon,
  LayoutGridIcon,
  ListIcon,
  PencilIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ITEM_FILTER_OPTIONS } from '@/lib/upyun-app'

export function BrowserToolbar({
  busy,
  itemFilter,
  onItemFilterChange,
  touchMode,
  selectionMode,
  onToggleSelectionMode,
  selectedPaths,
  canRenameSelected,
  canDownloadSelected,
  canViewDetailSelected,
  canCopyLinkSelected,
  canOpenInBrowserSelected,
  canDeleteSelected,
  selectedItem,
  selectedItems,
  selectedFileItem,
  onCreateFolder,
  fileInputRef,
  folderInputRef,
  onPrepareMoveSelected,
  onPrepareRename,
  onDownload,
  onOpenDetail,
  onCopyLink,
  onOpenInBrowser,
  onDelete,
  viewMode,
  onViewModeChange,
  gridDensity,
  onGridDensityChange,
  availableGridDensityOptions,
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
      <div className="flex shrink-0 items-center rounded-xl border bg-background p-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          title="新建文件夹"
          aria-label="新建文件夹"
          onClick={onCreateFolder}
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
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>上传文件</DropdownMenuItem>
            <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>上传文件夹</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex shrink-0 items-center rounded-xl border bg-background p-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="shrink-0" title="筛选" aria-label="筛选">
              {ITEM_FILTER_OPTIONS.find((option) => option.key === itemFilter)?.label || '全部'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-32">
            <DropdownMenuRadioGroup value={itemFilter} onValueChange={onItemFilterChange}>
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
          <Button variant={selectionMode ? 'secondary' : 'ghost'} size="sm" className="shrink-0" onClick={onToggleSelectionMode}>
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
            onClick={onPrepareMoveSelected}
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
              onClick={() => onPrepareRename(selectedItem)}
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
              onClick={() => onDownload(selectedItems)}
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
              onClick={() => onOpenDetail(selectedItem)}
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
              onClick={() => void onCopyLink(selectedFileItem)}
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
              onClick={() => onOpenInBrowser(selectedFileItem)}
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
              onClick={() => onDelete()}
              disabled={busy}>
              <Trash2Icon />
            </Button>
          )}
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center rounded-xl border bg-background p-1">
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) onViewModeChange('grid')
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
            <DropdownMenuRadioGroup value={gridDensity} onValueChange={onGridDensityChange}>
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
          onClick={() => onViewModeChange('list')}>
          <ListIcon />
        </Button>
      </div>
    </div>
  )
}
