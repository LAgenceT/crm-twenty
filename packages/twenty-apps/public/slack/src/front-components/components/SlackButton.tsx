import styled from '@emotion/styled';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const SlackButton = styled.button`
  background: ${() => themeCssVariables.color.blue};
  border: none;
  border-radius: ${() => themeCssVariables.border.radius.sm};
  color: ${() => themeCssVariables.font.color.inverted};
  cursor: pointer;
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
  font-weight: ${() => themeCssVariables.font.weight.medium};
  padding: ${() => themeCssVariables.spacing[2]} ${() =>
    themeCssVariables.spacing[3]};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;
