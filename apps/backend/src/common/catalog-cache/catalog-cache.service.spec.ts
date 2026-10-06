import { CatalogCacheService } from "./catalog-cache.service";

describe("CatalogCacheService", () => {
  const env = { ...process.env };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.FRONTEND_URL = "http://front.test/";
    process.env.INTERNAL_API_KEY = "k";
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    jest.useRealTimers();
    process.env = { ...env };
  });

  it("turns a burst of admin edits into one call to the frontend, with the shared key", async () => {
    const service = new CatalogCacheService();
    service.catalogChanged();
    service.catalogChanged();
    service.catalogChanged();
    await jest.advanceTimersByTimeAsync(300);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://front.test/api/revalidate",
      expect.objectContaining({ method: "POST", headers: { "x-internal-api-key": "k" } }),
    );
  });

  it("does nothing when not configured, and never throws when the frontend is down", async () => {
    const service = new CatalogCacheService();
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    service.catalogChanged();
    await expect(jest.advanceTimersByTimeAsync(300)).resolves.not.toThrow();

    delete process.env.INTERNAL_API_KEY;
    fetchMock.mockClear();
    service.catalogChanged();
    await jest.advanceTimersByTimeAsync(300);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
