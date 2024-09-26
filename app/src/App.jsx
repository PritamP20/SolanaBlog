import { useMemo } from "react"
import { BlogProvider } from "src/context/Blog"
import { Router } from "src/router"
import "./App.css"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"

export const App = () => {
  const endPoint = "https://api.devnet.solana.com"
  // const endPoint = "https://solana-devnet.g.alchemy.com/v2/OgX2oq12FWRTYy5zEJj9_5BHxL_JktB0"
  const wallet = useMemo(
    ()=>[
      new PhantomWalletAdapter(),
    ],
    []
  )
  return (
    <ConnectionProvider endpoint={endPoint}>
      <WalletProvider wallets={wallet} autoConnect>
        <BlogProvider>
          <Router />
        </BlogProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
