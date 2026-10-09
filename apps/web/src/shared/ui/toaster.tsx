import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Toaster as Sonner } from 'sonner';

/** Toasty (S1): sukces, ostrzeżenie, błąd. Pozycja: prawy dół (desktop), góra (mobile). */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      mobileOffset={{ top: 16 }}
      closeButton
      duration={6000}
      icons={{
        success: <CircleCheck className="size-5 text-success" aria-hidden="true" />,
        error: <CircleAlert className="size-5 text-destructive" aria-hidden="true" />,
        warning: <TriangleAlert className="size-5 text-warning" aria-hidden="true" />,
        info: <Info className="size-5 text-info" aria-hidden="true" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-lg !border !bg-card !text-foreground !shadow-overlay !font-sans !gap-3 !p-4',
          title: '!text-base !font-semibold',
          description: '!text-sm !text-muted-foreground',
          success: '!border-success/30',
          error: '!border-destructive/30',
          warning: '!border-warning/30',
          closeButton: '!bg-card !border-border',
        },
      }}
    />
  );
}
