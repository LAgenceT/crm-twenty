import { beforeEach, describe, expect, it, vi } from 'vitest';

import { slackUserLinksCanManageHandler } from 'src/logic-functions/handlers/slack-user-links-can-manage-handler';

const { currentUserHasWorkspaceMembersPermissionMock } = vi.hoisted(() => ({
  currentUserHasWorkspaceMembersPermissionMock: vi.fn(),
}));

vi.mock(
  'src/logic-functions/utils/current-user-has-workspace-members-permission',
  () => ({
    currentUserHasWorkspaceMembersPermission:
      currentUserHasWorkspaceMembersPermissionMock,
  }),
);

describe('slackUserLinksCanManageHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report true when the current user has the permission', async () => {
    currentUserHasWorkspaceMembersPermissionMock.mockResolvedValue(true);

    expect(await slackUserLinksCanManageHandler()).toEqual({ canManage: true });
  });

  it('should report false when the current user lacks the permission', async () => {
    currentUserHasWorkspaceMembersPermissionMock.mockResolvedValue(false);

    expect(await slackUserLinksCanManageHandler()).toEqual({ canManage: false });
  });
});
