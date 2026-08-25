import { defineLogicFunction } from 'twenty-sdk/define';

import { SLACK_USER_LINKS_CAN_MANAGE_ROUTE_PATH } from 'src/constants/slack-user-links-route-path.constant';
import { SLACK_USER_LINKS_CAN_MANAGE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { slackUserLinksCanManageHandler } from 'src/logic-functions/handlers/slack-user-links-can-manage-handler';

export default defineLogicFunction({
  universalIdentifier: SLACK_USER_LINKS_CAN_MANAGE_UNIVERSAL_IDENTIFIER,
  name: 'slack-user-links-can-manage',
  description:
    'Report whether the current user has the workspace members permission required to set Slack user links, so the settings UI can reflect it.',
  timeoutSeconds: 15,
  httpRouteTriggerSettings: {
    path: SLACK_USER_LINKS_CAN_MANAGE_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
  handler: slackUserLinksCanManageHandler,
});
