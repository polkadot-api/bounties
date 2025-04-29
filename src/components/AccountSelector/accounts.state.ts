import { state, withDefault } from "@react-rxjs/core";
import {
  combineKeys,
  createKeyedSignal,
  createSignal,
} from "@react-rxjs/utils";
import {
  connectInjectedExtension,
  getInjectedExtensions,
  InjectedExtension,
  InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import {
  catchError,
  concat,
  defer,
  filter,
  interval,
  map,
  merge,
  NEVER,
  Observable,
  of,
  retry,
  scan,
  startWith,
  switchMap,
  take,
  tap,
  timer,
} from "rxjs";

export const availableExtensions$ = state(
  concat(
    timer(0, 100).pipe(
      map(getInjectedExtensions),
      filter((v) => v.length > 0),
      take(1)
    ),
    interval(2000).pipe(map(getInjectedExtensions))
  ),
  []
);

const [toggleExtension$, onToggleExtension] = createKeyedSignal<string>();
export { onToggleExtension };

export const enum ConnectStatus {
  Connecting,
  Disconnected,
  Connected,
}
export type ExtensionState =
  | {
      type: ConnectStatus.Disconnected;
    }
  | { type: ConnectStatus.Connecting }
  | { type: ConnectStatus.Connected; value: InjectedExtension };

const SELECTED_EXTENSIONS_KEY = "selected-extensions";
const getPreselectedExtensions = () => {
  try {
    const res = JSON.parse(localStorage.getItem(SELECTED_EXTENSIONS_KEY)!);
    if (Array.isArray(res)) return res;
    // eslint-disable-next-line no-empty
  } catch (_) {}
  return null;
};
const extensionIsPreselected = (extension: string) =>
  getPreselectedExtensions()?.includes(extension) ?? false;
const setPreselectedExtension = (extension: string, selected: boolean) => {
  const preselectedExtensions = getPreselectedExtensions() ?? [];
  const result = selected
    ? [...new Set([...preselectedExtensions, extension])]
    : preselectedExtensions.filter((v) => v !== extension);
  localStorage.setItem(SELECTED_EXTENSIONS_KEY, JSON.stringify(result));
};

const extension$ = (name: string) => {
  const connect$ = availableExtensions$.pipe(
    // Wait for the extension to be available
    filter((extensions) => extensions.includes(name)),
    take(1),
    switchMap(() =>
      defer(() => connectInjectedExtension(name)).pipe(
        // PolkadotJS rejects the promise straight away instead of waiting for user input
        retry({
          delay(error) {
            if (error?.message.includes("pending authorization request")) {
              return timer(1000);
            }
            throw error;
          },
        })
      )
    ),
    map((extension) => ({
      type: ConnectStatus.Connected as const,
      extension,
    })),
    catchError((e) => {
      console.error(e);
      return of({ type: ConnectStatus.Disconnected as const });
    }),
    startWith({ type: ConnectStatus.Connecting as const })
  );

  const connectWithCleanup$ = defer(() => {
    let disconnected = false;
    let extension: InjectedExtension | null = null;
    return concat(connect$, NEVER).pipe(
      tap({
        next(value) {
          if (value.type === ConnectStatus.Connected) {
            if (disconnected) {
              console.log("disconnect just after connecting");
              value.extension.disconnect();
            } else {
              extension = value.extension;
            }
          }
        },
        unsubscribe() {
          if (extension) {
            console.log("disconnect because of cleanup");
            extension.disconnect();
          } else {
            disconnected = true;
          }
        },
      })
    );
  });

  const initialSelected = extensionIsPreselected(name);
  return toggleExtension$(name).pipe(
    scan((acc) => !acc, initialSelected),
    startWith(initialSelected),
    tap((selected) => setPreselectedExtension(name, selected)),
    switchMap((selected) =>
      selected
        ? connectWithCleanup$
        : of({
            type: ConnectStatus.Disconnected as const,
          })
    )
  );
};

export const extensions$ = state(combineKeys(availableExtensions$, extension$));

export const selectedExtensions$ = extensions$.pipeState(
  map(
    (extensions) =>
      new Map(
        [...extensions.entries()]
          .filter(([, v]) => v.type !== ConnectStatus.Disconnected)
          .map(([k, v]) => [
            k,
            v.type === ConnectStatus.Connected ? v.extension : null,
          ])
      )
  ),
  withDefault(new Map<string, InjectedExtension | null>())
);

export const extensionAccounts$ = state(
  (name: string) =>
    extension$(name).pipe(
      switchMap((x) => {
        if (x.type !== ConnectStatus.Connected) return of([]);
        return new Observable<InjectedPolkadotAccount[]>((observer) => {
          observer.next(x.extension.getAccounts());
          return x.extension.subscribe((accounts) => {
            observer.next(accounts);
          });
        });
      })
    ),
  []
);

export const accountsByExtension$ = state(
  combineKeys(availableExtensions$, extensionAccounts$),
  new Map<string, InjectedPolkadotAccount[]>()
);

export const [valueSelected$, selectValue] = createSignal<string>();
const LS_KEY = "selected-signer";
export const selectedValue$ = state(
  merge(
    of(localStorage.getItem(LS_KEY)),
    valueSelected$.pipe(tap((v) => localStorage.setItem(LS_KEY, v)))
  ),
  null
);
export const allAccounts$ = accountsByExtension$.pipeState(
  map((accountsByExtension) =>
    [...accountsByExtension.entries()].flatMap(([extension, accounts]) =>
      accounts.map((account) => `${account.address}-${extension}`)
    )
  ),
  withDefault([] as string[])
);

export const selectedAccount$ = selectedValue$.pipeState(
  switchMap((value) => {
    if (!value) return of(null);
    const [address, ...extensionParts] = value.split("-");
    const extension = extensionParts.join("-");
    return extensionAccounts$(extension).pipe(
      map(
        (accounts) =>
          accounts.find((account) => account.address === address) ?? null
      )
    );
  }),
  withDefault(null)
);
