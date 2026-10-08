import request from 'supertest';

import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import type { Property, Room } from '../../src/infrastructure/prisma/generated/client';
import type { PhotoDto } from '../../src/modules/photos/http/photo.dto';
import type { PropertyDto } from '../../src/modules/properties/http/property.dto';
import type { RoomDto } from '../../src/modules/rooms/http/room.dto';
import { createOwner, createProperty, createRoom } from '../factories';
import { accessTokenFor, bearer } from '../support/auth';
import { EXE, JPEG, PNG } from '../support/images';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

const errorCode = (res: request.Response): string => (res.body as ErrorResponseDto).code;
const photo = (res: request.Response): PhotoDto => res.body as PhotoDto;

describe('Photos and files', () => {
  let ctx: TestApp;
  let property: Property;
  let room: Room;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());
  const upload = (path: string, content: Buffer, name = 'photo.jpg') =>
    http().post(path).set(bearer(token)).attach('file', content, name);

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    const owner = await createOwner(ctx.prisma);
    property = await createProperty(ctx.prisma, owner);
    room = await createRoom(ctx.prisma, property);
    token = accessTokenFor(ctx.app, owner);
  });

  it('uploads a JPG (201) and serves it publicly with cache headers', async () => {
    const res = await upload(`/api/v1/rooms/${room.id}/photos`, JPEG)
      .field('altText', 'Taras')
      .expect(201);

    expect(photo(res)).toMatchObject({
      roomId: room.id,
      mimeType: 'image/jpeg',
      sizeBytes: JPEG.length,
      sortOrder: 0,
      altText: 'Taras',
      url: expect.stringMatching(/^\/api\/v1\/files\/[0-9a-f-]{36}\.jpg$/) as unknown,
    });
    const file = await http().get(photo(res).url).buffer(true).expect(200);
    expect(file.headers['content-type']).toBe('image/jpeg');
    expect(file.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(Buffer.compare(file.body as Buffer, JPEG)).toBe(0);
  });

  it('detects the type by signature: an .exe renamed to .jpg → 415', async () => {
    const res = await upload(`/api/v1/properties/${property.id}/photos`, EXE, 'kot.jpg').expect(
      415,
    );

    expect(errorCode(res)).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('rejects a file over UPLOAD_MAX_BYTES → 413 FILE_TOO_LARGE', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(300 * 1024)]);

    const res = await upload(`/api/v1/properties/${property.id}/photos`, big).expect(413);

    expect(errorCode(res)).toBe('FILE_TOO_LARGE');
  });

  it('requires the file field (400)', async () => {
    await http()
      .post(`/api/v1/rooms/${room.id}/photos`)
      .set(bearer(token))
      .field('altText', 'x')
      .expect(400);
  });

  it('rejects the 21st photo of a room → 422 PHOTO_LIMIT_REACHED (Q-14)', async () => {
    await ctx.prisma.photo.createMany({
      data: Array.from({ length: 20 }, (_, i) => ({
        propertyId: property.id,
        roomId: room.id,
        storageKey: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 1,
        sortOrder: i,
      })),
    });

    const res = await upload(`/api/v1/rooms/${room.id}/photos`, JPEG).expect(422);
    // Limit dotyczy galerii pokoju, nie obiektu.
    await upload(`/api/v1/properties/${property.id}/photos`, JPEG).expect(201);

    expect(res.body).toMatchObject({ code: 'PHOTO_LIMIT_REACHED', details: { limit: 20 } });
  });

  it('appends new photos and moves one to the cover position, renumbering the gallery', async () => {
    const a = photo(await upload(`/api/v1/properties/${property.id}/photos`, JPEG).expect(201));
    const b = photo(
      await upload(`/api/v1/properties/${property.id}/photos`, PNG, 'b.png').expect(201),
    );
    const c = photo(await upload(`/api/v1/properties/${property.id}/photos`, JPEG).expect(201));
    expect([a.sortOrder, b.sortOrder, c.sortOrder]).toEqual([0, 1, 2]);

    await http()
      .patch(`/api/v1/photos/${c.id}`)
      .set(bearer(token))
      .send({ sortOrder: 0 })
      .expect(200);

    const res = await http()
      .get(`/api/v1/properties/${property.id}`)
      .set(bearer(token))
      .expect(200);
    const dto = res.body as PropertyDto;
    expect(dto.photos.map((p) => [p.id, p.sortOrder])).toEqual([
      [c.id, 0],
      [a.id, 1],
      [b.id, 2],
    ]);
    expect(dto.coverPhoto?.id).toBe(c.id);
  });

  it('room photos appear in RoomDto, not in the property gallery', async () => {
    const roomPhoto = photo(await upload(`/api/v1/rooms/${room.id}/photos`, JPEG).expect(201));

    const roomRes = await http().get(`/api/v1/rooms/${room.id}`).set(bearer(token)).expect(200);
    const propertyRes = await http()
      .get(`/api/v1/properties/${property.id}`)
      .set(bearer(token))
      .expect(200);

    expect((roomRes.body as RoomDto).coverPhoto?.id).toBe(roomPhoto.id);
    expect((propertyRes.body as PropertyDto).photos).toEqual([]);
  });

  it('deletes the record and the file; the rest of the gallery is renumbered', async () => {
    const a = photo(await upload(`/api/v1/rooms/${room.id}/photos`, JPEG).expect(201));
    const b = photo(await upload(`/api/v1/rooms/${room.id}/photos`, JPEG).expect(201));

    await http().delete(`/api/v1/photos/${a.id}`).set(bearer(token)).expect(204);

    await http().get(a.url).expect(404);
    const res = await http().get(`/api/v1/rooms/${room.id}`).set(bearer(token)).expect(200);
    expect((res.body as RoomDto).photos.map((p) => [p.id, p.sortOrder])).toEqual([[b.id, 0]]);
  });

  it.each([
    '/api/v1/files/..%2F..%2Fetc%2Fpasswd',
    '/api/v1/files/not-a-key.jpg',
    '/api/v1/files/6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a.exe',
    '/api/v1/files/6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a.jpg',
  ])('GET %s → 404 NOT_FOUND', async (path) => {
    const res = await http().get(path).expect(404);

    expect(errorCode(res)).toBe('NOT_FOUND');
  });
});
