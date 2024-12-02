import { NextRequest, NextResponse } from 'next/server';
import { getMetaplex } from '@/utils/metaplex';
import { PublicKey } from '@solana/web3.js';
import tokenRegistry from './token-registry.json';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const mintAddress = searchParams.get('mint');

        if (!mintAddress) {
            return NextResponse.json(
                { error: 'Mint address is required' },
                { status: 400 }
            );
        }

        const mint = new PublicKey(mintAddress);

        // Read token registry data
        const tokens: {
            chainId: number;
            address: string;
            symbol: string;
            name: string;
            decimals: number;
            logoURI: string;
            tags: string[];
        }[] = (tokenRegistry as any).tokens;

        // Find token metadata from registry
        const tokenInfo = tokens.find(token => token.address === mintAddress);

        if (!tokenInfo) {
            return NextResponse.json(
                { error: 'Token not found in registry' },
                { status: 404 }
            );
        }

        const nft = {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            uri: tokenInfo.logoURI
        };
        const imageUrl = tokenInfo.logoURI;
        

        return NextResponse.json({
            name: nft.name,
            symbol: nft.symbol,
            imageUrl
        });

    } catch (error) {
        console.error('Error fetching token metadata:', error);
        return NextResponse.json(
            { error: 'Failed to fetch token metadata' },
            { status: 500 }
        );
    }
}