import { toast } from 'sonner';

import { getErrorMessage, getRequestId } from './api-errors';

/** Toast sukcesu (np. „Rezerwacja została potwierdzona”). */
export function notifySuccess(title: string, description?: string): void {
  toast.success(title, { description });
}

/** Toast błędu akcji z listy lub drawera; dla 5xx z identyfikatorem zgłoszenia. */
export function notifyError(error: unknown, title = 'Nie udało się wykonać operacji'): void {
  const requestId = getRequestId(error);
  toast.error(title, {
    description: requestId
      ? `${getErrorMessage(error)} (identyfikator: ${requestId})`
      : getErrorMessage(error),
  });
}
