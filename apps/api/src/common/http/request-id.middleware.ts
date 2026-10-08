import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- rozszerzenie typów Expressa
  namespace Express {
    interface Request {
      /** Identyfikator żądania z `X-Request-Id` (lub wygenerowany). Trafia do odpowiedzi i logów. */
      requestId: string;
    }
  }
}

export const REQUEST_ID_HEADER = 'X-Request-Id';

// Przyjmujemy identyfikator od klienta lub proxy tylko w bezpiecznej postaci (bez wstrzykiwania do logów).
const VALID_REQUEST_ID = /^[\w-]{1,128}$/;

/** Nadaje żądaniu `requestId` i odsyła go w nagłówku `X-Request-Id`. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
