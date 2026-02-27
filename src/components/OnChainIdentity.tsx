import { smoldot } from "@/chain"
import { cn } from "@/lib/utils"
import { IdentityJudgement, polkadot_people } from "@polkadot-api/descriptors"
import { PolkadotIdenticon } from "@polkadot-api/react-components"
import { state, useStateObservable } from "@react-rxjs/core"
import { CheckCircle } from "lucide-react"
import { createClient, getSs58AddressInfo, SS58String } from "polkadot-api"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { getSmProvider } from "polkadot-api/sm-provider"
import { FC } from "react"
import { catchError, from, map, of, tap } from "rxjs"
import { CopyText } from "./CopyText"
import { createIdentitySdk } from "@polkadot-api/sdk-accounts"

const client = createClient(
  withLogsRecorder(
    (...v) => console.debug("peopleChain", ...v),
    getSmProvider(() =>
      Promise.all([
        import("polkadot-api/chains/polkadot").then(({ chainSpec }) =>
          smoldot.addChain({ chainSpec }),
        ),
        import("polkadot-api/chains/polkadot_people"),
      ]).then(([relay, { chainSpec }]) =>
        smoldot.addChain({
          chainSpec,
          potentialRelayChains: [relay],
        }),
      ),
    ),
  ),
)
const typedApi = client.getTypedApi(polkadot_people)
const sdk = createIdentitySdk(typedApi)

const CACHE_KEY = "identity-cache"
const cache: Record<SS58String, Identity | undefined> = JSON.parse(
  localStorage.getItem(CACHE_KEY) ?? "{}",
)

export interface Identity {
  displayName: string
  judgments: Array<{
    registrar: number
    judgement: IdentityJudgement["type"]
  }>
}
export const isVerified = (identity: Identity | null) =>
  identity?.judgments.some((j) => j.judgement === "Reasonable")

export const identity$ = state(
  (address: SS58String) =>
    from(sdk.getIdentity(address)).pipe(
      map((identity) =>
        identity?.info.display
          ? {
              displayName: identity.info.display,
              judgments: identity.judgements,
            }
          : null,
      ),
      tap((v) => {
        if (v != null) {
          cache[address] = v
        } else {
          delete cache[address]
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
      }),
      catchError(() => of(null)),
    ),
  (address) => cache[address] ?? null,
)

export const OnChainIdentity: FC<{
  value: SS58String
  name?: string
  className?: string
  copyable?: boolean
}> = ({ value, name: inputName, className, copyable = true }) => {
  const identity = useStateObservable(identity$(value))

  const name = identity?.displayName ?? inputName

  const identicon = (
    <PolkadotIdenticon
      className="shrink-0"
      publicKey={getPublicKey(value)}
      size={28}
    />
  )
  return (
    <div className={cn("flex items-center gap-1 overflow-hidden", className)}>
      {copyable ? (
        <CopyText
          text={value}
          className="w-7 h-7 flex justify-center items-center"
        >
          {identicon}
        </CopyText>
      ) : (
        identicon
      )}
      <div className="flex flex-col justify-center text-foreground leading-tight overflow-hidden">
        {name && (
          <span className="inline-flex items-center gap-1">
            {name}
            {isVerified(identity) && (
              <CheckCircle
                size={16}
                className="text-green-500 dark:text-green-400"
              />
            )}
          </span>
        )}
        {!name || !isVerified(identity) ? (
          <span className="text-foreground/70 text-ellipsis overflow-hidden">
            {value.slice(0, 16) + "…"}
          </span>
        ) : null}
      </div>
    </div>
  )
}

const getPublicKey = (address: string) => {
  const info = getSs58AddressInfo(address)
  return info.isValid ? info.publicKey : null
}
