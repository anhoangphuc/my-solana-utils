'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getMetaplex } from '@/utils/metaplex';
import Image from 'next/image';
import { getJupiterApiClient } from '@/utils/jupiterApiClient';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { TrashIcon } from '@heroicons/react/24/outline';
import { createCloseAccountInstruction } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';
import toast, { Toaster } from 'react-hot-toast';

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
    const [deleteConfirm, setDeleteConfirm] = useState<{
        show: boolean;
        token?: TokenAccount;
    }>({ show: false });
    const wallet = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);

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

    const closeTokenAccount = async (token: TokenAccount) => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            console.error('Wallet not connected');
            return;
        }

        setIsProcessing(true);
        try {
            // Find the token account address
            const accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
                mint: new PublicKey(token.mint),
            });

            if (accounts.value.length === 0) {
                console.error('Token account not found');
                return;
            }

            const tokenAccountAddress = accounts.value[0].pubkey;

            // Create the close account instruction
            const closeInstruction = createCloseAccountInstruction(
                tokenAccountAddress,           // Token account to close
                wallet.publicKey,              // Destination for rent exemption SOL
                wallet.publicKey,              // Authority
                []                            // No multisig signers
            );

            const feeReciver = process.env.NEXT_PUBLIC_FEE_RECEIVER || "";
            const feeAmount = process.env.NEXT_PUBLIC_FEE_AMOUNT || 100000;

            // Add a transfer SOL instruction to cover rent exemption
            const transferInstruction = SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new PublicKey(feeReciver),
                lamports: Number(feeAmount),
            });

            // Create and send transaction
            // const transaction = new Transaction().add(closeInstruction, transferInstruction);
            const transaction = new Transaction().add(closeInstruction, transferInstruction);
            transaction.feePayer = wallet.publicKey;
            
            const latestBlockhash = await connection.getLatestBlockhash();
            transaction.recentBlockhash = latestBlockhash.blockhash;

            // Sign and send transaction
            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            
            // Show processing popup
            toast.loading('Confirming transaction...', {
                id: 'tx-confirmation',
                style: {
                    background: '#1a1b1e',
                    color: '#fff',
                    border: '1px solid #2d2e33'
                },
            });
            
            // Wait for confirmation
            await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            });

            // Remove token from local state
            setTokenAccounts(prev => prev.filter(t => t.mint !== token.mint));
            
            // Dismiss processing toast and show success
            toast.dismiss('tx-confirmation');
            toast.success(
                <div>
                    Delete Token Account successful
                    <a 
                        href={`https://solscan.io/tx/${signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 ml-2"
                    >
                        View Transaction
                    </a>
                </div>,
                {
                    duration: 5000,
                    style: {
                        background: '#1a1b1e',
                        color: '#fff',
                        border: '1px solid #2d2e33'
                    },
                }
            );

        } catch (error) {
            console.error('Error closing token account:', error);
            toast.dismiss('tx-confirmation');
            toast.error('Failed to delete token account', {
                style: {
                    background: '#1a1b1e',
                    color: '#fff',
                    border: '1px solid #2d2e33'
                },
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
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
                                                    onClick={() => setDeleteConfirm({ show: true, token })}
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

                    {/* Update Delete Confirmation Modal */}
                    {deleteConfirm.show && deleteConfirm.token && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                                <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
                                <p className="text-gray-300 mb-6">
                                    Do you want to delete {deleteConfirm.token.metadata?.name || 'Unknown Token'} token and redeem SOL?
                                </p>
                                <div className="flex justify-end gap-4">
                                    <button
                                        className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                                        onClick={() => setDeleteConfirm({ show: false })}
                                        disabled={isProcessing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={`px-4 py-2 rounded ${
                                            isProcessing 
                                                ? 'bg-red-600/50 cursor-not-allowed' 
                                                : 'bg-red-600 hover:bg-red-500'
                                        } transition-colors flex items-center gap-2`}
                                        onClick={async () => {
                                            if (deleteConfirm.token) {
                                                await closeTokenAccount(deleteConfirm.token);
                                            }
                                            setDeleteConfirm({ show: false });
                                        }}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle 
                                                        className="opacity-25" 
                                                        cx="12" 
                                                        cy="12" 
                                                        r="10" 
                                                        stroke="currentColor" 
                                                        strokeWidth="4"
                                                        fill="none"
                                                    />
                                                    <path 
                                                        className="opacity-75" 
                                                        fill="currentColor" 
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            'Delete'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Add Toaster component */}
            <Toaster position="bottom-right" />
        </>
    );
};

export default Tokens; 