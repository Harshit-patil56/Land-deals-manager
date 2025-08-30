import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout, isAuthenticated } from '../lib/auth';
import Navbar from '../components/layout/Navbar';
import { Plus, Search, Edit, Trash2, User, Phone, Mail, CreditCard, Hash, Eye } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

export default function Investors() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('investor_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [newInvestor, setNewInvestor] = useState({
    investor_name: '',
    investment_amount: '',
    investment_percentage: '',
    mobile: '',
    email: '',
    aadhar_card: '',
    pan_card: '',
    address: ''
  });

  useEffect(() => {
    // Check authentication and get user
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    const userData = getUser();
    setUser(userData);
    setAuthChecked(true);
    fetchInvestors();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const fetchInvestors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/investors');
      setInvestors(response.data || []);
    } catch (error) {
      console.error('Failed to fetch investors:', error);
      toast.error('Failed to load investors');
      setInvestors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvestor = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/investors', newInvestor);
      setInvestors([...investors, response.data]);
      setNewInvestor({
        investor_name: '',
        investment_amount: '',
        investment_percentage: '',
        mobile: '',
        email: '',
        aadhar_card: '',
        pan_card: '',
        address: ''
      });
      setShowAddModal(false);
      toast.success('Investor added successfully!');
    } catch (error) {
      console.error('Failed to add investor:', error);
      toast.error('Failed to add investor: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleEditInvestor = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/investors/${editingInvestor.id}`, editingInvestor);
      setInvestors(investors.map(inv => inv.id === editingInvestor.id ? response.data : inv));
      setEditingInvestor(null);
      toast.success('Investor updated successfully!');
    } catch (error) {
      console.error('Failed to update investor:', error);
      toast.error('Failed to update investor: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleDeleteInvestor = async (investorId) => {
    if (window.confirm('Are you sure you want to delete this investor?')) {
      try {
        await api.delete(`/investors/${investorId}`);
        setInvestors(investors.filter(inv => inv.id !== investorId));
        toast.success('Investor deleted successfully!');
      } catch (error) {
        console.error('Failed to delete investor:', error);
        toast.error('Failed to delete investor: ' + (error.response?.data?.error || 'Unknown error'));
      }
    }
  };

  const filteredInvestors = investors.filter(investor =>
    investor.investor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investor.mobile?.includes(searchTerm) ||
    investor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedInvestors = [...filteredInvestors].sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    
    if (sortBy === 'investment_amount' || sortBy === 'investment_percentage') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else {
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - Full Width */}
      <div className="bg-white  border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header - Full Width */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center mr-4">
                <User className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Investors Management</h1>
                <div className="mt-2 flex items-center text-sm text-slate-500 space-x-4">
                  <span>{investors.length} investor{investors.length !== 1 ? 's' : ''} registered</span>
                  <span>•</span>
                  <span>Track and manage all investor details</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link href="/investors/new">
                <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white  hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer ">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Investor
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="w-full px-6 py-8 space-y-8">
        
        {/* Search and Filters Section */}
        <div className="bg-white overflow-hidden  rounded border border-slate-200">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search investors by name, mobile, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white"
                >
                  <option value="investor_name">Sort by Name</option>
                  <option value="investment_amount">Sort by Amount</option>
                  <option value="investment_percentage">Sort by Percentage</option>
                  <option value="mobile">Sort by Mobile</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-4 py-3 border border-slate-300 rounded hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500  duration-200"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Investors Grid */}
        {loading ? (
          <div className="bg-white overflow-hidden  rounded border border-slate-200">
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
                  <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Investors</h3>
                <p className="text-slate-600">Please wait while we fetch investor data</p>
              </div>
            </div>
          </div>
        ) : sortedInvestors.length === 0 ? (
          <div className="bg-white overflow-hidden  rounded border border-slate-200">
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center mx-auto mb-6">
                <User className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Investors Found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm ? 'No investors match your search criteria.' : 'Get started by adding your first investor to the system.'}
              </p>
              <Link href="/investors/new">
                <span className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white  hover:bg-slate-800 cursor-pointer ">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Investor
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedInvestors.map((investor) => (
              <div key={investor.id} className="bg-white overflow-hidden  rounded border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-900">{investor.investor_name}</h3>
                        <p className="text-sm text-slate-500">ID: {investor.id}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Link href={`/investors/${investor.id}`}>
                        <span className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded  duration-200 cursor-pointer">
                          <Eye className="w-4 h-4" />
                        </span>
                      </Link>
                      <button
                        onClick={() => setEditingInvestor(investor)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded  duration-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInvestor(investor.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded  duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {investor.deal_title && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <span className="text-sm text-slate-600 font-medium">{investor.deal_title}</span>
                      </div>
                    )}
                    {investor.investment_amount && (
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">Investment: ₹{Number(investor.investment_amount).toLocaleString()}</span>
                      </div>
                    )}
                    {investor.investment_percentage && (
                      <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">Share: {investor.investment_percentage}%</span>
                      </div>
                    )}
                    {investor.mobile && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{investor.mobile}</span>
                      </div>
                    )}
                    {investor.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600 truncate">{investor.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Link href={`/investors/${investor.id}`}>
                      <span className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 font-medium text-sm cursor-pointer  duration-200">
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Investor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-slate-900">Add New Investor</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded  duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleAddInvestor} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Investor Name *</label>
                  <input
                    type="text"
                    required
                    value={newInvestor.investor_name}
                    onChange={(e) => setNewInvestor({...newInvestor, investor_name: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Investment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvestor.investment_amount}
                    onChange={(e) => setNewInvestor({...newInvestor, investment_amount: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Investment Percentage</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvestor.investment_percentage}
                    onChange={(e) => setNewInvestor({...newInvestor, investment_percentage: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mobile</label>
                  <input
                    type="tel"
                    value={newInvestor.mobile}
                    onChange={(e) => setNewInvestor({...newInvestor, mobile: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newInvestor.email}
                    onChange={(e) => setNewInvestor({...newInvestor, email: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Aadhaar Card</label>
                  <input
                    type="text"
                    value={newInvestor.aadhar_card}
                    onChange={(e) => setNewInvestor({...newInvestor, aadhar_card: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">PAN Card</label>
                  <input
                    type="text"
                    value={newInvestor.pan_card}
                    onChange={(e) => setNewInvestor({...newInvestor, pan_card: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <textarea
                    value={newInvestor.address}
                    onChange={(e) => setNewInvestor({...newInvestor, address: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="border-t border-slate-200 pt-6">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex items-center rounded bg-white px-6 py-3 text-sm font-medium text-slate-900  ring-1 ring-inset ring-slate-300 hover:bg-slate-50 "
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center rounded bg-slate-900 px-6 py-3 text-sm font-medium text-white  hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 "
                  >
                    Add Investor
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Investor Modal */}
      {editingInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-medium text-gray-900">Edit Investor</h2>
            </div>
            <form onSubmit={handleEditInvestor} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investor Name *</label>
                  <input
                    type="text"
                    required
                    value={editingInvestor.investor_name}
                    onChange={(e) => setEditingInvestor({...editingInvestor, investor_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investment Amount</label>
                  <input
                    type="number"
                    value={editingInvestor.investment_amount}
                    onChange={(e) => setEditingInvestor({...editingInvestor, investment_amount: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investment Percentage</label>
                  <input
                    type="number"
                    value={editingInvestor.investment_percentage}
                    onChange={(e) => setEditingInvestor({...editingInvestor, investment_percentage: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                  <input
                    type="tel"
                    value={editingInvestor.mobile}
                    onChange={(e) => setEditingInvestor({...editingInvestor, mobile: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingInvestor.email}
                    onChange={(e) => setEditingInvestor({...editingInvestor, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Card</label>
                  <input
                    type="text"
                    value={editingInvestor.aadhar_card}
                    onChange={(e) => setEditingInvestor({...editingInvestor, aadhar_card: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card</label>
                  <input
                    type="text"
                    value={editingInvestor.pan_card}
                    onChange={(e) => setEditingInvestor({...editingInvestor, pan_card: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={editingInvestor.address}
                    onChange={(e) => setEditingInvestor({...editingInvestor, address: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setEditingInvestor(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update Investor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
