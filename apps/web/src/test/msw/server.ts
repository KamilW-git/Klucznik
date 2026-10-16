import { setupServer } from 'msw/node';

import { adminHandlers } from './handlers/admin';
import { authHandlers } from './handlers/auth';
import { panelHandlers } from './handlers/panel';
import { publicHandlers } from './handlers/public';

/**
 * Domyślne handlery: brak sesji (refresh → 401), dane panelu, strony publicznej i panelu admina.
 * Testy nadpisują je przez `server.use(...)`.
 */
export const server = setupServer(
  ...authHandlers,
  ...panelHandlers,
  ...publicHandlers,
  ...adminHandlers,
);
