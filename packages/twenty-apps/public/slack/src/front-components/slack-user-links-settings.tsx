import { defineSettingsFrontComponent } from 'twenty-sdk/define';

import { SLACK_USER_LINKS_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

const SlackUserLinksSettings = () => (
  <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    Slack user links settings (diagnostic build)
  </div>
);

export default defineSettingsFrontComponent({
  universalIdentifier:
    SLACK_USER_LINKS_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'slack-user-links-settings',
  description:
    'Manage Slack user links: review existing links and, with the workspace members permission, link a Slack account to a workspace member.',
  component: SlackUserLinksSettings,
});
