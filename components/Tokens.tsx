'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

interface TokenAccount {
  mint: string;
  amount: number;
  decimals: number;
}

const Tokens = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);

  useEffect(() => {
    const fetchTokenAccounts = async () => {
      if (!publicKey) return;

      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        const tokens = accounts.value.map((account) => {
          const parsedInfo = account.account.data.parsed.info;
          return {
            mint: parsedInfo.mint,
            amount: parsedInfo.tokenAmount.uiAmount,
            decimals: parsedInfo.tokenAmount.decimals,
          };
        });

        setTokenAccounts(tokens);
      } catch (error) {
        console.error('Error fetching token accounts:', error);
      }
    };

    fetchTokenAccounts();
  }, [connection, publicKey]);

  if (!publicKey) {
    return (
      <div className="flex justify-center items-center h-[90vh] bg-black text-white">
        Please connect your wallet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[90vh] bg-black text-white p-8">
      <h2 className="text-2xl font-bold mb-6">Your Token Accounts</h2>
      <div className="grid gap-4">
        {tokenAccounts.length === 0 ? (
          <div>No tokens found</div>
        ) : (
          tokenAccounts.map((token, index) => (
            <div key={index} className="border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400">Mint</p>
                  <p className="font-mono">{token.mint}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Amount</p>
                  <p>{token.amount}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Tokens; 