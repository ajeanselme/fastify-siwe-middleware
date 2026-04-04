export type AuthUser = {
  address: string;
  sessionId: string;
};

export type AuthJwtPayload = {
  sub: string;
  sessionId: string;
  jti?: string;
};
