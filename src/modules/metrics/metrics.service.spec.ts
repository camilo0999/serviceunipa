import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  const prismaMock: any = {
    ticket: { count: async () => 0, groupBy: async () => [] },
    menuDia: { findMany: async () => [] },
  } as any;
  const svc = new MetricsService(prismaMock as any);

  it('returns food metrics shape', async () => {
    const res = await svc.foodMetrics();
    expect(res).toHaveProperty('totalTickets');
    expect(res).toHaveProperty('usedTickets');
  });
});
