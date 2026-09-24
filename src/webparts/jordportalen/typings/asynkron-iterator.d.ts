/**
 * SPFx' rod-tsconfig laaser bevidst TypeScript-maalet til es5, og lib-listen
 * deromkring indeholder derfor ikke ES2018's `Symbol.asyncIterator`,
 * `AsyncIterator` eller `AsyncIterable` (se tsconfig-base.json). Roden
 * `tsconfig.json` maa ikke aendres, saa typerne suppleres her i stedet.
 *
 * Det er udelukkende et typescript-hul, ikke et runtime-hul: alle browsere
 * SPFx koerer i har `Symbol.asyncIterator` indbygget, og PnPjs' egne
 * `.d.ts`-filer (fx `@pnp/sp/items/types.d.ts`) bruger allerede disse typer
 * uden fejl, fordi `skipLibCheck: true` skjuler manglen i node_modules. Vores
 * egen kode i `domaene/paginering.ts` refererer derimod `Symbol.asyncIterator`
 * direkte og bliver derfor faktisk tjekket - deraf behovet for denne fil.
 *
 * Erklaeringerne spejler `lib.es2018.asynciterable.d.ts` fra TypeScript selv;
 * `IteratorResult` findes allerede via `es2015.iterable`, som staar i
 * lib-listen.
 */

interface SymbolConstructor {
  readonly asyncIterator: unique symbol;
}

interface AsyncIterator<T, TReturn = any, TNext = any> {
  next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>>;
  return?(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>>;
  throw?(e?: any): Promise<IteratorResult<T, TReturn>>;
}

interface AsyncIterable<T, TReturn = any, TNext = any> {
  [Symbol.asyncIterator](): AsyncIterator<T, TReturn, TNext>;
}
