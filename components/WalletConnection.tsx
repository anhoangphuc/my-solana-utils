"use client";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

//handle wallet balance fixed to 2 decimal numbers without rounding
export function toFixed(num: number, fixed: number): string {
  const re = new RegExp(`^-?\\d+(?:\\.\\d{0,${fixed || -1}})?`);
  return num.toString().match(re)![0];
}

const WalletConnection = () => {
  const { connection } = useConnection();
  const { select, wallets, publicKey, disconnect, connecting } = useWallet();

  const [open, setOpen] = useState<boolean>(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [userWalletAddress, setUserWalletAddress] = useState<string>("");

  useEffect(() => {
    if (!connection || !publicKey) {
      return;
    }

    connection.onAccountChange(
      publicKey,
      (updatedAccountInfo) => {
        setBalance(updatedAccountInfo.lamports / LAMPORTS_PER_SOL);
      },
      "confirmed"
    );

    connection.getAccountInfo(publicKey).then((info) => {
      if (info) {
        setBalance(info?.lamports / LAMPORTS_PER_SOL);
      }
    });
  }, [publicKey, connection]);

  useEffect(() => {
    setUserWalletAddress(publicKey?.toBase58()!);
  }, [publicKey]);

  const handleWalletSelect = async (walletName: any) => {
    if (walletName) {
      try {
        select(walletName);
        setOpen(false);
      } catch (error) {
        console.log("wallet connection err : ", error);
      }
    }
  };

  const handleDisconnect = async () => {
    disconnect();
  };


  return (
    <div className="text-white">
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="flex gap-2 items-center">
          {!publicKey ? (
            <>
              <DialogTrigger asChild>
                <Button className="bg-[#1C1C33] text-sm md:text-base text-white h-[36px] md:h-[40px] 
                  border border-[#2C2C43] hover:bg-[#2C2C43] transition-colors z-50">
                  {connecting ? "Connecting..." : "Select Wallet"}
                </Button>
              </DialogTrigger>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex gap-2 items-center bg-[#1C1C33] text-sm md:text-base text-white 
                  h-[36px] md:h-[40px] border border-[#2C2C43] hover:bg-[#2C2C43] transition-colors z-50">
                  <div className="truncate md:w-[120px] w-[80px]">
                    {publicKey.toBase58()}
                  </div>
                  <div className="text-gray-300">
                    {balance ? `${toFixed(balance, 2)} SOL` : "0 SOL"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] bg-[#1C1C33] border border-[#2C2C43]">
                <DropdownMenuItem className="flex justify-center">
                  <Button
                    className="bg-gradient-to-r from-red-600 to-red-500 text-sm text-white 
                      hover:bg-opacity-80 transition-all duration-200"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DialogContent
            className="max-w-[400px] bg-[#1C1C33] border border-[#2C2C43]"
            style={{
              borderRadius: "12px",
            }}
          >
            <DialogTitle className="text-lg font-medium">Connect Wallet</DialogTitle>
            <div className="flex w-full justify-center items-center">
              <div className="flex flex-col justify-start items-center space-y-3 w-full max-h-[300px] overflow-y-auto">
                {wallets.map((wallet) => (
                  <Button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                    variant={"ghost"}
                    className="h-[40px] w-full hover:bg-[#2C2C43] text-sm text-white 
                      flex justify-start items-center px-4 transition-colors"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Image
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        height={24}
                        width={24}
                      />
                      <span className="flex-1">{wallet.adapter.name}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </div>
      </Dialog>
    </div>
  );
};

export default WalletConnection;
