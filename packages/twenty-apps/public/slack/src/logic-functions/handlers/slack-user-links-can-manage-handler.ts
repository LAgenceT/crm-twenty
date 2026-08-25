import { currentUserHasWorkspaceMembersPermission } from 'src/logic-functions/utils/current-user-has-workspace-members-permission';

export const slackUserLinksCanManageHandler = async (): Promise<{
  canManage: boolean;
}> => ({
  canManage: await currentUserHasWorkspaceMembersPermission(),
});
