import { createActionUtils } from '@/hooks/upyun/upyun-action-utils'
import { useUpyunAuthSettingsActions } from '@/hooks/upyun/use-upyun-auth-settings-actions'
import { useUpyunFileActions } from '@/hooks/upyun/use-upyun-file-actions'
import { useUpyunTransferActions } from '@/hooks/upyun/use-upyun-transfer-actions'

export function useUpyunActions(state) {
  const utils = createActionUtils(state)
  const authSettingsActions = useUpyunAuthSettingsActions(state, utils)
  const fileActions = useUpyunFileActions(state, utils)
  const transferActions = useUpyunTransferActions(state, utils)

  return {
    ...utils,
    ...authSettingsActions,
    ...fileActions,
    ...transferActions,
  }
}
