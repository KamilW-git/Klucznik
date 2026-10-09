/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adres API z prefiksem wersji; domyślnie `/api/v1` (ten sam origin, proxy Vite lub nginx). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
