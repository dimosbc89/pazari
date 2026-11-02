/// <reference types="vite/client" />
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SEARCH_BACKEND?: 'local' | 'typesense';
  readonly VITE_TYPESENSE_HOST?: string;
  readonly VITE_TYPESENSE_PORT?: string;
  readonly VITE_TYPESENSE_PROTOCOL?: string;
  readonly VITE_TYPESENSE_SEARCH_KEY?: string;
  readonly VITE_TYPESENSE_COLLECTION?: string;
  readonly VITE_GTM_ID?: string;
}
