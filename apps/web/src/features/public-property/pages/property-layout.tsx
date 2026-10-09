import { isApiError, usePublicGetProperty } from '@klucznik/api-client';
import { SearchX } from 'lucide-react';
import { Outlet, useParams } from 'react-router';

import { PublicContainer, PublicLayout } from '@/app/layouts/public-layout';
import { PUBLIC_PROPERTY_QUERY } from '@/shared/lib/public-query';
import { useDocumentMeta } from '@/shared/lib/use-document-meta';
import { EmptyState, ErrorState, PageSkeleton } from '@/shared/ui/states';

import { PropertyHeader, PropertyHeaderSkeleton } from '../components/property-header';

/**
 * Trasy `/o/:slug/*` (P1–P4): pobiera obiekt raz (`GET /public/properties/:slug`), pokazuje markę
 * obiektu w nagłówku i przekazuje dane stronom (`usePublicProperty`). Nieaktywny obiekt → 404.
 */
export function PublicPropertyLayout() {
  const { slug = '' } = useParams();
  const property = usePublicGetProperty(slug, { query: PUBLIC_PROPERTY_QUERY });

  if (property.isPending) {
    return (
      <PublicLayout header={<PropertyHeaderSkeleton />}>
        <PublicContainer className="py-10">
          <PageSkeleton />
        </PublicContainer>
      </PublicLayout>
    );
  }

  if (property.isError) {
    return isApiError(property.error) && property.error.status === 404 ? (
      <PropertyNotFound />
    ) : (
      <PublicLayout>
        <PublicContainer className="py-10">
          <ErrorState
            error={property.error}
            title="Nie udało się wczytać strony obiektu"
            onRetry={() => void property.refetch()}
            retrying={property.isRefetching}
          />
        </PublicContainer>
      </PublicLayout>
    );
  }

  const data = property.data;
  return (
    <PublicLayout
      brandName={data.name}
      header={
        <PropertyHeader name={data.name} slug={data.slug} city={data.city} phone={data.phone} />
      }
    >
      <Outlet context={data} />
    </PublicLayout>
  );
}

function PropertyNotFound() {
  useDocumentMeta({ title: 'Nie znaleziono obiektu', robots: 'noindex' });
  return (
    <PublicLayout>
      <PublicContainer className="py-16">
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title="Nie znaleziono obiektu"
          description="Ta strona nie istnieje albo obiekt nie przyjmuje teraz rezerwacji online. Sprawdź adres strony."
        />
      </PublicContainer>
    </PublicLayout>
  );
}
