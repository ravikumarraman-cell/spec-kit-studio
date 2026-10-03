export type StudioAuthMode = 'disabled' | 'enterprise';

export interface OidcConfiguration {
  issuer: string;
  clientId: string;
  /** Confidential web clients authenticate their token exchange; Entra SPA
   * registrations use PKCE and deliberately have no client secret. */
  clientSecret?: string;
  clientAuthentication: 'client_secret_post' | 'none';
  redirectUri: string;
  scopes: string[];
  requiredGroupIds: string[];
}

export interface AuthConfiguration {
  mode: StudioAuthMode;
  sessionSecret?: string;
  sessionTtlMs: number;
  oidc?: OidcConfiguration;
  githubOAuth?: { clientId: string; clientSecret: string; redirectUri: string; ssoOrganization?: string };
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
