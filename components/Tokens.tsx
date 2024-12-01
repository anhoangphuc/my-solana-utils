'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { getMetaplex } from '@/utils/metaplex';
import Image from 'next/image';

interface TokenAccount {
  mint: string;
  amount: number;
  decimals: number;
  metadata?: {
    name?: string;
    symbol?: string;
    uri?: string;
    imageUrl?: string;
  };
}

const Tokens = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);

  const fetchMetadataUri = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const json = await response.json();
      return json.image || null;
    } catch (error) {
      console.log('Error fetching metadata URI:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchTokenAccounts = async () => {
      if (!publicKey) return;

      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        const metaplex = getMetaplex();
        
        const tokens = await Promise.all(
          accounts.value.map(async (account) => {
            const parsedInfo = account.account.data.parsed.info;
            const mintAddress = new PublicKey(parsedInfo.mint);
            
            let metadata = {};
            try {
              const nft = await metaplex.nfts().findByMint({ mintAddress });
              const imageUrl = nft.uri ? await fetchMetadataUri(nft.uri) : null;
              
              metadata = {
                name: nft.name,
                symbol: nft.symbol,
                uri: nft.uri,
                imageUrl
              };
            } catch (error) {
              console.log(`No metadata for token ${parsedInfo.mint}`);
            }

            return {
              mint: parsedInfo.mint,
              amount: parsedInfo.tokenAmount.uiAmount,
              decimals: parsedInfo.tokenAmount.decimals,
              metadata,
            };
          })
        );

        setTokenAccounts(tokens);
      } catch (error) {
        console.error('Error fetching token accounts:', error);
      }
    };

    fetchTokenAccounts();
  }, [connection, publicKey]);

  return (
    <div className="min-h-[90vh] bg-black text-white">
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-6">Your Token Accounts</h2>
        <div className="grid gap-4">
          {tokenAccounts.length === 0 ? (
            <div>No tokens found</div>
          ) : (
            tokenAccounts.map((token, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    {token.metadata?.imageUrl && (
                      <div className="w-12 h-12 relative rounded-full overflow-hidden">
                        <Image 
                          src={token.metadata.imageUrl}
                          alt={token.metadata?.name || 'Token'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">
                        {token.metadata?.name || 'Unknown Token'} 
                        {token.metadata?.symbol && ` (${token.metadata.symbol})`}
                      </p>
                      <p className="font-mono text-sm text-gray-400">{token.mint}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Amount</p>
                    <p className="font-bold text-xl">{token.amount}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Tokens; 