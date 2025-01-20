import { typedApi } from "@/chain";
import { createReferendaSdk } from "@polkadot-api/sdk-governance";
import { state } from "@react-rxjs/core";
import { map, MonoTypeOperatorFunction, Observable } from "rxjs";

export const referendaSdk = createReferendaSdk(typedApi);

const sharedOngoingReferenda$ = state(
  referendaSdk.watch.ongoingReferenda$.pipe(map((v) => Array.from(v.values())))
);

export const ongoingReferenda$ = sharedOngoingReferenda$.pipe(
  delayUnsubscription(60 * 1000)
);

function delayUnsubscription<T>(ms: number): MonoTypeOperatorFunction<T> {
  return (source$) =>
    new Observable<T>((subscriber) => {
      const subscription = source$.subscribe({
        next: subscriber.next.bind(subscriber),
        error: subscriber.error.bind(subscriber),
        complete: subscriber.complete.bind(subscriber),
      });

      return () => {
        setTimeout(subscription.unsubscribe, ms);
      };
    });
}
