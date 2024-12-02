'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    ChevronLeftIcon, 
    ChevronRightIcon,
    CircleStackIcon,
    InformationCircleIcon 
} from '@heroicons/react/24/outline';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const navItems = [
        {
            name: 'Tokens',
            path: '/tokens',
            icon: CircleStackIcon
        },
        {
            name: 'About',
            path: '/about',
            icon: InformationCircleIcon
        }
    ];

    return (
        <>
            {/* Sidebar */}
            <div 
                className={`fixed top-[10vh] left-0 h-[90vh] bg-[#0B0A1A] border-r border-[#1C1C33] transition-all duration-300 z-30
                    ${isCollapsed ? 'w-[60px]' : 'w-[200px]'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Navigation Links */}
                    <div className="flex-1 py-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center px-4 py-3 mb-2 transition-colors
                                    ${pathname === item.path 
                                        ? 'bg-[#1C1C33] text-indigo-400' 
                                        : 'text-gray-400 hover:text-white hover:bg-[#1C1C33]/50'}
                                `}
                            >
                                <item.icon className="w-5 h-5" />
                                {!isCollapsed && (
                                    <span className="ml-3">{item.name}</span>
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Collapse Button */}
                    {/* <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center justify-center p-4 text-gray-400 hover:text-white border-t border-[#1C1C33]"
                    >
                        {isCollapsed ? (
                            <ChevronRightIcon className="w-5 h-5" />
                        ) : (
                            <ChevronLeftIcon className="w-5 h-5" />
                        )}
                    </button> */}
                </div>
            </div>
        </>
    );
};

export default Sidebar; 