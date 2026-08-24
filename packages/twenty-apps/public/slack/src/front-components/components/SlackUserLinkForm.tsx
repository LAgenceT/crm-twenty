import styled from '@emotion/styled';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { enqueueSnackbar } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';

import { SlackUserLinkTextInput } from 'src/front-components/components/SlackUserLinkTextInput';
import { WorkspaceMemberPicker } from 'src/front-components/components/WorkspaceMemberPicker';
import { useSetSlackUserLink } from 'src/front-components/hooks/use-set-slack-user-link';
import { type WorkspaceMemberOption } from 'src/front-components/types/workspace-member-option.type';

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[4]};
`;

const StyledField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
`;

const StyledLabel = styled.label`
  color: ${() => themeCssVariables.font.color.secondary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
  font-weight: ${() => themeCssVariables.font.weight.medium};
`;

const StyledHint = styled.span`
  color: ${() => themeCssVariables.font.color.tertiary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.xs};
`;

const StyledActions = styled.div`
  display: flex;
`;

type SlackUserLinkFormProps = {
  onLinkSaved: () => void;
};

export const SlackUserLinkForm = ({ onLinkSaved }: SlackUserLinkFormProps) => {
  const [selectedMember, setSelectedMember] =
    useState<WorkspaceMemberOption | null>(null);
  const [slackUserId, setSlackUserId] = useState('');
  const [slackTeamId, setSlackTeamId] = useState('');
  const [name, setName] = useState('');

  const { setSlackUserLink, isSubmitting } = useSetSlackUserLink();

  const canSubmit =
    selectedMember !== null &&
    isNonEmptyString(slackUserId.trim()) &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (selectedMember === null || !isNonEmptyString(slackUserId.trim())) {
      return;
    }

    const result = await setSlackUserLink({
      slackUserId: slackUserId.trim(),
      workspaceMemberId: selectedMember.id,
      slackTeamId: isNonEmptyString(slackTeamId.trim())
        ? slackTeamId.trim()
        : undefined,
      name: isNonEmptyString(name.trim()) ? name.trim() : undefined,
    });

    enqueueSnackbar({
      message: isNonEmptyString(result.error) ? result.error : result.message,
      variant: result.success ? 'success' : 'error',
    });

    if (result.success) {
      setSelectedMember(null);
      setSlackUserId('');
      setSlackTeamId('');
      setName('');
      onLinkSaved();
    }
  };

  return (
    <Section>
      <H2Title
        title="Link a Slack user"
        description="Pick a workspace member and the Slack account whose messages should act with that member's permissions. Manual links win over email matching."
      />
      <StyledForm
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <StyledField>
          <StyledLabel>Workspace member</StyledLabel>
          <WorkspaceMemberPicker
            selectedMember={selectedMember}
            onSelect={setSelectedMember}
            onClear={() => setSelectedMember(null)}
            disabled={isSubmitting}
          />
        </StyledField>
        <StyledField>
          <StyledLabel htmlFor="slack-user-id">Slack user ID</StyledLabel>
          <SlackUserLinkTextInput
            id="slack-user-id"
            value={slackUserId}
            onChange={(event) => setSlackUserId(event.target.value)}
            placeholder="U0123456789"
            disabled={isSubmitting}
          />
        </StyledField>
        <StyledField>
          <StyledLabel htmlFor="slack-team-id">
            Slack team ID (optional)
          </StyledLabel>
          <SlackUserLinkTextInput
            id="slack-team-id"
            value={slackTeamId}
            onChange={(event) => setSlackTeamId(event.target.value)}
            placeholder="T0123456789"
            disabled={isSubmitting}
          />
          <StyledHint>
            Defaults to the installed Slack workspace. Set it for a Slack
            Connect user, using the team ID their messages carry.
          </StyledHint>
        </StyledField>
        <StyledField>
          <StyledLabel htmlFor="slack-display-name">
            Display name (optional)
          </StyledLabel>
          <SlackUserLinkTextInput
            id="slack-display-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Lovelace"
            disabled={isSubmitting}
          />
        </StyledField>
        <StyledActions>
          <Button
            type="button"
            title={isSubmitting ? 'Saving…' : 'Save link'}
            variant="primary"
            accent="blue"
            disabled={!canSubmit}
            onClick={handleSubmit}
          />
        </StyledActions>
      </StyledForm>
    </Section>
  );
};
