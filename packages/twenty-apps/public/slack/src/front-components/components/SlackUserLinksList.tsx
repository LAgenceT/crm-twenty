import styled from '@emotion/styled';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { SLACK_USER_LINK_SOURCE } from 'src/logic-functions/constants/slack-user-link-source';
import { type SlackUserLinkRecord } from 'src/front-components/types/slack-user-link-record.type';

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[2]};
`;

const StyledRow = styled.div`
  align-items: center;
  border: 1px solid ${() => themeCssVariables.border.color.light};
  border-radius: ${() => themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  display: flex;
  gap: ${() => themeCssVariables.spacing[4]};
  justify-content: space-between;
  padding: ${() => themeCssVariables.spacing[3]};
`;

const StyledDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledName = styled.span`
  color: ${() => themeCssVariables.font.color.primary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
  font-weight: ${() => themeCssVariables.font.weight.medium};
`;

const StyledMeta = styled.span`
  color: ${() => themeCssVariables.font.color.tertiary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.xs};
`;

const StyledEmptyState = styled.div`
  color: ${() => themeCssVariables.font.color.tertiary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
  padding: ${() => themeCssVariables.spacing[2]};
`;

const StyledSourceBadge = styled.span<{ isManual: boolean }>`
  border: 1px solid
    ${({ isManual }) =>
      isManual ? themeCssVariables.color.blue : themeCssVariables.color.green};
  border-radius: ${() => themeCssVariables.border.radius.pill};
  color: ${({ isManual }) =>
    isManual ? themeCssVariables.color.blue : themeCssVariables.color.green};
  flex-shrink: 0;
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.xs};
  padding: ${() => themeCssVariables.spacing[1]} ${() =>
    themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const getSourceLabel = (source: string | null): string =>
  source === SLACK_USER_LINK_SOURCE.MANUAL ? 'Set manually' : 'Matched on email';

type SlackUserLinksListProps = {
  slackUserLinks: SlackUserLinkRecord[];
};

export const SlackUserLinksList = ({
  slackUserLinks,
}: SlackUserLinksListProps) => {
  if (slackUserLinks.length === 0) {
    return <StyledEmptyState>No Slack user links yet.</StyledEmptyState>;
  }

  return (
    <StyledList>
      {slackUserLinks.map((slackUserLink) => (
        <StyledRow key={slackUserLink.id}>
          <StyledDetails>
            <StyledName>
              {slackUserLink.name ?? slackUserLink.slackUserId ?? 'Unnamed link'}
            </StyledName>
            <StyledMeta>
              {slackUserLink.workspaceMemberName ?? 'No workspace member'}
            </StyledMeta>
            <StyledMeta>
              Slack user {slackUserLink.slackUserId ?? 'unknown'} · Team{' '}
              {slackUserLink.slackTeamId ?? 'unknown'}
            </StyledMeta>
          </StyledDetails>
          <StyledSourceBadge
            isManual={slackUserLink.source === SLACK_USER_LINK_SOURCE.MANUAL}
          >
            {getSourceLabel(slackUserLink.source)}
          </StyledSourceBadge>
        </StyledRow>
      ))}
    </StyledList>
  );
};
