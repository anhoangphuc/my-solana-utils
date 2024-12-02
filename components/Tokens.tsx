'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { createBurnInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getMetaplex } from '@/utils/metaplex';
import Image from 'next/image';
import { getJupiterApiClient } from '@/utils/jupiterApiClient';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { TrashIcon, ArrowTopRightOnSquareIcon, ArrowPathRoundedSquareIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { createCloseAccountInstruction } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';
import toast, { Toaster } from 'react-hot-toast';
import { getAddressLink, getDexScreenerLink, getRaydiumLink, getTxLink } from '@/utils/explorer';
import { isValidUrl } from '@/utils/helpers';

interface TokenAccount {
    pubkey: string;
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

const getTotalValueColorClass = (value: number): string => {
    if (value >= 100) return "text-purple-400"; // Highest value - Purple
    if (value >= 50) return "text-pink-400";    // Very high value - Pink
    if (value >= 10) return "text-yellow-400";  // High value - Yellow
    if (value >= 5) return "text-blue-400";     // Medium value - Blue
    if (value >= 1) return "text-cyan-400";     // Low value - Cyan
    return "text-gray-400";                     // Very low value - Gray
};

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success('Token address copied to clipboard!', {
            duration: 2000,
            style: {
                background: '#1a1b1e',
                color: '#fff',
                border: '1px solid #2d2e33'
            },
        });
    } catch (err) {
        console.error('Failed to copy text: ', err);
        toast.error('Failed to copy token address', {
            style: {
                background: '#1a1b1e',
                color: '#fff',
                border: '1px solid #2d2e33'
            },
        });
    }
};

const SwapIcon = () => (
    <svg fill="#22C55E" width="24px" height="24px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 0c8.837 0 16 7.163 16 16s-7.163 16-16 16S0 24.837 0 16 7.163 0 16 0zm8.706 19.517H10.34a.59.59 0 00-.415.17l-2.838 2.815a.291.291 0 00.207.498H21.66a.59.59 0 00.415-.17l2.838-2.816a.291.291 0 00-.207-.497zm-3.046-5.292H7.294l-.068.007a.291.291 0 00-.14.49l2.84 2.816.07.06c.1.07.22.11.344.11h14.366l.068-.007a.291.291 0 00.14-.49l-2.84-2.816-.07-.06a.59.59 0 00-.344-.11zM24.706 9H10.34a.59.59 0 00-.415.17l-2.838 2.816a.291.291 0 00.207.497H21.66a.59.59 0 00.415-.17l2.838-2.815A.291.291 0 0024.706 9z" /></svg>
);

// Utility function to format numbers with commas
const formatNumberWithCommas = (num: number): string => {
    if (!num) return '0.00';
    
    // Handle numbers with more than 4 decimal places
    if (num < 0.0001) {
        return num.toExponential(4);
    }
    
    // For regular numbers, format with commas and up to 4 decimal places
    const parts = num.toFixed(4).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Remove trailing zeros after decimal
    if (parts[1]) {
        parts[1] = parts[1].replace(/0+$/, '');
    }
    
    return parts[1] ? parts.join('.') : parts[0];
};

const Tokens = () => {
    const { connection } = useConnection();
    const { publicKey, connected } = useWallet();
    const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        show: boolean;
        token?: TokenAccount;
    }>({ show: false });
    const wallet = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedTokens, setSelectedTokens] = useState<Set<TokenAccount>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [hideUnzeroBalance, setHideUnzeroBalance] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
    const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);

    useEffect(() => {
        if (!connected) {
            setTokenAccounts([]);
            setSelectedTokens(new Set());
            setIsSelectionMode(false);
            setDeleteConfirm({ show: false });
        }
    }, [connected]);

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
        let mounted = true;

        const fetchTokenAccounts = async () => {
            if (!publicKey) {
                setTokenAccounts([]);
                return;
            }
            
            setIsLoading(true);
            setIsMetadataLoaded(false);

            try {
                const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                    programId: TOKEN_PROGRAM_ID,
                });

                if (!mounted) return;

                const tokens = accounts.value.map((account) => {
                    const parsedInfo = account.account.data.parsed.info;
                    return {
                        mint: parsedInfo.mint,
                        amount: parsedInfo.tokenAmount.uiAmount,
                        decimals: parsedInfo.tokenAmount.decimals,
                        pubkey: account.pubkey.toBase58(),
                        metadata: {},
                        price: null,
                    };
                });

                setTokenAccounts(tokens);

                const metadataPromises = tokens.map(async (token, index) => {
                    if (!mounted) return;

                    const mintAddress = new PublicKey(token.mint);
                    const metaplex = getMetaplex();

                    let metadata: { name?: string, symbol?: string, uri?: string, imageUrl?: string } = {};
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
                        console.log(`No metadata token for token ${token.mint}`);
                    }

                    if (!metadata.imageUrl) {
                        try {
                            const response = await fetch(`/api/token-metadata?mint=${token.mint}`);
                            const tokenMetadata = await response.json();
                            metadata = {
                                ...metadata,
                                name: metadata.name || tokenMetadata.name,
                                symbol: metadata.symbol || tokenMetadata.symbol,
                                imageUrl: metadata.imageUrl || tokenMetadata.imageUrl,
                            };
                        } catch (error) {
                            console.log(`Error fetching token metadata from registry for ${token.mint}:`, error);
                        }
                    }

                    const price = await fetchTokenPrice(token.mint);

                    if (!mounted) return;

                    setTokenAccounts(prev => {
                        const updatedTokens = [...prev];
                        updatedTokens[index] = {
                            ...updatedTokens[index],
                            metadata,
                            price,
                        };
                        return updatedTokens;
                    });
                });

                await Promise.all(metadataPromises);
                if (mounted) {
                    setIsMetadataLoaded(true);
                }

            } catch (error) {
                console.error('Error fetching token accounts:', error);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchTokenAccounts();

        return () => {
            mounted = false;
            setTokenAccounts([]);
            setSelectedTokens(new Set());
            setIsSelectionMode(false);
            setDeleteConfirm({ show: false });
        };
    }, [connection, publicKey]);

    const closeMultipleTokenAccounts = async (tokens: TokenAccount[]) => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            console.error('Wallet not connected');
            return;
        }

        setIsProcessing(true);
        try {
            // Create a new transaction
            const transaction = new Transaction();

            // Add close instruction for each token account
            for (const token of tokens) {
                if (token.amount > 0) {
                    const burnInstruction = createBurnInstruction(
                        new PublicKey(token.pubkey),
                        new PublicKey(token.mint),
                        wallet.publicKey,
                        Number(token.amount * Math.pow(10, token.decimals)),
                    );
                    transaction.add(burnInstruction);
                }
                const closeInstruction = createCloseAccountInstruction(
                    new PublicKey(token.pubkey),
                    wallet.publicKey,
                    wallet.publicKey,
                    []
                );
                transaction.add(closeInstruction);
            }

            // Add transfer to fee receiver instruction
            const feeReceiverAddress = process.env.NEXT_PUBLIC_FEE_RECEIVER || "";
            const feeAmount = process.env.NEXT_PUBLIC_FEE_AMOUNT || 100000;
            const transferInstruction = SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new PublicKey(feeReceiverAddress),
                lamports: Number(feeAmount) * tokens.length,
            });
            transaction.add(transferInstruction);

            // Get latest blockhash
            const latestBlockhash = await connection.getLatestBlockhash();
            transaction.recentBlockhash = latestBlockhash.blockhash;
            transaction.feePayer = wallet.publicKey;

            // Show processing toast
            toast.loading('Confirming transaction...', {
                id: 'tx-confirmation',
                style: {
                    background: '#1a1b1e',
                    color: '#fff',
                    border: '1px solid #2d2e33'
                },
            });

            // Sign and send transaction
            const signedTransaction = await wallet.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());

            // Wait for confirmation
            await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            });

            // Update local state
            setTokenAccounts(prev => prev.filter(t => !tokens.some(selected => selected.mint === t.mint)));
            setSelectedTokens(new Set());

            // Show success notification
            toast.dismiss('tx-confirmation');
            toast.success(
                <div>
                    Successfully closed {tokens.length} token accounts
                    <a
                        href={`${getTxLink(signature)}`}
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
            console.error('Error closing token accounts:', error);
            toast.dismiss('tx-confirmation');
            toast.error('Failed to close token accounts', {
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

    const toggleTokenSelection = (token: TokenAccount) => {
        setSelectedTokens(prev => {
            const newSet = new Set(prev);
            // Need to check by mint since Set comparison uses reference equality
            const existingToken = Array.from(newSet).find(t => t.mint === token.mint);
            if (existingToken) {
                newSet.delete(existingToken);
            } else {
                newSet.add(token);
            }
            return newSet;
        });
    };

    const filteredTokenAccounts = tokenAccounts.filter(token => {
        if (!hideUnzeroBalance) return true;
        return (token.price || 0) * token.amount === 0;
    });

    const handleSortByTotal = () => {
        if (!isMetadataLoaded) return; // Prevent sorting if metadata is not loaded
        setSortDirection(current => {
            if (current === null) return 'desc';
            if (current === 'desc') return 'asc';
            return null;
        });
    };

    const getSortedTokenAccounts = () => {
        if (!sortDirection) return filteredTokenAccounts;

        return [...filteredTokenAccounts].sort((a, b) => {
            const totalA = (a.price || 0) * a.amount;
            const totalB = (b.price || 0) * b.amount;
            return sortDirection === 'desc' ? totalB - totalA : totalA - totalB;
        });
    };

    // Define a placeholder image URL
    const placeholderImageUrl = '/path/to/placeholder-image.png';

    return (
        <>
            <div className="min-h-[90vh] bg-[#0B0A1A] text-white">
                {/* Fixed header section */}
                <div className="fixed top-[10vh] right-0 bg-gradient-to-b from-[#0B0A1A] to-[#070B19] z-40 border-b border-[#1C1C33] left-[200px] transition-all duration-300">
                    <div className="px-8">
                        <div className="flex flex-col gap-4 py-6">
                            {/* Title and toggle row */}
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col gap-4">
                                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-blue-500">
                                        Your Token Accounts
                                    </h2>

                                    <div className="flex items-center gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={hideUnzeroBalance}
                                                onChange={(e) => setHideUnzeroBalance(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-[#1C1C33] peer-focus:outline-none rounded-full peer 
                                                peer-checked:after:translate-x-full peer-checked:after:border-white 
                                                after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                                after:bg-gray-400 after:rounded-full after:h-5 after:w-5 
                                                after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white">
                                            </div>
                                        </label>
                                        <span className="text-sm text-gray-400">
                                            Hide unzero balance
                                        </span>
                                    </div>
                                </div>

                                {/* Action buttons - Add padding to match table header */}
                                {/* <div className="flex items-center gap-4 pr-[calc(20%-0.75rem)]"> */}
                                <div className="flex items-center gap-4 pr-[calc(5%)]">
                                    {!isSelectionMode ? (
                                        <button
                                            onClick={() => setIsSelectionMode(true)}
                                            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 
                                                hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 
                                                rounded-lg text-white font-medium"
                                        >
                                            Close multiple
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setIsSelectionMode(false);
                                                    setSelectedTokens(new Set());
                                                }}
                                                className="px-4 py-2 bg-[#1C1C33] hover:bg-[#2C2C43] 
                                                    transition-colors rounded-lg text-white font-medium border border-[#2C2C43]"
                                            >
                                                Cancel
                                            </button>
                                            {selectedTokens.size > 0 && (
                                                <button
                                                    onClick={() => closeMultipleTokenAccounts(Array.from(selectedTokens))}
                                                    disabled={isProcessing}
                                                    className={`flex items-center gap-2 px-4 py-2 ${isProcessing
                                                            ? 'bg-opacity-50 cursor-not-allowed'
                                                            : 'hover:bg-opacity-80'
                                                        } bg-gradient-to-r from-red-600 to-red-500 transition-all duration-200 rounded-lg text-white`}
                                                >
                                                    {isProcessing ? (
                                                        <>
                                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                                                            <span>Processing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TrashIcon className="w-5 h-5" />
                                                            <span>Delete Accounts ({selectedTokens.size})</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table content */}
                <div className="pt-[calc(10vh+80px)] px-8">
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            {/* Table Header */}
                            <thead>
                                <tr className="border-b border-[#1C1C33]">
                                    <th className="text-left pb-4 font-medium text-gray-400 w-[35%] border-r border-[#1C1C33]">Token</th>
                                    <th className="text-left pb-4 font-medium text-gray-400 w-[15%] border-r border-[#1C1C33] pl-4">Amount</th>
                                    <th className="text-left pb-4 font-medium text-gray-400 w-[15%] border-r border-[#1C1C33] pl-4">Price</th>
                                    <th 
                                        className={`text-left pb-4 font-medium text-gray-400 w-[15%] border-r border-[#1C1C33] pl-4 cursor-pointer group ${isMetadataLoaded ? '' : 'opacity-50 cursor-not-allowed'}`}
                                        onClick={handleSortByTotal}
                                    >
                                        <div className="flex items-center gap-2">
                                            Total
                                            <ArrowsUpDownIcon 
                                                className={`w-4 h-4 transition-colors ${
                                                    sortDirection 
                                                        ? 'text-blue-400' 
                                                        : 'text-gray-400 group-hover:text-gray-300'
                                                } ${
                                                    sortDirection === 'asc' 
                                                        ? 'rotate-180' 
                                                        : ''
                                                }`}
                                            />
                                        </div>
                                    </th>
                                    <th className="pb-4 w-[20%] text-center">Actions</th>
                                </tr>
                            </thead>

                            {/* Table Body */}
                            <tbody>
                                {!connected ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <p className="text-gray-400 text-lg">Connect your wallet to view token accounts</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
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
                                                <p className="text-gray-400 text-lg">Loading your accounts...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : getSortedTokenAccounts().length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4">
                                            {hideUnzeroBalance ? "No tokens with value found" : "No tokens found"}
                                        </td>
                                    </tr>
                                ) : (
                                    getSortedTokenAccounts().map((token, index) => (
                                        <tr
                                            key={index}
                                            className={`border-b border-[#1C1C33]/50 transition-colors duration-200
                                                ${Array.from(selectedTokens).some(t => t.mint === token.mint)
                                                    ? 'bg-[#1C1C33]/30 hover:bg-[#1C1C33]/40'
                                                    : 'hover:bg-[#1C1C33]/20'
                                                }
                                            `}
                                        >
                                            <td className="py-6 border-r border-[#1C1C33]/50">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-12 h-12 relative rounded-full overflow-hidden flex-shrink-0">
                                                        <Image
                                                            src={isValidUrl(token.metadata?.imageUrl || '') ? token.metadata?.imageUrl! : placeholderImageUrl}
                                                            alt={token.metadata?.name || 'Token'}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold truncate">
                                                            {token.metadata?.name || 'Unknown Token'}
                                                            {token.metadata?.symbol && ` (${token.metadata.symbol})`}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative group cursor-pointer truncate">
                                                                <p className="font-mono text-sm text-gray-400 truncate">
                                                                    {token.mint}
                                                                </p>
                                                                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                                                                    bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 
                                                                    group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                                    Click to copy token address
                                                                </span>
                                                            </div>
                                                            <a
                                                                href={getAddressLink(token.mint)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 hover:bg-blue-900/20 rounded-full transition-colors group relative"
                                                            >
                                                                <ArrowTopRightOnSquareIcon className="w-4 h-4 text-blue-400 hover:text-blue-300" />
                                                                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                                    View on Solana Explorer
                                                                </span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="text-left py-6 border-r border-[#1C1C33]/50 pl-4">
                                                <a
                                                    href={getRaydiumLink(token.mint)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group relative cursor-pointer"
                                                >
                                                    <p className="font-semibold hover:text-blue-400 transition-colors">
                                                        {formatNumberWithCommas(token.amount)}
                                                    </p>
                                                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                                                        bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 
                                                        group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                        Swap on Raydium
                                                    </span>
                                                </a>
                                            </td>

                                            <td className="text-left py-6 border-r border-[#1C1C33]/50 pl-4">
                                                {token.price && (
                                                    <a
                                                        href={getDexScreenerLink(token.mint)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-semibold hover:text-blue-400 cursor-pointer group relative"
                                                    >
                                                        <p>{formatPrice(token.price)}</p>
                                                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                                                            bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 
                                                            group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                            View on DexScreener
                                                        </span>
                                                    </a>
                                                )}
                                            </td>

                                            <td className="text-left py-6 border-r border-[#1C1C33]/50 pl-4">
                                                {token.price && (
                                                    <p className={`font-semibold ${getTotalValueColorClass(token.price * token.amount)}`}>
                                                        {formatNumberWithCommas(token.price * token.amount)}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="text-center py-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        className="p-1.5 hover:bg-red-900/20 rounded-full transition-colors group relative"
                                                        onClick={() => setDeleteConfirm({ show: true, token })}
                                                    >
                                                        <TrashIcon className="w-4 h-4 text-red-500 hover:text-red-400" />
                                                        <span className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                            Close Account and redeem SOL
                                                        </span>
                                                    </button>

                                                    <a
                                                        href={getRaydiumLink(token.mint)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 hover:bg-green-900/20 rounded-full transition-colors group relative"
                                                    >
                                                        <SwapIcon />
                                                        <span className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                            Swap on Raydium
                                                        </span>
                                                    </a>

                                                    {isSelectionMode && (
                                                        <input
                                                            type="checkbox"
                                                            checked={Array.from(selectedTokens).some(t => t.mint === token.mint)}
                                                            onChange={() => toggleTokenSelection(token)}
                                                            className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 bg-gray-700 cursor-pointer"
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal with updated style */}
                {deleteConfirm.show && deleteConfirm.token && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-[#1C1C33] rounded-lg p-6 max-w-md w-full mx-4 border border-[#2C2C43]">
                            <h3 className="text-xl font-semibold mb-4">Confirm Close</h3>
                            <p className="text-gray-300 mb-6">
                                Do you want to close {deleteConfirm.token.metadata?.name || 'Unknown Token'} token and redeem SOL?
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
                                    className={`px-4 py-2 rounded ${isProcessing
                                            ? 'bg-opacity-50 cursor-not-allowed'
                                            : 'hover:bg-opacity-80'
                                        } bg-gradient-to-r from-indigo-600 to-blue-600 transition-all duration-200`}
                                    onClick={async () => {
                                        if (deleteConfirm.token) {
                                            await closeMultipleTokenAccounts([deleteConfirm.token]);
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
            <Toaster position="bottom-right" />
        </>
    );
};

export default Tokens; 