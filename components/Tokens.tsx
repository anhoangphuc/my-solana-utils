'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { getMetaplex } from '@/utils/metaplex';
import Image from 'next/image';
import { getJupiterApiClient } from '@/utils/jupiterApiClient';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { TrashIcon } from '@heroicons/react/24/outline';

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
    price?: number | null;
}

const formatPrice = (price: number) => {
    if (price === 0) return '$0.00';
    
    const priceStr = price.toString();
    
    // If price is less than 0.01
    if (price < 0.01) {
        // Count leading zeros after decimal point
        const match = priceStr.match(/^0\.0+/);
        if (match) {
            const leadingZeros = match[0].length - 2; // subtract 2 for "0."
            const significantDigits = priceStr.slice(match[0].length);
            // Return JSX-compatible format
            return ['$0.0', <sub key="zeros">({leadingZeros})</sub>, significantDigits.slice(0, 3)];
        }
    }
    
    return `$${price.toFixed(2)}`;
};

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

    const fetchTokenPrice = async (mint: string) => {
        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
                method: 'GET',
                headers: {},
            });
            const data = await response.json();
            const dataPairs = data.pairs;
            const validPairs = dataPairs.filter((pair: any) => pair.baseToken.address === mint);
            const totalPrice = validPairs.reduce((acc: number, pair: any) => acc + Number(pair.priceUsd), 0);
            const averagePrice = totalPrice / validPairs.length;

            return Number(averagePrice);
        } catch (error) {
            console.log('Error fetching token price:', error);
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

                accounts.value.sort((a, b) => {
                    const aAmount = Number(a.account.data.parsed.info.tokenAmount.uiAmount);
                    const bAmount = Number(b.account.data.parsed.info.tokenAmount.uiAmount);
                    return aAmount - bAmount;
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

                        const price = await fetchTokenPrice(parsedInfo.mint);

                        return {
                            mint: parsedInfo.mint,
                            amount: parsedInfo.tokenAmount.uiAmount,
                            decimals: parsedInfo.tokenAmount.decimals,
                            metadata,
                            price
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
            <div className="max-w-[1440px] mx-auto p-8">
                <h2 className="text-2xl font-bold mb-6">Your Token Accounts</h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        {/* Table Header */}
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left pb-4 font-medium text-gray-400 w-[40%]">Token</th>
                                <th className="text-left pb-4 font-medium text-gray-400 w-[20%]">Amount</th>
                                <th className="text-right pb-4 font-medium text-gray-400 w-[15%]">Price</th>
                                <th className="text-right pb-4 font-medium text-gray-400 w-[15%]">Total</th>
                                <th className="pb-4 w-[10%]"></th>
                            </tr>
                        </thead>

                        {/* Table Body */}
                        <tbody>
                            {tokenAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4">No tokens found</td>
                                </tr>
                            ) : (
                                tokenAccounts.map((token, index) => (
                                    <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-900/30">
                                        <td className="py-6">
                                            <div className="flex items-center gap-4">
                                                {token.metadata?.imageUrl && (
                                                    <div className="w-12 h-12 relative rounded-full overflow-hidden flex-shrink-0">
                                                        <Image 
                                                            src={token.metadata.imageUrl}
                                                            alt={token.metadata?.name || 'Token'}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold truncate">
                                                        {token.metadata?.name || 'Unknown Token'} 
                                                        {token.metadata?.symbol && ` (${token.metadata.symbol})`}
                                                    </p>
                                                    <p className="font-mono text-sm text-gray-400 truncate">{token.mint}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-6">
                                            <p className="font-bold text-xl">{token.amount}</p>
                                        </td>

                                        <td className="text-right py-6">
                                            {token.price && (
                                                <p className="font-semibold text-green-400 flex justify-end items-baseline">
                                                    {formatPrice(token.price)}
                                                </p>
                                            )}
                                        </td>

                                        <td className="text-right py-6">
                                            {token.price && (
                                                <p className="font-semibold text-green-400 flex justify-end items-baseline">
                                                    {formatPrice(token.price * token.amount)}
                                                </p>
                                            )}
                                        </td>

                                        <td className="text-center py-6">
                                            <button 
                                                className="p-2 hover:bg-red-900/20 rounded-full transition-colors mx-auto group relative"
                                                onClick={() => {
                                                    console.log('Delete token:', token.mint);
                                                }}
                                            >
                                                <TrashIcon className="w-5 h-5 text-red-500 hover:text-red-400" />
                                                <span className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                    Delete Token Account and redeem SOL
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Tokens; 