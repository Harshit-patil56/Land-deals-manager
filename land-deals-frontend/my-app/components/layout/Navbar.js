// components/layout/Navbar.js

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react"; // for hamburger icons

export default function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between relative">
      {/* Left: Logo/App Name */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">L</span>
        </div>
        <div>
          <span className="font-semibold text-lg text-gray-900">Land Deals</span>
          <p className="text-xs text-gray-500 hidden sm:block">Management System</p>
        </div>
      </div>

      {/* User info and logout */}
      <div className="hidden md:flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {(user?.full_name || "User").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left">
            <span className="text-gray-900 font-medium text-sm">
              {user?.full_name || "User"}
            </span>
            <p className="text-xs text-gray-500">
              {user?.role || "Member"}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm"
        >
          Logout
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20} className="text-gray-700" /> : <Menu size={20} className="text-gray-700" />}
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-gray-200 flex flex-col px-6 py-4 space-y-3 z-50 md:hidden">
          
          {/* User info section for mobile */}
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-200">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {(user?.full_name || "User").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-gray-900 font-medium">
                {user?.full_name || "User"}
              </span>
              <p className="text-sm text-gray-500">
                {user?.role || "Member"}
              </p>
            </div>
          </div>

          {/* Navigation links */}
          <div className="space-y-1">
            <Link 
              href="/dashboard" 
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/deals/deals" 
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              All Deals
            </Link>
            <Link 
              href="/profile" 
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
          </div>

          {/* Logout button */}
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="w-full bg-red-50 text-red-600 px-3 py-2 rounded-md hover:bg-red-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
