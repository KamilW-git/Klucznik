import type { Response } from 'express';

import { API_PREFIX } from '../../app.setup';

/** `Location` dla `201 Created`: `setLocation(res, 'admin/owners', id)` → `/api/v1/admin/owners/<id>`. */
export function setLocation(res: Response, resourcePath: string, id: string): void {
  res.location(`/${API_PREFIX}/${resourcePath.replace(/^\/+|\/+$/g, '')}/${id}`);
}
