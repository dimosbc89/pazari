import { SEARCH_CONFIG } from '../config';
import { createLocalBackend } from './local';
import { createTypesenseBackend } from './typesense';
import type { SearchBackend } from './types';

export const backend: SearchBackend =
  SEARCH_CONFIG.backend === 'typesense' ? createTypesenseBackend(SEARCH_CONFIG.typesense) : createLocalBackend();

export const isDemo = SEARCH_CONFIG.backend !== 'typesense';

export * from './types';
