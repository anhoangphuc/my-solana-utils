import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[90vh] bg-black text-white">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-6">Solana Tools for Everyone</h1>
        
        <div className="space-y-8">
          <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-colors">
            <Link href="/tokens" className="block">
              <h2 className="text-2xl font-semibold mb-3 text-blue-400">Token Account Manager</h2>
              <p className="text-gray-300">
                Efficiently manage your Solana token accounts. View token balances, prices, and total values. 
                Clean up unused token accounts to recover SOL, and access quick links to trade on Raydium or 
                view market data on DexScreener.
              </p>
            </Link>
          </div>

          {/* Add more tool cards here in the future */}
        </div>
      </div>
    </div>
  );
}
