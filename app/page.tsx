import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const features = [
    {
      title: "Token Accounts",
      description: "Manage, close your Token Accounts for SOL with ease",
      icon: "/icons/token-management.png",
      href: "/tokens"
    },
    {
      title: "Snapshot",
      description: "Get the list of Holders of any Token or NFT Collection any time",
      icon: "/icons/snapshot.png",
      href: "/snapshot"
    },
  ];

  return (
    <div className="min-h-[90vh] bg-[#0B0A1A] text-white">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-center mb-16">
          OUR MOST OUTSTANDING FEATURES
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Link 
              key={index} 
              href={feature.href}
              className="block p-8 rounded-2xl bg-[#1C1C33]/30 hover:bg-[#1C1C33]/50 
                transition-all duration-300 border border-[#2C2C43] hover:border-indigo-500/50"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative w-32 h-32">
                  <Image
                    src={feature.icon}
                    alt={feature.title}
                    fill
                    className="object-contain"
                  />
                </div>
                <h2 className="text-2xl font-semibold">{feature.title}</h2>
                <p className="text-gray-400">{feature.description}</p>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor" 
                      className="w-5 h-5"
                    >
                      <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                    </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
