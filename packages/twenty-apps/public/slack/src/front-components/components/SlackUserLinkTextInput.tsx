import styled from '@emotion/styled';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const SlackUserLinkTextInput = styled.input`
  background: ${() => themeCssVariables.background.primary};
  border: 1px solid ${() => themeCssVariables.border.color.medium};
  border-radius: ${() => themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${() => themeCssVariables.font.color.primary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
  padding: ${() => themeCssVariables.spacing[2]};
  width: 100%;

  &::placeholder {
    color: ${() => themeCssVariables.font.color.light};
  }

  &:focus {
    border-color: ${() => themeCssVariables.color.blue};
    outline: none;
  }
`;
