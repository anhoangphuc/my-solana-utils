import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[90vh] bg-transparent text-white">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-blue-500">
          Solana Tools for Everyone
        </h1>
        
        <div className="space-y-8">
          <div className="glass-card hover:gradient-border transition-all duration-300">
            <Link href="/tokens" className="block p-6">
              <h2 className="text-2xl font-semibold mb-3 text-indigo-400">Token Account Manager</h2>
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

      {/* Fixed About Link */}
      <Link 
        href="/about" 
        className="fixed bottom-6 right-6 px-4 py-2 glass-card hover:gradient-border
          transition-all duration-300 text-white font-medium
          flex items-center gap-2"
      >
        <span>About</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor" 
          className="w-5 h-5"
        >
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
      </Link>
    </div>
  );
}
