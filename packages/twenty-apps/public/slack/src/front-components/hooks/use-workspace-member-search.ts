import { isNonEmptyString } from '@sniptt/guards';
import { useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { type WorkspaceMemberOption } from 'src/front-components/types/workspace-member-option.type';
import { formatWorkspaceMemberName } from 'src/front-components/utils/format-workspace-member-name.util';

const WORKSPACE_MEMBER_SEARCH_DEBOUNCE_MS = 250;
const WORKSPACE_MEMBER_SEARCH_PAGE_SIZE = 20;

const escapeIlikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');

type WorkspaceMemberSearchState = {
  options: WorkspaceMemberOption[];
  isSearching: boolean;
};

export const useWorkspaceMemberSearch = (
  searchTerm: string,
): WorkspaceMemberSearchState => {
  const [options, setOptions] = useState<WorkspaceMemberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();

    if (!isNonEmptyString(trimmedSearchTerm)) {
      setOptions([]);
      setIsSearching(false);

      return;
    }

    let cancelled = false;

    setIsSearching(true);

    const timeoutId = setTimeout(async () => {
      try {
        const pattern = `%${escapeIlikePattern(trimmedSearchTerm)}%`;
        const client = new CoreApiClient();
        const queryResult = await client.query({
          workspaceMembers: {
            __args: {
              filter: {
                or: [
                  { name: { firstName: { ilike: pattern } } },
                  { name: { lastName: { ilike: pattern } } },
                ],
              },
              first: WORKSPACE_MEMBER_SEARCH_PAGE_SIZE,
            },
            edges: {
              node: {
                id: true,
                name: { firstName: true, lastName: true },
                userEmail: true,
              },
            },
          },
        });

        if (cancelled) {
          return;
        }

        const memberOptions: WorkspaceMemberOption[] = [];

        for (const edge of queryResult.workspaceMembers?.edges ?? []) {
          const node = edge?.node;

          if (!isNonEmptyString(node?.id)) {
            continue;
          }

          memberOptions.push({
            id: node.id,
            name: formatWorkspaceMemberName(node.name),
            userEmail: node.userEmail ?? null,
          });
        }

        setOptions(memberOptions);
      } catch {
        if (!cancelled) {
          setOptions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, WORKSPACE_MEMBER_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  return { options, isSearching };
};
