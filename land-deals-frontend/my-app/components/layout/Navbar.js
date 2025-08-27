// components/layout/Navbar.js - Professional Navbar Component
import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, LogOut } from "lucide-react";

export default function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white border-b border-slate-200 shadow-sm relative">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Left: Logo/App Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900">Property Hub</span>
              <p className="text-xs text-slate-600 hidden sm:block">Management System</p>
            </div>
          </div>

          {/* Center: Navigation Links (Desktop) */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link href="/dashboard" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
              Dashboard
            </Link>
            <Link href="/deals/deals" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
              All Deals
            </Link>
            <Link href="/reports" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
              Reports
            </Link>
            <Link href="/analytics" className="text-slate-700 hover:text-slate-900 font-medium transition-colors duration-200">
              Analytics
            </Link>
          </div>

          {/* Right: User info and logout (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {(user?.full_name || user?.name || "User").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-900 font-semibold text-sm block">
                    {user?.full_name || user?.name || "User"}
                  </span>
                  {user?.role === 'admin' && (
                    <Link href="/admin/users" aria-label="Open admin user management">
                      <span className="text-[11px] leading-4 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium cursor-pointer">
                        Admin
                      </span>
                    </Link>
                  )}
                </div>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.role || "Member"}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 font-medium text-sm shadow-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="w-5 h-5 text-slate-700" />
            ) : (
              <Menu className="w-5 h-5 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg z-50 md:hidden">
          <div className="px-6 py-4 space-y-4">
            
            {/* User info section for mobile */}
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {(user?.full_name || user?.name || "User").charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-900 font-semibold text-base block">
                    {user?.full_name || user?.name || "User"}
                  </span>
                  {user?.role === 'admin' && (
                    <Link href="/admin/users" aria-label="Open admin user management">
                      <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium cursor-pointer">
                        Admin
                      </span>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-slate-600 capitalize">
                  {user?.role || "Member"}
                </p>
              </div>
            </div>

            {/* Navigation links for mobile */}
            <div className="space-y-2">
              <Link 
                href="/dashboard" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5h8" />
                </svg>
                Dashboard
              </Link>
              
              <Link 
                href="/deals/deals" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                All Deals
              </Link>
              
              <Link 
                href="/reports" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </Link>
              
              <Link 
                href="/analytics" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Analytics
              </Link>
              
              <Link 
                href="/profile" 
                className="flex items-center px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium"
                onClick={() => setMenuOpen(false)}
              >
                <User className="w-5 h-5 mr-3 text-slate-500" />
                Profile
              </Link>
              {/* Admin access is shown as a thin badge next to the user info above */}
            </div>

            {/* Logout button for mobile */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 font-medium"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
