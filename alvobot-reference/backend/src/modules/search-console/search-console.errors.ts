export const SearchConsoleErrorCodes = {
  CONNECTION_EXPIRED: "connection_expired",
  PROPERTY_NOT_VERIFIED: "property_not_verified",
  CANONICAL_MISMATCH: "canonical_mismatch",
  CANNOT_BE_INDEXED: "cannot_be_indexed",
  QUOTA_EXCEEDED: "quota_exceeded",
  INELIGIBLE_URL: "ineligible_url",
} as const;

export type SearchConsoleErrorCode =
  (typeof SearchConsoleErrorCodes)[keyof typeof SearchConsoleErrorCodes];

export function mapSearchConsoleError(code: SearchConsoleErrorCode) {
  switch (code) {
    case SearchConsoleErrorCodes.CONNECTION_EXPIRED:
      return "Conexão expirada. Reconecte sua conta.";
    case SearchConsoleErrorCodes.PROPERTY_NOT_VERIFIED:
      return "Propriedade não verificada no Search Console.";
    case SearchConsoleErrorCodes.CANONICAL_MISMATCH:
      return "Canonical da URL aponta para outra página.";
    case SearchConsoleErrorCodes.CANNOT_BE_INDEXED:
      return "A URL não pode ser indexada pelo Google.";
    case SearchConsoleErrorCodes.QUOTA_EXCEEDED:
      return "Quota diária esgotada para esta conexão.";
    case SearchConsoleErrorCodes.INELIGIBLE_URL:
      return "URL não elegível para Indexing API.";
    default:
      return "Erro desconhecido.";
  }
}
