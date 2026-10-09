import { cva } from 'class-variance-authority';

/** Warianty przycisku (S1, sekcja 06); także dla linków stylowanych jak przycisk. */
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-[color,background-color,border-color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover',
        /** Konwersja na stronie publicznej („Zarezerwuj”, „Sprawdź dostępność”). */
        accent:
          'bg-highlight-strong text-highlight-foreground shadow-xs hover:bg-highlight-strong-hover',
        outline:
          'border-[1.5px] border-primary/25 bg-card text-primary hover:border-primary hover:bg-background',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-sand/60',
        ghost: 'text-primary hover:bg-accent',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive-hover',
        'destructive-outline':
          'border-[1.5px] border-destructive/30 bg-card text-destructive hover:border-destructive hover:bg-destructive-soft',
        link: 'h-auto px-0 text-primary underline underline-offset-4 hover:text-primary-hover active:scale-100',
      },
      size: {
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        md: 'h-11 px-4 text-base',
        lg: 'h-12 px-6 text-base max-sm:h-13',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
