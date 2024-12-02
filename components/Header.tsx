import React from "react";
import WalletConnection from "./WalletConnection";
import Link from "next/link";

const Header = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-[10vh] bg-[#0B0A1A]/95 backdrop-blur-md z-50 border-b border-gray-800">
      <div className="max-w-full w-full flex justify-between items-center px-8 h-full">
        <Link href="/" className="text-white font-bold text-[30px] hover:text-indigo-300 transition-colors">
          Solana Utils
        </Link>
        <div className="flex items-center gap-8">
          <WalletConnection />
        </div>
      </div>
    </div>
  );
};

export default Header;
