import { setupServer } from 'msw/node';

import { authHandlers } from './handlers/auth';
import { panelHandlers } from './handlers/panel';
import { publicHandlers } from './handlers/public';

/**
 * Domyślne handlery: brak sesji (refresh → 401), dane panelu i strony publicznej.
 * Testy nadpisują je przez `server.use(...)`.
 */
export const server = setupServer(...authHandlers, ...panelHandlers, ...publicHandlers);
