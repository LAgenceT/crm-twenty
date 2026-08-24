import { isNonEmptyString } from '@sniptt/guards';
import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { type SlackUserLinkRecord } from 'src/front-components/types/slack-user-link-record.type';
import { formatWorkspaceMemberName } from 'src/front-components/utils/format-workspace-member-name.util';

const SLACK_USER_LINKS_PAGE_SIZE = 100;

const SLACK_USER_LINKS_ERROR_MESSAGE =
  'Could not load Slack user links. Please try again later.';

type SlackUserLinksState = {
  slackUserLinks: SlackUserLinkRecord[];
  isSlackUserLinksLoading: boolean;
  errorMessage: string | undefined;
  refetchSlackUserLinks: () => Promise<void>;
};

export const useSlackUserLinks = (): SlackUserLinksState => {
  const [slackUserLinks, setSlackUserLinks] = useState<SlackUserLinkRecord[]>(
    [],
  );
  const [isSlackUserLinksLoading, setIsSlackUserLinksLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );

  const fetchSlackUserLinks = useCallback(async () => {
    setIsSlackUserLinksLoading(true);
    setErrorMessage(undefined);

    try {
      const client = new CoreApiClient();
      const queryResult = await client.query({
        slackUserLinks: {
          __args: { first: SLACK_USER_LINKS_PAGE_SIZE },
          edges: {
            node: {
              id: true,
              name: true,
              slackUserId: true,
              slackTeamId: true,
              source: true,
              workspaceMemberId: true,
              workspaceMember: {
                id: true,
                name: { firstName: true, lastName: true },
              },
            },
          },
        },
      });

      const records: SlackUserLinkRecord[] = [];

      for (const edge of queryResult.slackUserLinks?.edges ?? []) {
        const node = edge?.node;

        if (!isNonEmptyString(node?.id)) {
          continue;
        }

        records.push({
          id: node.id,
          name: node.name ?? null,
          slackUserId: node.slackUserId ?? null,
          slackTeamId: node.slackTeamId ?? null,
          source: node.source ?? null,
          workspaceMemberId: node.workspaceMemberId ?? null,
          workspaceMemberName: node.workspaceMember
            ? formatWorkspaceMemberName(node.workspaceMember.name)
            : null,
        });
      }

      records.sort((left, right) =>
        (left.name ?? left.slackUserId ?? '').localeCompare(
          right.name ?? right.slackUserId ?? '',
        ),
      );

      setSlackUserLinks(records);
    } catch {
      setErrorMessage(SLACK_USER_LINKS_ERROR_MESSAGE);
    } finally {
      setIsSlackUserLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlackUserLinks();
  }, [fetchSlackUserLinks]);

  return {
    slackUserLinks,
    isSlackUserLinksLoading,
    errorMessage,
    refetchSlackUserLinks: fetchSlackUserLinks,
  };
};
