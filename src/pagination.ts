/**
 * Auto-pagination for the search and jobs endpoints.
 *
 * The paginated methods return a {@link PagePromise}: `await` it for the first
 * {@link Page}, or `for await (… of …)` it to stream every item across all pages
 * (each page fetched on demand, through the client's rate limiter).
 *
 * Blitz uses two pagination styles, mirrored here:
 * - **cursor** (`search.people`, `search.companies`, `jobs.search`, `jobs.company`):
 *   pass the response `cursor` back; stop when the API returns `cursor: null`.
 *   → {@link CursorPage}
 * - **page** (`search.employee_finder`): increment `page` until it exceeds
 *   `total_pages`. → {@link OffsetPage}
 */

import { BlitzError } from "./errors.js";

/** One page of results plus the cross-page iteration helpers. */
export abstract class Page<TItem, TResponse> {
  constructor(
    /** The items on this page. */
    readonly data: TItem[],
    /** The full parsed wire response for this page (snake_case, 1:1 with the API). */
    readonly response: TResponse,
  ) {}

  /** Whether another page exists after this one. */
  abstract has_next_page(): boolean;

  /** Fetch the next page. Rejects with {@link BlitzError} if there is none. */
  abstract get_next_page(): Promise<Page<TItem, TResponse>>;

  /** Yield this page and every subsequent page. */
  async *iter_pages(): AsyncIterableIterator<Page<TItem, TResponse>> {
    let page: Page<TItem, TResponse> = this;
    for (;;) {
      yield page;
      if (!page.has_next_page()) return;
      page = await page.get_next_page();
    }
  }

  /** Yield every item across this page and all subsequent pages. */
  async *[Symbol.asyncIterator](): AsyncIterator<TItem> {
    for await (const page of this.iter_pages()) {
      for (const item of page.data) yield item;
    }
  }
}

/**
 * Cursor-paginated page: advances until the response cursor is `null`.
 *
 * Guards against a non-advancing cursor — if the API returns the same cursor it
 * was just given, {@link CursorPage.get_next_page} throws a {@link BlitzError}
 * instead of looping forever (which `for await` / {@link Page.iter_pages} would
 * otherwise do).
 */
export class CursorPage<TItem, TResponse> extends Page<TItem, TResponse> {
  /** The cursor that was sent to fetch `response` (`undefined` for the first page). */
  readonly #requested_cursor: string | undefined;
  readonly #fetch_page: (cursor?: string) => Promise<TResponse>;
  readonly #get_items: (response: TResponse) => TItem[];
  readonly #get_cursor: (response: TResponse) => string | null | undefined;

  constructor(
    response: TResponse,
    requested_cursor: string | undefined,
    fetch_page: (cursor?: string) => Promise<TResponse>,
    get_items: (response: TResponse) => TItem[],
    get_cursor: (response: TResponse) => string | null | undefined,
  ) {
    super(get_items(response), response);
    this.#requested_cursor = requested_cursor;
    this.#fetch_page = fetch_page;
    this.#get_items = get_items;
    this.#get_cursor = get_cursor;
  }

  has_next_page(): boolean {
    const cursor = this.#get_cursor(this.response);
    return typeof cursor === "string" && cursor.length > 0;
  }

  async get_next_page(): Promise<CursorPage<TItem, TResponse>> {
    const cursor = this.#get_cursor(this.response);
    if (typeof cursor !== "string" || cursor.length === 0) {
      throw new BlitzError("No next page: the previous response returned a null cursor.");
    }
    if (cursor === this.#requested_cursor) {
      throw new BlitzError(
        "Cursor did not advance: the API returned the same cursor it was given. " +
          "Aborting to avoid an infinite pagination loop.",
      );
    }
    const next = await this.#fetch_page(cursor);
    return new CursorPage(next, cursor, this.#fetch_page, this.#get_items, this.#get_cursor);
  }
}

/** Offset-paginated page: increments `page` until it exceeds `total_pages`. */
export class OffsetPage<TItem, TResponse> extends Page<TItem, TResponse> {
  readonly #page: number;
  readonly #fetch_page: (page: number) => Promise<TResponse>;
  readonly #get_items: (response: TResponse) => TItem[];
  readonly #get_total_pages: (response: TResponse) => number | null | undefined;

  constructor(
    response: TResponse,
    page: number,
    fetch_page: (page: number) => Promise<TResponse>,
    get_items: (response: TResponse) => TItem[],
    get_total_pages: (response: TResponse) => number | null | undefined,
  ) {
    super(get_items(response), response);
    this.#page = page;
    this.#fetch_page = fetch_page;
    this.#get_items = get_items;
    this.#get_total_pages = get_total_pages;
  }

  has_next_page(): boolean {
    const total = this.#get_total_pages(this.response);
    return typeof total === "number" && this.#page < total;
  }

  async get_next_page(): Promise<OffsetPage<TItem, TResponse>> {
    if (!this.has_next_page()) {
      throw new BlitzError("No next page: reached the last page.");
    }
    const next_page = this.#page + 1;
    const next = await this.#fetch_page(next_page);
    return new OffsetPage(
      next,
      next_page,
      this.#fetch_page,
      this.#get_items,
      this.#get_total_pages,
    );
  }
}

/**
 * Yield at most `n` items from an async source, then stop.
 *
 * `return`ing out of the loop propagates into the underlying generator
 * ({@link Page.iter_pages}), so no further pages are fetched once the cap is hit.
 * `n === undefined` means no cap; `n <= 0` yields nothing.
 */
async function* take<T>(source: AsyncIterable<T>, n: number | undefined): AsyncGenerator<T> {
  if (n !== undefined && n <= 0) return;
  let count = 0;
  for await (const item of source) {
    yield item;
    if (n !== undefined && ++count >= n) return;
  }
}

/**
 * The return type of the paginated `search.*` and `jobs.*` methods.
 *
 * Awaitable to the first {@link Page}, and directly async-iterable over every item
 * across all pages:
 *
 * ```ts
 * for await (const person of client.search.people({ max_results: 50 })) { ... }
 * const page = await client.search.people({ max_results: 50 });
 * const all = await client.search.people({ max_results: 50, max_items: 200 }).collect();
 * ```
 *
 * `max_items` (passed to the resource method, never sent on the wire) caps how many
 * items `for await` and {@link PagePromise.collect} yield, and stops fetching further
 * pages once reached. `await` + manual {@link Page.get_next_page} stay uncapped.
 */
export class PagePromise<TItem, TResponse>
  implements PromiseLike<Page<TItem, TResponse>>, AsyncIterable<TItem>
{
  readonly #promise: Promise<Page<TItem, TResponse>>;
  /** Client-side cap on how many items `for await` / {@link collect} will yield. */
  readonly #max_items: number | undefined;

  constructor(promise: Promise<Page<TItem, TResponse>>, max_items?: number) {
    this.#promise = promise;
    this.#max_items = max_items;
  }

  // biome-ignore lint/suspicious/noThenProperty: PagePromise is intentionally a thenable so `await` resolves the first page while `for await` streams items.
  then<TResult1 = Page<TItem, TResponse>, TResult2 = never>(
    onfulfilled?: ((value: Page<TItem, TResponse>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<Page<TItem, TResponse> | TResult> {
    return this.#promise.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<Page<TItem, TResponse>> {
    return this.#promise.finally(onfinally);
  }

  /**
   * Stream every item into an array, honoring `max_items`. Convenience over a
   * `for await` loop; pair with `max_items` so an unbounded result set can't
   * exhaust memory (or records — the API bills per result returned).
   */
  async collect(): Promise<TItem[]> {
    const items: TItem[] = [];
    for await (const item of this) items.push(item);
    return items;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<TItem> {
    const page = await this.#promise;
    yield* take(page, this.#max_items);
  }
}

/**
 * Build a {@link PagePromise} for a cursor-paginated endpoint.
 *
 * The resource method supplies `fetch_page` (which sends the request for a given
 * cursor) plus the accessors that pull the items and the next cursor out of a
 * response; `search.people`, `search.companies`, `jobs.search` and `jobs.company`
 * all share this one path.
 */
export function make_cursor_page_promise<TItem, TResponse>(
  initial_cursor: string | undefined,
  max_items: number | undefined,
  fetch_page: (cursor?: string) => Promise<TResponse>,
  get_items: (response: TResponse) => TItem[],
  get_cursor: (response: TResponse) => string | null | undefined,
): PagePromise<TItem, TResponse> {
  return new PagePromise<TItem, TResponse>(
    fetch_page(initial_cursor).then(
      (response) =>
        new CursorPage<TItem, TResponse>(
          response,
          initial_cursor,
          fetch_page,
          get_items,
          get_cursor,
        ),
    ),
    max_items,
  );
}

/**
 * Build a {@link PagePromise} for a page/offset-paginated endpoint
 * (`search.employee_finder`). Kept separate from the cursor factory on purpose —
 * the two pagination styles have different shapes, so one generic paginator would
 * be more indirection than it's worth.
 */
export function make_offset_page_promise<TItem, TResponse>(
  start_page: number,
  max_items: number | undefined,
  fetch_page: (page: number) => Promise<TResponse>,
  get_items: (response: TResponse) => TItem[],
  get_total_pages: (response: TResponse) => number | null | undefined,
): PagePromise<TItem, TResponse> {
  return new PagePromise<TItem, TResponse>(
    fetch_page(start_page).then(
      (response) =>
        new OffsetPage<TItem, TResponse>(
          response,
          start_page,
          fetch_page,
          get_items,
          get_total_pages,
        ),
    ),
    max_items,
  );
}
