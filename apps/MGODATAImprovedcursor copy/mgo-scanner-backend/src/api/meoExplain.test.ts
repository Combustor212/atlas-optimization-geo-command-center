import { handleMEOExplain } from './meoExplain';

jest.mock('../lib/places', () => ({
  getPlaceDetailsForExplain: jest.fn(),
}));

jest.mock('../meo/meoEngine', () => ({
  calculateMEOScore: jest.fn(),
}));

import { getPlaceDetailsForExplain } from '../lib/places';
import { calculateMEOScore } from '../meo/meoEngine';

function makeRes() {
  const res: any = {};
  res.headers = {};
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.statusCode = 200;
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.body = null;
  res.json = (obj: any) => { res.body = obj; return res; };
  return res;
}

describe('GET /api/meo/explain handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('400 when missing placeId', async () => {
    const req: any = { query: {} };
    const res = makeRes();
    await handleMEOExplain(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns cached result on second call without force', async () => {
    (getPlaceDetailsForExplain as any).mockResolvedValue({
      place_id: 'p1',
      name: 'Biz',
      formatted_address: 'Addr',
      photos: [{ photo_reference: 'a' }],
      rating: 4.7,
      user_ratings_total: 57,
    });

    (calculateMEOScore as any).mockReturnValue({
      body: {
        businessName: 'Biz',
        address: 'Addr',
        meoScore: 70,
        gbpFacts: {
          rating: 4.7,
          totalReviews: 57,
          photoCount: 1,
          hasWebsite: true,
          hasPhone: true,
          hasHours: true,
          hasDescription: true,
        },
        meoBreakdown: {
          wasCapped: false,
          reviewReliabilityCapApplied: false,
          reviewReliabilityCap: null,
          capReason: null,
          rawScore: 70,
          rawScoreBeforeCap: null,
          finalScore: 70,
          components: { photos: { points: 2, maxPoints: 10 }, engagement: { points: 0, maxPoints: 8 }, profile: { points: 8, maxPoints: 16 } },
        },
      },
    });

    const req1: any = { query: { placeId: 'p1' } };
    const res1 = makeRes();
    await handleMEOExplain(req1, res1);
    expect(res1.statusCode).toBe(200);
    expect(res1.body?.meta?.cacheHit).toBe(false);

    const req2: any = { query: { placeId: 'p1' } };
    const res2 = makeRes();
    await handleMEOExplain(req2, res2);
    expect(res2.statusCode).toBe(200);
    expect(res2.body?.meta?.cacheHit).toBe(true);
  });

  test('force=1 bypasses cache', async () => {
    (getPlaceDetailsForExplain as any).mockResolvedValue({
      place_id: 'p2',
      name: 'Biz2',
      formatted_address: 'Addr2',
      photos: [{ photo_reference: 'a' }],
      rating: 4.9,
      user_ratings_total: 10,
    });

    (calculateMEOScore as any).mockReturnValue({
      body: {
        businessName: 'Biz2',
        address: 'Addr2',
        meoScore: 60,
        gbpFacts: {
          rating: 4.9,
          totalReviews: 10,
          photoCount: 1,
          hasWebsite: true,
          hasPhone: true,
          hasHours: true,
          hasDescription: true,
        },
        meoBreakdown: {
          wasCapped: false,
          reviewReliabilityCapApplied: false,
          reviewReliabilityCap: null,
          capReason: null,
          rawScore: 60,
          rawScoreBeforeCap: null,
          finalScore: 60,
          components: { photos: { points: 1, maxPoints: 10 }, engagement: { points: 0, maxPoints: 8 }, profile: { points: 8, maxPoints: 16 } },
        },
      },
    });

    const req1: any = { query: { placeId: 'p2' } };
    const res1 = makeRes();
    await handleMEOExplain(req1, res1);
    expect(res1.body?.meta?.cacheHit).toBe(false);

    const req2: any = { query: { placeId: 'p2', force: '1' } };
    const res2 = makeRes();
    await handleMEOExplain(req2, res2);
    expect(res2.body?.meta?.cacheHit).toBe(false);
    expect(getPlaceDetailsForExplain).toHaveBeenCalled();
  });
});





