import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { dealAPI } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import toast from 'react-hot-toast';
import * as locationAPI from '../../../lib/locationAPI';

export default function EditDeal() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [originalDeal, setOriginalDeal] = useState(null);
  const [form, setForm] = useState({
    project_name: '',
    survey_number: '',
    state: '',
    district: '',
    taluka: '',
    village: '',
    total_area: '',
    area_unit: 'Acre',
    purchase_date: '',
    purchase_amount: '',
    selling_amount: '',
    status: 'open',
    owners: [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '', address: '' }],
    investors: [{ investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
    expenses: [{ expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' }],
    payment_mode: '',
    buyers: [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
    profit_allocation: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  // Location data states
  const [locationData, setLocationData] = useState({
    states: [],
    districts: [],
    talukas: [],
    villages: []
  });
  const [locationLoading, setLocationLoading] = useState({
    states: false,
    districts: false,
    talukas: false,
    villages: false
  });

  useEffect(() => {
    setUser(getUser());
    setAuthChecked(true);
    loadStates();
  }, []);

  useEffect(() => {
    if (id && authChecked) {
      fetchDealData();
    }
  }, [id, authChecked]);

  // Location loading functions
  const loadStates = async () => {
    setLocationLoading(prev => ({ ...prev, states: true }));
    try {
      const states = await locationAPI.getStates();
      setLocationData(prev => ({ ...prev, states }));
    } catch (error) {
      console.error('Error loading states:', error);
    } finally {
      setLocationLoading(prev => ({ ...prev, states: false }));
    }
  };

  const loadDistricts = async (state) => {
    if (!state) return;
    setLocationLoading(prev => ({ ...prev, districts: true }));
    try {
      const districts = await locationAPI.getDistricts(state);
      setLocationData(prev => ({ ...prev, districts, talukas: [], villages: [] }));
    } catch (error) {
      console.error('Error loading districts:', error);
    } finally {
      setLocationLoading(prev => ({ ...prev, districts: false }));
    }
  };

  const loadTalukas = async (district) => {
    if (!district) return;
    setLocationLoading(prev => ({ ...prev, talukas: true }));
    try {
      const talukas = await locationAPI.getTalukas(district);
      setLocationData(prev => ({ ...prev, talukas, villages: [] }));
    } catch (error) {
      console.error('Error loading talukas:', error);
    } finally {
      setLocationLoading(prev => ({ ...prev, talukas: false }));
    }
  };

  const loadVillages = async (taluka) => {
    if (!taluka) return;
    setLocationLoading(prev => ({ ...prev, villages: true }));
    try {
      const villages = await locationAPI.getVillages(taluka);
      setLocationData(prev => ({ ...prev, villages }));
    } catch (error) {
      console.error('Error loading villages:', error);
    } finally {
      setLocationLoading(prev => ({ ...prev, villages: false }));
    }
  };

  const fetchDealData = async () => {
    try {
      setFetchLoading(true);
      const response = await dealAPI.getById(id);
      const dealData = response.data;
      
      setOriginalDeal(dealData);
      
      // Map the deal data to form structure
      setForm({
        project_name: dealData.deal?.project_name || '',
        survey_number: dealData.deal?.survey_number || '',
        state: dealData.deal?.state || '',
        district: dealData.deal?.district || '',
        taluka: dealData.deal?.taluka || '',
        village: dealData.deal?.village || '',
        total_area: dealData.deal?.total_area || '',
        area_unit: dealData.deal?.area_unit || 'Acre',
        purchase_date: dealData.deal?.purchase_date || '',
        purchase_amount: dealData.deal?.purchase_amount || '',
        selling_amount: dealData.deal?.selling_amount || '',
        status: dealData.deal?.status || 'open',
        owners: dealData.owners?.length > 0 ? dealData.owners.map(owner => ({
          name: owner.name || '',
          mobile: owner.mobile || '',
          email: owner.email || '',
          aadhar_card: owner.aadhar_card || '',
          pan_card: owner.pan_card || '',
          address: owner.address || ''
        })) : [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '', address: '' }],
        investors: dealData.investors?.length > 0 ? dealData.investors.map(investor => ({
          investor_name: investor.investor_name || '',
          investment_amount: investor.investment_amount || '',
          investment_percentage: investor.investment_percentage || '',
          mobile: investor.mobile || '',
          email: investor.email || '',
          aadhar_card: investor.aadhar_card || '',
          pan_card: investor.pan_card || ''
        })) : [{ investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
        expenses: dealData.expenses?.length > 0 ? dealData.expenses.map(expense => ({
          expense_type: expense.expense_type || '',
          expense_description: expense.expense_description || '',
          amount: expense.amount || '',
          paid_by: expense.paid_by || '',
          expense_date: expense.expense_date || '',
          receipt_number: expense.receipt_number || ''
        })) : [{ expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' }],
        payment_mode: dealData.deal?.payment_mode || '',
        buyers: dealData.buyers?.length > 0 ? dealData.buyers.map(buyer => ({
          name: buyer.name || '',
          mobile: buyer.mobile || '',
          email: buyer.email || '',
          aadhar_card: buyer.aadhar_card || '',
          pan_card: buyer.pan_card || ''
        })) : [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
        profit_allocation: dealData.deal?.profit_allocation || '',
      });

      // Load location data based on existing values
      if (dealData.deal?.state) {
        await loadDistricts(dealData.deal.state);
        if (dealData.deal?.district) {
          await loadTalukas(dealData.deal.district);
          if (dealData.deal?.taluka) {
            await loadVillages(dealData.deal.taluka);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error('Failed to load deal data');
      router.push('/deals');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Handle location changes
    if (name === 'state') {
      loadDistricts(value);
      setForm(prev => ({ ...prev, district: '', taluka: '', village: '' }));
    } else if (name === 'district') {
      loadTalukas(value);
      setForm(prev => ({ ...prev, taluka: '', village: '' }));
    } else if (name === 'taluka') {
      loadVillages(value);
      setForm(prev => ({ ...prev, village: '' }));
    }
  };

  const handleArrayChange = (index, field, value, arrayName) => {
    setForm(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (arrayName, template) => {
    setForm(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], template]
    }));
  };

  const removeArrayItem = (index, arrayName) => {
    setForm(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to update a deal');
      return;
    }

    setLoading(true);
    try {
      await dealAPI.update(id, form);
      toast.success('Deal updated successfully!');
      router.push(`/deals/${id}`);
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error(error.response?.data?.error || 'Failed to update deal');
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked || fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deal data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const ownerTemplate = { name: '', mobile: '', email: '', aadhar_card: '', pan_card: '', address: '' };
  const buyerTemplate = { name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' };
  const investorTemplate = { investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '' };
  const expenseTemplate = { expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Edit Deal</h1>
              <button
                onClick={() => router.push(`/deals/${id}`)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600">Update the deal information and related data</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Basic Deal Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="project_name"
                    value={form.project_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Survey Number
                  </label>
                  <input
                    type="text"
                    name="survey_number"
                    value={form.survey_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Location Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select State</option>
                    {locationData.states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
                  <select
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={locationLoading.districts}
                  >
                    <option value="">Select District</option>
                    {locationData.districts.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taluka</label>
                  <select
                    name="taluka"
                    value={form.taluka}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={locationLoading.talukas}
                  >
                    <option value="">Select Taluka</option>
                    {locationData.talukas.map(taluka => (
                      <option key={taluka} value={taluka}>{taluka}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                  <select
                    name="village"
                    value={form.village}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={locationLoading.villages}
                  >
                    <option value="">Select Village</option>
                    {locationData.villages.map(village => (
                      <option key={village} value={village}>{village}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Area
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="total_area"
                    value={form.total_area}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Unit
                  </label>
                  <select
                    name="area_unit"
                    value={form.area_unit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Acre">Acre</option>
                    <option value="Hectare">Hectare</option>
                    <option value="Sq Ft">Sq Ft</option>
                    <option value="Sq Meter">Sq Meter</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={form.purchase_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchase_amount"
                    value={form.purchase_amount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="selling_amount"
                    value={form.selling_amount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    name="payment_mode"
                    value={form.payment_mode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Payment Mode</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profit Allocation
                  </label>
                  <input
                    type="text"
                    name="profit_allocation"
                    value={form.profit_allocation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 50-50, 60-40, etc."
                  />
                </div>
              </div>
            </div>

            {/* Owners Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Property Owners
                </h2>
                <button
                  type="button"
                  onClick={() => addArrayItem('owners', ownerTemplate)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Add Owner
                </button>
              </div>
              
              {form.owners.map((owner, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Owner {index + 1}</h3>
                    {form.owners.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem(index, 'owners')}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={owner.name}
                      onChange={(e) => handleArrayChange(index, 'name', e.target.value, 'owners')}
                      placeholder="Full Name"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      value={owner.mobile}
                      onChange={(e) => handleArrayChange(index, 'mobile', e.target.value, 'owners')}
                      placeholder="Mobile Number"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="email"
                      value={owner.email}
                      onChange={(e) => handleArrayChange(index, 'email', e.target.value, 'owners')}
                      placeholder="Email"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={owner.aadhar_card}
                      onChange={(e) => handleArrayChange(index, 'aadhar_card', e.target.value, 'owners')}
                      placeholder="Aadhar Card"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={owner.pan_card}
                      onChange={(e) => handleArrayChange(index, 'pan_card', e.target.value, 'owners')}
                      placeholder="PAN Card"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={owner.address}
                      onChange={(e) => handleArrayChange(index, 'address', e.target.value, 'owners')}
                      placeholder="Address"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Buyers Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Buyers
                </h2>
                <button
                  type="button"
                  onClick={() => addArrayItem('buyers', buyerTemplate)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Add Buyer
                </button>
              </div>
              
              {form.buyers.map((buyer, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Buyer {index + 1}</h3>
                    {form.buyers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem(index, 'buyers')}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={buyer.name}
                      onChange={(e) => handleArrayChange(index, 'name', e.target.value, 'buyers')}
                      placeholder="Full Name"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      value={buyer.mobile}
                      onChange={(e) => handleArrayChange(index, 'mobile', e.target.value, 'buyers')}
                      placeholder="Mobile Number"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="email"
                      value={buyer.email}
                      onChange={(e) => handleArrayChange(index, 'email', e.target.value, 'buyers')}
                      placeholder="Email"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={buyer.aadhar_card}
                      onChange={(e) => handleArrayChange(index, 'aadhar_card', e.target.value, 'buyers')}
                      placeholder="Aadhar Card"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={buyer.pan_card}
                      onChange={(e) => handleArrayChange(index, 'pan_card', e.target.value, 'buyers')}
                      placeholder="PAN Card"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Investors Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Investors
                </h2>
                <button
                  type="button"
                  onClick={() => addArrayItem('investors', investorTemplate)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  Add Investor
                </button>
              </div>
              
              {form.investors.map((investor, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Investor {index + 1}</h3>
                    {form.investors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem(index, 'investors')}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={investor.investor_name}
                      onChange={(e) => handleArrayChange(index, 'investor_name', e.target.value, 'investors')}
                      placeholder="Investor Name"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={investor.investment_amount}
                      onChange={(e) => handleArrayChange(index, 'investment_amount', e.target.value, 'investors')}
                      placeholder="Investment Amount"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={investor.investment_percentage}
                      onChange={(e) => handleArrayChange(index, 'investment_percentage', e.target.value, 'investors')}
                      placeholder="Investment %"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      value={investor.mobile}
                      onChange={(e) => handleArrayChange(index, 'mobile', e.target.value, 'investors')}
                      placeholder="Mobile Number"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="email"
                      value={investor.email}
                      onChange={(e) => handleArrayChange(index, 'email', e.target.value, 'investors')}
                      placeholder="Email"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={investor.aadhar_card}
                      onChange={(e) => handleArrayChange(index, 'aadhar_card', e.target.value, 'investors')}
                      placeholder="Aadhar Card"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={investor.pan_card}
                      onChange={(e) => handleArrayChange(index, 'pan_card', e.target.value, 'investors')}
                      placeholder="PAN Card"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Expenses Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Expenses
                </h2>
                <button
                  type="button"
                  onClick={() => addArrayItem('expenses', expenseTemplate)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                >
                  Add Expense
                </button>
              </div>
              
              {form.expenses.map((expense, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Expense {index + 1}</h3>
                    {form.expenses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem(index, 'expenses')}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={expense.expense_type}
                      onChange={(e) => handleArrayChange(index, 'expense_type', e.target.value, 'expenses')}
                      placeholder="Expense Type"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={expense.expense_description}
                      onChange={(e) => handleArrayChange(index, 'expense_description', e.target.value, 'expenses')}
                      placeholder="Description"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={expense.amount}
                      onChange={(e) => handleArrayChange(index, 'amount', e.target.value, 'expenses')}
                      placeholder="Amount"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={expense.paid_by}
                      onChange={(e) => handleArrayChange(index, 'paid_by', e.target.value, 'expenses')}
                      placeholder="Paid By"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="date"
                      value={expense.expense_date}
                      onChange={(e) => handleArrayChange(index, 'expense_date', e.target.value, 'expenses')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={expense.receipt_number}
                      onChange={(e) => handleArrayChange(index, 'receipt_number', e.target.value, 'expenses')}
                      placeholder="Receipt Number"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(`/deals/${id}`)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Deal'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
