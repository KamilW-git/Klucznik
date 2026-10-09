import { setupServer } from 'msw/node';

import { authHandlers } from './handlers/auth';
import { panelHandlers } from './handlers/panel';

/** Domyślne handlery: brak sesji (refresh → 401) i dane panelu. Testy nadpisują je przez `server.use(...)`. */
export const server = setupServer(...authHandlers, ...panelHandlers);
