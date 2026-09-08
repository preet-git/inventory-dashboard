import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryApi, InventoryApiError } from './inventory-api';
import type { ProductPage, ProductRow } from './models';
import { ProductsStore } from './products-store';

function row(rowNumber: number): ProductRow {
  return {
    rowNumber,
    productSku: `SKU-${rowNumber}`,
    productName: `Product ${rowNumber}`,
    category: 'Widgets',
    purchaseDate: '2024-03-16',
    unitPrice: 10,
    quantity: 2,
    lineValue: 20,
    stockAgeDays: 100,
  };
}

function page(rows: number[], nextCursor: string | null): ProductPage {
  return {
    content: rows.map(row),
    size: 20,
    sortBy: 'productSku',
    direction: 'ASC',
    nextCursor,
    hasMore: nextCursor !== null,
  };
}

describe('ProductsStore', () => {
  let api: { products: ReturnType<typeof vi.fn>; summary: ReturnType<typeof vi.fn> };
  let store: ProductsStore;

  beforeEach(() => {
    api = {
      products: vi.fn().mockReturnValue(of(page([1, 2], 'cursor-page-2'))),
      summary: vi.fn().mockReturnValue(
        of({ totalProducts: 42, totalInventoryValue: 840, averageStockAgeDays: 100 }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [ProductsStore, { provide: InventoryApi, useValue: api }],
    });
    store = TestBed.inject(ProductsStore);
  });

  it('loads the first page with no cursor', () => {
    store.refresh();

    expect(api.products).toHaveBeenCalledWith({
      cursor: null,
      size: 20,
      sortBy: 'productSku',
      direction: 'ASC',
    });
    expect(store.rows()).toHaveLength(2);
    expect(store.hasPrevious()).toBe(false);
    expect(store.hasNext()).toBe(true);
  });

  it('walks forward with the cursor the previous page returned', () => {
    store.refresh();
    api.products.mockReturnValue(of(page([3, 4], null)));

    store.next();

    expect(api.products).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'cursor-page-2' }),
    );
    expect(store.pageIndex()).toBe(1);
    expect(store.hasNext()).toBe(false);
    expect(store.hasPrevious()).toBe(true);
  });

  it('walks back by re-fetching with the cursor that opened the earlier page', () => {
    store.refresh();
    api.products.mockReturnValue(of(page([3, 4], null)));
    store.next();
    api.products.mockReturnValue(of(page([1, 2], 'cursor-page-2')));

    store.previous();

    // Back on page one, which was opened with no cursor at all.
    expect(api.products).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: null }));
    expect(store.pageIndex()).toBe(0);
    expect(store.hasPrevious()).toBe(false);
  });

  it('toggles direction when the sorted column is clicked again, and restarts the walk', () => {
    store.refresh();
    store.next();

    store.sort('productSku');

    expect(store.direction()).toBe('DESC');
    expect(store.pageIndex()).toBe(0);
    expect(api.products).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: null, direction: 'DESC' }),
    );
  });

  it('opens stock age on the oldest stock rather than the newest', () => {
    store.refresh();

    store.sort('stockAgeDays');

    expect(store.direction()).toBe('DESC');
  });

  it('restarts the walk when the page size changes, because a cursor assumes a step length', () => {
    store.refresh();
    store.next();

    store.setPageSize(50);

    expect(store.pageIndex()).toBe(0);
    expect(api.products).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: null, size: 50 }),
    );
  });

  it('counts the range from the page position and the total on the summary', () => {
    store.refresh();
    expect(store.rangeLabel()).toBe('1-2 of 42');

    api.products.mockReturnValue(of(page([3, 4], null)));
    store.next();
    expect(store.rangeLabel()).toBe('21-22 of 42');
  });

  it('shows the API message and empties the table when a page fails to load', () => {
    api.products.mockReturnValue(
      throwError(() => new InventoryApiError('network_error', 'Cannot reach the API.', 0)),
    );

    store.refresh();

    expect(store.error()).toBe('Cannot reach the API.');
    expect(store.rows()).toEqual([]);
    expect(store.loading()).toBe(false);
  });
});
