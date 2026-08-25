import styled from '@emotion/styled';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { SlackSettingsSection } from 'src/front-components/components/SlackSettingsSection';
import { SlackUserLinkForm } from 'src/front-components/components/SlackUserLinkForm';
import { SlackUserLinksList } from 'src/front-components/components/SlackUserLinksList';
import { useCanManageSlackUserLinks } from 'src/front-components/hooks/use-can-manage-slack-user-links';
import { useSlackUserLinks } from 'src/front-components/hooks/use-slack-user-links';

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[8]};
  width: 100%;
`;

const StyledCenteredState = styled.div`
  align-items: center;
  box-sizing: border-box;
  color: ${() => themeCssVariables.font.color.tertiary};
  display: flex;
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
  height: 100%;
  justify-content: center;
  padding: ${() => themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledPermissionNotice = styled.div`
  border: 1px solid ${() => themeCssVariables.border.color.medium};
  border-left: 3px solid ${() => themeCssVariables.color.yellow};
  border-radius: ${() => themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
  padding: ${() => themeCssVariables.spacing[3]};
`;

const StyledPermissionNoticeTitle = styled.span`
  color: ${() => themeCssVariables.font.color.primary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
  font-weight: ${() => themeCssVariables.font.weight.medium};
`;

const StyledPermissionNoticeBody = styled.span`
  color: ${() => themeCssVariables.font.color.secondary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
`;

export const SlackUserLinksSettings = () => {
  const { canManage, isPermissionLoading } = useCanManageSlackUserLinks();
  const {
    slackUserLinks,
    isSlackUserLinksLoading,
    errorMessage,
    refetchSlackUserLinks,
  } = useSlackUserLinks();

  if (isPermissionLoading) {
    return <StyledCenteredState>Loading Slack user links…</StyledCenteredState>;
  }

  return (
    <StyledContainer>
      {!canManage && (
        <StyledPermissionNotice>
          <StyledPermissionNoticeTitle>
            You need the workspace members permission
          </StyledPermissionNoticeTitle>
          <StyledPermissionNoticeBody>
            Only members with the workspace members permission can create or
            change Slack user links. You can review the existing links below.
          </StyledPermissionNoticeBody>
        </StyledPermissionNotice>
      )}
      {canManage && (
        <SlackUserLinkForm onLinkSaved={refetchSlackUserLinks} />
      )}
      <SlackSettingsSection
        title="Slack user links"
        description="Each link maps a Slack account to the workspace member whose permissions the assistant borrows."
      >
        {isSlackUserLinksLoading ? (
          <StyledCenteredState>Loading links…</StyledCenteredState>
        ) : errorMessage !== undefined ? (
          <StyledCenteredState>{errorMessage}</StyledCenteredState>
        ) : (
          <SlackUserLinksList slackUserLinks={slackUserLinks} />
        )}
      </SlackSettingsSection>
    </StyledContainer>
  );
};
