import { useEffect } from 'react';

interface DocumentMeta {
  title: string;
  description?: string;
  /** Np. `noindex` dla stron z sekretnym tokenem w adresie. */
  robots?: string;
  /** `no-referrer`: adres z tokenem nie trafia do serwisów zewnętrznych (mapa, CDN). */
  referrer?: ReferrerPolicy;
}

function setMeta(name: string, content: string | undefined): () => void {
  if (content === undefined) return () => undefined;
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const created = !element;
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.append(element);
  }
  const previous = element.content;
  element.content = content;
  const target = element;
  return () => {
    if (created) target.remove();
    else target.content = previous;
  };
}

/** Tytuł karty i meta tagi strony (podstawowe SEO w SPA); po odmontowaniu przywraca poprzednie. */
export function useDocumentMeta({ title, description, robots, referrer }: DocumentMeta) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const restore = [
      setMeta('description', description),
      setMeta('robots', robots),
      setMeta('referrer', referrer),
    ];
    return () => {
      document.title = previousTitle;
      for (const undo of restore) undo();
    };
  }, [title, description, robots, referrer]);
}
