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
  const connect$ = defer(() => connectInjectedExtension(name)).pipe(
    map((extension) => ({
      type: ConnectStatus.Connected as const,
      extension,
    })),
    catchError(() => of({ type: ConnectStatus.Disconnected as const })),
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
              value.extension.disconnect();
            } else {
              extension = value.extension;
            }
          }
        },
        unsubscribe() {
          if (extension) {
            extension.disconnect();
          } else {
            disconnected = true;
          }
        },
      })
    );
  });

  const initialSelected = extensionIsPreselected(name);
  console.log("extension is preselected", name, initialSelected);
  return toggleExtension$(name).pipe(
    scan((acc) => !acc, initialSelected),
    startWith(initialSelected),
    tap((v) => console.log("toggle", name, v)),
    switchMap((selected) =>
      selected
        ? connectWithCleanup$
        : of({
            type: ConnectStatus.Disconnected as const,
          })
    ),
    tap((v) => {
      console.log("connection", v);
      if (v.type === ConnectStatus.Connected) {
        setPreselectedExtension(name, true);
      } else if (v.type === ConnectStatus.Disconnected) {
        setPreselectedExtension(name, false);
      }
    })
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
