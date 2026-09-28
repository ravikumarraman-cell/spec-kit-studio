export type StudioAuthMode = 'disabled' | 'enterprise';

export interface OidcConfiguration {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  requiredGroupIds: string[];
}

export interface AuthConfiguration {
  mode: StudioAuthMode;
  sessionSecret?: string;
  sessionTtlMs: number;
  oidc?: OidcConfiguration;
}

export interface StudioPrincipal {
  id: string;
  displayName: string;
  email?: string;
  groups: string[];
  roles: string[];
}

export interface StudioSession {
  id: string;
  principal: StudioPrincipal;
  csrfToken: string;
  expiresAt: number;
}

export interface OidcTokens {
  idToken: string;
  accessToken?: string;
}
