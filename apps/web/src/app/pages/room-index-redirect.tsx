import { Navigate, useParams } from 'react-router';

import { routes } from '../routes';

/** `/panel/pokoje/:roomId` bez zakładki → „Informacje”. */
export function RoomIndexRedirect() {
  const { roomId = '' } = useParams();
  return <Navigate to={routes.panel.room(roomId)} replace />;
}
