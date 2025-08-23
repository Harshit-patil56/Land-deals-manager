import { ArrowRight, Twitter, Github, Dribbble } from 'lucide-react';
import Link from 'next/link';

// Main App Component
export default function App() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span className="font-bold text-lg">Stellar</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Features</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Pricing</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">About</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Contact</a>
          </nav>
          <Link href="/login">
            <span className="hidden md:inline-flex items-center justify-center h-10 px-6 font-medium tracking-wide text-white transition duration-200 rounded-md shadow-md bg-indigo-500 hover:bg-indigo-600 focus:shadow-outline focus:outline-none cursor-pointer">
              Get Started
            </span>
          </Link>
          <button className="md:hidden p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl py-24 sm:py-32">
          <div className="mb-4">
            <a href="#" className="inline-flex items-center justify-center px-4 py-1 text-sm font-medium leading-6 text-indigo-300 bg-indigo-500 bg-opacity-20 rounded-full hover:bg-opacity-30 transition">
              <span>Announcing our new feature</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight md:leading-tight mb-6">
            Build the Future, <br className="hidden md:inline" />
            <span className="text-indigo-400">One Line of Code</span> at a Time.
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 mb-10">
            Welcome to Stellar. We provide the tools and insights for modern developers to create beautiful, functional, and scalable applications.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <span className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 font-medium tracking-wide text-white transition duration-300 rounded-lg shadow-md bg-indigo-500 hover:bg-indigo-600 focus:shadow-outline focus:outline-none cursor-pointer">
                Start Building
              </span>
            </Link>
            <button className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 font-medium tracking-wide text-gray-300 transition duration-300 rounded-lg bg-gray-800 hover:bg-gray-700 focus:shadow-outline focus:outline-none">
              View Docs
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
          <p className="text-sm text-gray-500 mb-4 sm:mb-0">
            &copy; {new Date().getFullYear()} Stellar Inc. All rights reserved.
          </p>
          <div className="flex items-center space-x-5">
            <a href="#" className="text-gray-500 hover:text-white transition-colors duration-300">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors duration-300">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors duration-300">
              <Dribbble className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}