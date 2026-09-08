import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL } from './api-base-url';
import { InventoryApi, InventoryApiError } from './inventory-api';

const BASE = 'http://api.test/api';

describe('InventoryApi', () => {
  let api: InventoryApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    api = TestBed.inject(InventoryApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('omits the cursor parameter on the first page', () => {
    api.products({ cursor: null, size: 20, sortBy: 'productSku', direction: 'ASC' }).subscribe();

    const request = http.expectOne((r) => r.url === `${BASE}/products`);
    expect(request.request.params.has('cursor')).toBe(false);
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sortBy')).toBe('productSku');
    request.flush({ content: [], size: 20, sortBy: 'productSku', direction: 'ASC', nextCursor: null, hasMore: false });
  });

  it('sends the file as multipart under the part name the API expects', () => {
    const file = new File(['sku,name'], 'inventory.csv', { type: 'text/csv' });

    api.startImport(file).subscribe();

    const request = http.expectOne(`${BASE}/imports`);
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect((body.get('file') as File).name).toBe('inventory.csv');
    request.flush({});
  });

  it('unwraps the API error body so the message shown is the one the API wrote', async () => {
    const failure = firstError(api.summary());

    http.expectOne(`${BASE}/products/summary`).flush(
      { code: 'invalid_file', message: "'x.xlsx' is not a real .xlsx file." },
      { status: 400, statusText: 'Bad Request' },
    );

    const error = await failure;
    expect(error).toBeInstanceOf(InventoryApiError);
    expect(error.code).toBe('invalid_file');
    expect(error.message).toBe("'x.xlsx' is not a real .xlsx file.");
  });

  it('explains an unreachable backend rather than reporting "0 Unknown Error"', async () => {
    const failure = firstError(api.summary());

    http.expectOne(`${BASE}/products/summary`).error(new ProgressEvent('error'), { status: 0 });

    const error = await failure;
    expect(error.code).toBe('network_error');
    expect(error.message).toContain('Cannot reach the API');
  });
});

/** Resolves with the error an observable fails with. */
function firstError(source: { subscribe: (observer: { error: (e: InventoryApiError) => void }) => void }) {
  return new Promise<InventoryApiError>((resolve) => source.subscribe({ error: resolve }));
}
