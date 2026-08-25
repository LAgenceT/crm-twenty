import { isBoolean } from '@sniptt/guards';
import { useEffect, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';

import { SLACK_USER_LINKS_CAN_MANAGE_ROUTE_PATH } from 'src/constants/slack-user-links-route-path.constant';
import { asRecord } from 'src/front-components/utils/as-record.util';

type CanManageSlackUserLinksState = {
  canManage: boolean;
  isPermissionLoading: boolean;
};

const LOADING_STATE: CanManageSlackUserLinksState = {
  canManage: false,
  isPermissionLoading: true,
};

export const useCanManageSlackUserLinks = (): CanManageSlackUserLinksState => {
  const [state, setState] =
    useState<CanManageSlackUserLinksState>(LOADING_STATE);

  useEffect(() => {
    let cancelled = false;

    setState(LOADING_STATE);

    const fetchPermission = async () => {
      try {
        const result = await new RestApiClient().post(
          `/s${SLACK_USER_LINKS_CAN_MANAGE_ROUTE_PATH}`,
        );

        const canManage = asRecord(result)?.canManage;

        if (!cancelled) {
          setState({
            canManage: isBoolean(canManage) ? canManage : false,
            isPermissionLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ canManage: false, isPermissionLoading: false });
        }
      }
    };

    fetchPermission();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};
