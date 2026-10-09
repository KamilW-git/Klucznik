import { setupServer } from 'msw/node';

import { authHandlers } from './handlers/auth';

/** Domyślne handlery: brak sesji (refresh → 401). Testy nadpisują je przez `server.use(...)`. */
export const server = setupServer(...authHandlers);
