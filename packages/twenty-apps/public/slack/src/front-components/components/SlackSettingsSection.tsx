import styled from '@emotion/styled';
import { type ReactNode } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[4]};
`;

const StyledHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.h2`
  color: ${() => themeCssVariables.font.color.primary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.md};
  font-weight: ${() => themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledDescription = styled.p`
  color: ${() => themeCssVariables.font.color.tertiary};
  font-family: ${() => themeCssVariables.font.family};
  font-size: ${() => themeCssVariables.font.size.sm};
  margin: 0;
`;

type SlackSettingsSectionProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export const SlackSettingsSection = ({
  title,
  description,
  children,
}: SlackSettingsSectionProps) => (
  <StyledSection>
    <StyledHeader>
      <StyledTitle>{title}</StyledTitle>
      {description !== undefined && (
        <StyledDescription>{description}</StyledDescription>
      )}
    </StyledHeader>
    {children}
  </StyledSection>
);
