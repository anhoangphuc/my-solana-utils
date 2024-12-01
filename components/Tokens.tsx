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
            return ['$0', <sub key="zeros">{leadingZeros}</sub>, significantDigits];
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
            console.log("DEXSCREENER RESPONSE", data);
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
                        console.log("PRICE ", price);

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
                                        {token.price && (
                                            <>
                                                <p className="text-sm text-gray-400 mt-2">Price</p>
                                                <p className="font-semibold text-green-400 flex justify-end items-baseline">
                                                    {formatPrice(token.price)}
                                                </p>
                                                <p className="text-sm text-green-400 flex justify-end items-baseline">
                                                    Total: {formatPrice(token.price * token.amount)}
                                                </p>
                                            </>
                                        )}
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