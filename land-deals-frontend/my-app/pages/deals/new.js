// --- All imports remain untouched ---
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { dealAPI, ownersAPI } from '../../lib/api';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import toast from 'react-hot-toast';
import * as locationAPI from '../../lib/locationAPI';
import Navbar from '../../components/layout/Navbar';

export default function NewDeal() {
  // --- Logic & state unchanged ---
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
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
    owners: [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
    investors: [{ investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '', address: '' }],
    expenses: [{ expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' }],
    buyers: [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
    documents: [],
  });
  const [files, setFiles] = useState([]);
  const [landDocuments, setLandDocuments] = useState({
    extract: [],
    property_card: [],
    survey_map: [],
    demarcation_certificate: [],
    development_plan: [],
    encumbrance_certificate: [],
    additional_docs: [
      { name: '', files: [] }
    ]
  });
  const [ownerDocuments, setOwnerDocuments] = useState({});
  const [existingOwnerDocuments, setExistingOwnerDocuments] = useState({});
  const [missingDocuments, setMissingDocuments] = useState({});
  
  // Investor documents state
  const [investorDocuments, setInvestorDocuments] = useState({});
  const [existingInvestorDocuments, setExistingInvestorDocuments] = useState({});
  const [investorMissingDocuments, setInvestorMissingDocuments] = useState({});
  
  // Initialize owner documents when owners array changes
  useEffect(() => {
    setOwnerDocuments(prev => {
      const next = {}
      form.owners.forEach((_, index) => {
        next[index] = prev && prev[index] ? prev[index] : {
          identity_proof: [],
          address_proof: [],
          photograph: [],
          bank_details: [],
          power_of_attorney: [],
          past_sale_deeds: [],
          noc_co_owners: [],
          noc_society: [],
          affidavit_no_dispute: []
        }
      })
      // quick shallow equality: same keys => keep prev to avoid re-renders
      const prevKeys = prev ? Object.keys(prev) : []
      const nextKeys = Object.keys(next)
      const same = prev && prevKeys.length === nextKeys.length && nextKeys.every(k => prev.hasOwnProperty(k))
      return same ? prev : next
    })
  }, [form.owners])
  
  // Initialize investor documents when investors array changes
  useEffect(() => {
    const newInvestorDocuments = {};
    form.investors.forEach((_, index) => {
      if (!investorDocuments[index]) {
        newInvestorDocuments[index] = {
          identity_proof: [], // Aadhaar, PAN, Passport/Voter ID
          photograph: [],
          bank_details: [], // Bank Account Details (cheque/passbook copy)
          investment_agreement: [], // Capital Commitment Agreement
          financial_proof: [], // Actual Contribution Records
          partnership_agreement: [], // Partnership/Joint Venture Agreement
          loan_agreement: [], // Loan Agreement (if investor money is borrowed)
          power_of_attorney: [] // Power of Attorney (optional)
        };
      } else {
        newInvestorDocuments[index] = investorDocuments[index];
      }
    });
    setInvestorDocuments(newInvestorDocuments);
  }, [form.investors, investorDocuments]);
  
  // Existing owners functionality
  const [existingOwners, setExistingOwners] = useState([]);
  const [ownerSelectionTypes, setOwnerSelectionTypes] = useState({}); // Track selection type for each owner index
  const [selectedExistingOwners, setSelectedExistingOwners] = useState({}); // Track selected existing owners
  
  // Existing investors functionality
  const [existingInvestors, setExistingInvestors] = useState([]);
  const [investorSelectionTypes, setInvestorSelectionTypes] = useState({}); // Track selection type for each investor index
  const [selectedExistingInvestors, setSelectedExistingInvestors] = useState({}); // Track selected existing investors
  
  const [loading, setLoading] = useState(false);
  
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
    
    // Load states on component mount
    loadStates();
    
    // Load existing owners
    fetchExistingOwners();
    
    // Load existing investors
    fetchExistingInvestors();
  }, []);

  // Fetch existing owners
  const fetchExistingOwners = async () => {
    try {
      // Create a simple API call to get owners using proper API method
      const response = await ownersAPI.getAll();
      setExistingOwners(response.data);
    } catch (error) {
      console.error('Failed to fetch existing owners:', error);
      console.error('Error message:', error.message);
    }
  };

  const fetchOwnerDocuments = async (ownerId) => {
    try {
      const response = await api.get(`/owners/${ownerId}/documents`);
      return response.data.documents;
    } catch (error) {
      console.error('Failed to fetch owner documents:', error);
      return {};
    }
  };

  // Fetch existing investors
  const fetchExistingInvestors = async () => {
    try {
      // For now, investors are deal-specific, so we'll start with empty array
      // In the future, this could be implemented as a separate API endpoint
      setExistingInvestors([]);
    } catch (error) {
      console.error('Failed to fetch existing investors:', error);
    }
  };

  const fetchInvestorDocuments = async (investorId) => {
    try {
      const response = await api.get(`/investors/${investorId}/documents`);
      return response.data.documents;
    } catch (error) {
      console.error('Failed to fetch investor documents:', error);
      return {};
    }
  };

  const checkMissingDocuments = (existingDocs) => {
    const requiredDocTypes = [
      'identity_proof', 'address_proof', 'photograph', 'bank_details',
      'power_of_attorney', 'past_sale_deeds', 'noc_co_owners', 
      'noc_society', 'affidavit_no_dispute'
    ];
    
    // Map old document types to new ones for compatibility
    const docMapping = {
      'id_proof': 'identity_proof',
      'photo': 'photograph'
    };
    
    // Normalize existing docs to handle old naming
    const normalizedDocs = {};
    Object.entries(existingDocs).forEach(([docType, docs]) => {
      const normalizedType = docMapping[docType] || docType;
      if (!normalizedDocs[normalizedType]) {
        normalizedDocs[normalizedType] = [];
      }
      normalizedDocs[normalizedType] = normalizedDocs[normalizedType].concat(docs);
    });
    
    const missing = {};
    requiredDocTypes.forEach(docType => {
      if (!normalizedDocs[docType] || normalizedDocs[docType].length === 0) {
        missing[docType] = true;
      }
    });
    
    return missing;
  };

  const getDocumentDescription = (docType) => {
    const descriptions = {
      identity_proof: "Aadhaar, PAN, Passport, Voter ID",
      address_proof: "Electricity Bill, Ration Card, etc.",
      photograph: "Scanned photo for record",
      bank_details: "Cancelled cheque or passbook copy",
      power_of_attorney: "If someone else is signing on behalf",
      past_sale_deeds: "Previous ownership records",
      noc_co_owners: "Family members NOC (joint family property)",
      noc_society: "If applicable",
      affidavit_no_dispute: "Declaration of no legal dispute"
    };
    return descriptions[docType] || "";
  };

  const getDocumentDisplayName = (docType) => {
    const displayNames = {
      identity_proof: "Identity Proof",
      address_proof: "Address Proof", 
      photograph: "Photograph",
      bank_details: "Bank Details",
      power_of_attorney: "Power of Attorney",
      past_sale_deeds: "Past Sale Deeds",
      noc_co_owners: "NOC from Co-owners",
      noc_society: "NOC from Society/Gram Panchayat",
      affidavit_no_dispute: "Affidavit - No Legal Dispute"
    };
    return displayNames[docType] || docType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Investor document helper functions
  const getInvestorDocumentDescription = (docType) => {
    const descriptions = {
      identity_proof: "Aadhaar, PAN, Passport/Voter ID",
      photograph: "Scanned photo for record",
      bank_details: "Cheque/passbook copy",
      investment_agreement: "How much %/₹ invested",
      financial_proof: "Transaction proof",
      partnership_agreement: "Signed by all investors",
      loan_agreement: "If investor money is borrowed",
      power_of_attorney: "Optional, if investor authorizes manager"
    };
    return descriptions[docType] || "";
  };

  const getInvestorDocumentDisplayName = (docType) => {
    const displayNames = {
      identity_proof: "Investor KYC",
      photograph: "Photograph",
      bank_details: "Bank Account Details",
      investment_agreement: "Capital Commitment Agreement",
      financial_proof: "Actual Contribution Records",
      partnership_agreement: "Partnership/Joint Venture Agreement",
      loan_agreement: "Loan Agreement",
      power_of_attorney: "Power of Attorney"
    };
    return displayNames[docType] || docType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Location loading functions
  const loadStates = async () => {
    setLocationLoading(prev => ({ ...prev, states: true }));
    try {
      const states = await locationAPI.fetchStates();
      setLocationData(prev => ({ ...prev, states }));
    } catch {
      toast.error('Failed to load states');
    } finally {
      setLocationLoading(prev => ({ ...prev, states: false }));
    }
  };

  const loadDistricts = async (stateId, stateName) => {
    setLocationLoading(prev => ({ ...prev, districts: true }));
    try {
      const districts = await locationAPI.fetchDistricts(stateId, stateName);
      setLocationData(prev => ({ ...prev, districts, talukas: [], villages: [] }));
    } catch {
      toast.error('Failed to load districts');
    } finally {
      setLocationLoading(prev => ({ ...prev, districts: false }));
    }
  };

  const loadTalukas = async (districtName, stateName) => {
    setLocationLoading(prev => ({ ...prev, talukas: true }));
    try {
      const talukas = await locationAPI.fetchTalukas(districtName, stateName);
      setLocationData(prev => ({ ...prev, talukas, villages: [] }));
    } catch {
      toast.error('Failed to load talukas');
    } finally {
      setLocationLoading(prev => ({ ...prev, talukas: false }));
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading...</h3>
          <p className="text-slate-600">Please wait while we initialize the form</p>
        </div>
      </div>
    );
  }
  
  if (!user || (user.role !== 'auditor' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Restricted</h3>
          <p className="text-slate-600">Only admin or auditor can create new deals.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle dependent dropdowns - clear child selections when parent changes
    if (name === 'state') {
      const selectedState = locationData.states.find(state => state.name === value);
      setForm({ 
        ...form, 
        [name]: type === 'checkbox' ? checked : value,
        district: '', // Clear district when state changes
        taluka: '',   // Clear taluka when state changes
        village: ''   // Clear village when state changes
      });
      
      // Load districts for selected state
      if (selectedState) {
        loadDistricts(selectedState.id, selectedState.name);
      } else {
        setLocationData(prev => ({ ...prev, districts: [], talukas: [], villages: [] }));
      }
    } else if (name === 'district') {
      setForm({ 
        ...form, 
        [name]: type === 'checkbox' ? checked : value,
        taluka: '',   // Clear taluka when district changes
        village: ''   // Clear village when district changes
      });
      
      // Load talukas for selected district
      if (value && form.state) {
        loadTalukas(value, form.state);
      } else {
        setLocationData(prev => ({ ...prev, talukas: [], villages: [] }));
      }
    } else if (name === 'taluka') {
      setForm({ 
        ...form, 
        [name]: type === 'checkbox' ? checked : value,
        village: ''   // Clear village when taluka changes
      });
    } else if (name === 'village') {
      setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    } else {
      setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    }
  };
  
  const handleArrayChange = (arr, idx, e) => {
    const updated = [...form[arr]];
    let value = e.target.value;
    
    // Format mobile number input
    if (e.target.name === 'mobile') {
      // Remove all non-digits
      value = value.replace(/\D/g, '');
      // Limit to 10 digits for Indian mobile numbers
      value = value.substring(0, 10);
    }
    
    // Format Aadhaar card input
    if (e.target.name === 'aadhar_card') {
      // Remove all non-digits
      value = value.replace(/\D/g, '');
      // Limit to 12 digits
      value = value.substring(0, 12);
      // Add spaces every 4 digits
      value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    }
    
    // Format PAN card input
    if (e.target.name === 'pan_card') {
      // Convert to uppercase and limit to 10 characters
      value = value.toUpperCase().substring(0, 10);
      // PAN format validation (5 letters, 4 digits, 1 letter)
      value = value.replace(/[^A-Z0-9]/g, '');
    }
    
    updated[idx][e.target.name] = value;
    setForm({ ...form, [arr]: updated });
  };
  
  const addArrayItem = (arr, obj) => setForm({ ...form, [arr]: [...form[arr], obj] });
  const removeArrayItem = (arr, idx) => setForm({ ...form, [arr]: form[arr].filter((_, i) => i !== idx) });
  
  // Owner selection functions
  const handleOwnerTypeChange = (ownerIndex, type) => {
    setOwnerSelectionTypes(prev => ({
      ...prev,
      [ownerIndex]: type
    }));
    
    if (type === 'new') {
      // Reset to empty form for new owner
      const updatedOwners = [...form.owners];
      updatedOwners[ownerIndex] = { name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' };
      setForm({ ...form, owners: updatedOwners });
      
      // Clear existing owner selection
      setSelectedExistingOwners(prev => {
        const updated = { ...prev };
        delete updated[ownerIndex];
        return updated;
      });
    }
  };
  
  const handleExistingOwnerSelect = async (ownerIndex, existingOwnerId) => {
    setSelectedExistingOwners(prev => ({
      ...prev,
      [ownerIndex]: existingOwnerId
    }));
    
    if (existingOwnerId) {
      const existingOwner = existingOwners.find(owner => owner.id === parseInt(existingOwnerId));
      
      if (existingOwner) {
        const updatedOwners = [...form.owners];
        updatedOwners[ownerIndex] = {
          name: existingOwner.name,
          mobile: existingOwner.mobile || '',
          email: existingOwner.email || '',
          aadhar_card: existingOwner.aadhar_card || '',
          pan_card: existingOwner.pan_card || '',
          existing_owner_id: existingOwner.id
        };
        setForm({ ...form, owners: updatedOwners });
        
        // Fetch existing documents for this owner
        const ownerDocs = await fetchOwnerDocuments(existingOwner.id);
        
        // Normalize document types for compatibility
        const normalizedDocs = {};
        Object.entries(ownerDocs).forEach(([docType, docs]) => {
          let normalizedType = docType;
          // Map old document types to new ones
          if (docType === 'id_proof') normalizedType = 'identity_proof';
          if (docType === 'photo') normalizedType = 'photograph';
          
          normalizedDocs[normalizedType] = docs;
        });
        
        setExistingOwnerDocuments(prev => ({
          ...prev,
          [ownerIndex]: normalizedDocs
        }));
        
        // Check which documents are missing
        const missing = checkMissingDocuments(normalizedDocs);
        setMissingDocuments(prev => ({
          ...prev,
          [ownerIndex]: missing
        }));
      }
    } else {
      // Clear documents when no owner is selected
      setExistingOwnerDocuments(prev => {
        const updated = { ...prev };
        delete updated[ownerIndex];
        return updated;
      });
      setMissingDocuments(prev => {
        const updated = { ...prev };
        delete updated[ownerIndex];
        return updated;
      });
    }
  };
  
  const addOwnerWithType = () => {
    const newOwnerIndex = form.owners.length;
    addArrayItem('owners', { name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' });
    
    // Set default to new owner type
    setOwnerSelectionTypes(prev => ({
      ...prev,
      [newOwnerIndex]: 'new'
    }));
  };
  
  const removeOwnerWithType = (index) => {
    removeArrayItem('owners', index);
    
    // Clean up related state
    setOwnerSelectionTypes(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
    
    setSelectedExistingOwners(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
  };
  
  const handleInvestorTypeChange = (idx, type) => {
    setInvestorSelectionTypes(prev => ({
      ...prev,
      [idx]: type
    }));
    
    // Clear existing investor selection when switching to new
    if (type === 'new') {
      setSelectedExistingInvestors(prev => {
        const updated = { ...prev };
        delete updated[idx];
        return updated;
      });
      
      // Reset investor form to empty
      const updatedInvestors = [...form.investors];
      updatedInvestors[idx] = {
        investor_name: '',
        investment_amount: '',
        investment_percentage: '',
        mobile: '',
        email: '',
        aadhar_card: '',
        pan_card: '',
        address: ''
      };
      setForm({ ...form, investors: updatedInvestors });
    }
  };
  
  const addInvestorWithType = () => {
    const newInvestorIndex = form.investors.length;
    addArrayItem('investors', { investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '', address: '' });
    
    // Set default to new investor type
    setInvestorSelectionTypes(prev => ({
      ...prev,
      [newInvestorIndex]: 'new'
    }));
  };
  
  const removeInvestorWithType = (index) => {
    removeArrayItem('investors', index);
    
    // Clean up related state
    setInvestorSelectionTypes(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
    
    setSelectedExistingInvestors(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
  };
  
  const handleExistingInvestorSelect = async (investorIndex, existingInvestorId) => {
    setSelectedExistingInvestors(prev => ({
      ...prev,
      [investorIndex]: existingInvestorId
    }));
    
    if (existingInvestorId) {
      const existingInvestor = existingInvestors.find(investor => investor.id === parseInt(existingInvestorId));
      
      if (existingInvestor) {
        const updatedInvestors = [...form.investors];
        updatedInvestors[investorIndex] = {
          investor_name: existingInvestor.investor_name,
          investment_amount: existingInvestor.investment_amount || '',
          investment_percentage: existingInvestor.investment_percentage || '',
          mobile: existingInvestor.mobile || '',
          email: existingInvestor.email || '',
          aadhar_card: existingInvestor.aadhar_card || '',
          pan_card: existingInvestor.pan_card || '',
          address: existingInvestor.address || '',
          existing_investor_id: existingInvestor.id
        };
        setForm({ ...form, investors: updatedInvestors });
        
        // Fetch existing documents for this investor
        const investorDocs = await fetchInvestorDocuments(existingInvestor.id);
        
        setExistingInvestorDocuments(prev => ({
          ...prev,
          [investorIndex]: investorDocs
        }));
        
        // Check which documents are missing for investors
        const missing = checkMissingInvestorDocuments(investorDocs);
        setInvestorMissingDocuments(prev => ({
          ...prev,
          [investorIndex]: missing
        }));
      }
    } else {
      // Clear documents when no investor is selected
      setExistingInvestorDocuments(prev => {
        const updated = { ...prev };
        delete updated[investorIndex];
        return updated;
      });
      setInvestorMissingDocuments(prev => {
        const updated = { ...prev };
        delete updated[investorIndex];
        return updated;
      });
    }
  };

  const checkMissingInvestorDocuments = (existingDocs) => {
    const requiredDocTypes = [
      'identity_proof', 'photograph', 'bank_details', 'investment_agreement',
      'financial_proof', 'partnership_agreement', 'loan_agreement', 'power_of_attorney'
    ];
    
    const missing = {};
    requiredDocTypes.forEach(docType => {
      missing[docType] = !existingDocs[docType] || existingDocs[docType].length === 0;
    });
    
    return missing;
  };
  
  const handleFileChange = (e) => setFiles(Array.from(e.target.files));

  const handleLandDocumentChange = (docType, e) => {
    if (docType === 'additional_docs') {
      // Handle additional docs differently - this is handled by AdditionalDocsField
      return;
    }
    const files = Array.from(e.target.files);
    setLandDocuments(prev => ({
      ...prev,
      [docType]: [...prev[docType], ...files]
    }));
  };

  const removeLandDocument = (docType, index) => {
    if (docType === 'additional_docs') {
      // Handle additional docs differently - this is handled by AdditionalDocsField
      return;
    }
    setLandDocuments(prev => ({
      ...prev,
      [docType]: prev[docType].filter((_, i) => i !== index)
    }));
  };

  // Handlers for Additional Documents
  const addAdditionalDoc = () => {
    if (landDocuments.additional_docs.length < 5) {
      setLandDocuments(prev => ({
        ...prev,
        additional_docs: [...prev.additional_docs, { name: '', files: [] }]
      }));
    }
  };

  const removeAdditionalDoc = (index) => {
    setLandDocuments(prev => ({
      ...prev,
      additional_docs: prev.additional_docs.filter((_, i) => i !== index)
    }));
  };

  const updateAdditionalDocName = (index, name) => {
    setLandDocuments(prev => ({
      ...prev,
      additional_docs: prev.additional_docs.map((doc, i) => 
        i === index ? { ...doc, name } : doc
      )
    }));
  };

  const updateAdditionalDocFiles = (index, files) => {
    setLandDocuments(prev => ({
      ...prev,
      additional_docs: prev.additional_docs.map((doc, i) => 
        i === index ? { ...doc, files: Array.from(files) } : doc
      )
    }));
  };

  const removeAdditionalDocFile = (docIndex, fileIndex) => {
    setLandDocuments(prev => ({
      ...prev,
      additional_docs: prev.additional_docs.map((doc, i) => 
        i === docIndex ? {
          ...doc, 
          files: doc.files.filter((_, fi) => fi !== fileIndex)
        } : doc
      )
    }));
  };

  // Handlers for Owner Documents
  const handleOwnerDocumentChange = (ownerIndex, docType, e) => {
    const files = Array.from(e.target.files);
    setOwnerDocuments(prev => ({
      ...prev,
      [ownerIndex]: {
        ...prev[ownerIndex],
        [docType]: [...(prev[ownerIndex]?.[docType] || []), ...files]
      }
    }));
  };

  const removeOwnerDocument = (ownerIndex, docType, index) => {
    setOwnerDocuments(prev => ({
      ...prev,
      [ownerIndex]: {
        ...prev[ownerIndex],
        [docType]: prev[ownerIndex][docType].filter((_, i) => i !== index)
      }
    }));
  };

  // Handlers for Investor Documents
  const handleInvestorDocumentChange = (investorIndex, docType, e) => {
    const files = Array.from(e.target.files);
    setInvestorDocuments(prev => ({
      ...prev,
      [investorIndex]: {
        ...prev[investorIndex],
        [docType]: [...(prev[investorIndex]?.[docType] || []), ...files]
      }
    }));
  };

  const removeInvestorDocument = (investorIndex, docType, index) => {
    setInvestorDocuments(prev => ({
      ...prev,
      [investorIndex]: {
        ...prev[investorIndex],
        [docType]: prev[investorIndex][docType].filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, documents: files.map(f => f.name) };
      const dealRes = await dealAPI.create(payload);
      const dealId = dealRes.data.deal_id || dealRes.data.id;
      let allUploadsSuccessful = true;
      
      // Upload general documents
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('deal_id', dealId);
        formData.append('document_type', 'general');
        try {
          await dealAPI.uploadDocument(formData);
        } catch (uploadErr) {
          toast.error(`Failed to upload file ${file.name}: ` + (uploadErr?.response?.data?.error || 'Unknown error'));
          allUploadsSuccessful = false;
        }
      }

      // Upload land documents by type
      const landDocTypes = Object.keys(landDocuments);
      for (const docType of landDocTypes) {
        if (docType === 'additional_docs') {
          // Handle additional docs with custom names
          for (const additionalDoc of landDocuments.additional_docs) {
            if (additionalDoc.name && additionalDoc.files.length > 0) {
              for (const file of additionalDoc.files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('deal_id', dealId);
                formData.append('document_type', additionalDoc.name || 'additional_document');
                try {
                  await dealAPI.uploadDocument(formData);
                } catch (uploadErr) {
                  toast.error(`Failed to upload ${additionalDoc.name} file ${file.name}: ` + (uploadErr?.response?.data?.error || 'Unknown error'));
                  allUploadsSuccessful = false;
                }
              }
            }
          }
        } else {
          // Handle regular document types
          const docsOfType = landDocuments[docType];
          for (const file of docsOfType) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('deal_id', dealId);
            formData.append('document_type', docType);
            try {
              await dealAPI.uploadDocument(formData);
            } catch (uploadErr) {
              toast.error(`Failed to upload ${docType} file ${file.name}: ` + (uploadErr?.response?.data?.error || 'Unknown error'));
              allUploadsSuccessful = false;
            }
          }
        }
      }

      // Upload owner documents by owner and type
      const ownerIndices = Object.keys(ownerDocuments);
      for (const ownerIndex of ownerIndices) {
        const ownerDocs = ownerDocuments[ownerIndex];
        const docTypes = Object.keys(ownerDocs);
        for (const docType of docTypes) {
          const docsOfType = ownerDocs[docType];
          for (const file of docsOfType) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('deal_id', dealId);
            formData.append('document_type', `owner_${ownerIndex}_${docType}`);
            try {
              await dealAPI.uploadDocument(formData);
            } catch (uploadErr) {
              toast.error(`Failed to upload owner ${parseInt(ownerIndex) + 1} ${docType} file ${file.name}: ` + (uploadErr?.response?.data?.error || 'Unknown error'));
              allUploadsSuccessful = false;
            }
          }
        }
      }

      // Upload investor documents by investor and type
      const investorIndices = Object.keys(investorDocuments);
      for (const investorIndex of investorIndices) {
        const investorDocs = investorDocuments[investorIndex];
        const docTypes = Object.keys(investorDocs);
        for (const docType of docTypes) {
          const docsOfType = investorDocs[docType];
          for (const file of docsOfType) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('deal_id', dealId);
            formData.append('document_type', `investor_${investorIndex}_${docType}`);
            try {
              await dealAPI.uploadDocument(formData);
            } catch (uploadErr) {
              toast.error(`Failed to upload investor ${parseInt(investorIndex) + 1} ${docType} file ${file.name}: ` + (uploadErr?.response?.data?.error || 'Unknown error'));
              allUploadsSuccessful = false;
            }
          }
        }
      }

      if (allUploadsSuccessful) {
        toast.success('Deal created successfully!');
      } else {
        toast.error('Deal created, but some documents failed to upload.');
      }
      router.push('/dashboard');
    } catch (err) {
      toast.error('Failed to create deal: ' + (err?.response?.data?.error || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b border-slate-200 w-full">
        <Navbar user={user} onLogout={() => router.push('/login')} />
      </div>

      {/* Page Header */}
      <div className="w-full">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Create New Deal</h1>
                <p className="text-slate-600 mt-1">
                  Add a new property deal to the system
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 cursor-pointer transition-all duration-200"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="w-full h-full">
          <div className="w-full px-6 py-8 space-y-8">

            {/* Project & Land Details with Documents */}
            <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 pb-3 border-b border-slate-200">
                Project & Land Details with Documents
              </h2>
              
              {/* Basic Project Information */}
              <div className="mb-8">
                <h3 className="text-md font-medium text-slate-800 mb-4">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <Input label="Project Name" name="project_name" value={form.project_name} onChange={handleChange} required />
                  <Input label="Survey Number" name="survey_number" value={form.survey_number} onChange={handleChange} required />
                  {/* Location free-text removed: use structured State/District/Taluka/Village fields instead */}
                  
                  {/* State Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                    <select 
                      name="state" 
                      value={form.state} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" 
                      required
                      disabled={locationLoading.states}
                    >
                      <option value="">
                        {locationLoading.states ? 'Loading states...' : 'Select State'}
                      </option>
                      {locationData.states.map(state => (
                        <option key={state.id} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">District</label>
                    <select 
                      name="district" 
                      value={form.district} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500" 
                      required
                      disabled={!form.state || locationLoading.districts}
                    >
                      <option value="">
                        {locationLoading.districts ? 'Loading districts...' : 
                         !form.state ? 'Select state first' : 'Select District'}
                      </option>
                      {locationData.districts.map(district => (
                        <option key={district.id} value={district.name}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Taluka Text Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Taluka</label>
                    <input
                      type="text"
                      name="taluka"
                      value={form.taluka}
                      onChange={handleChange}
                      placeholder="Enter taluka name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Village Text Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Village</label>
                    <input
                      type="text"
                      name="village"
                      value={form.village}
                      onChange={handleChange}
                      placeholder="Enter village name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                      required
                    />
                  </div>
                  
                  {/* Total Area with Units */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Area</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        name="total_area" 
                        value={form.total_area} 
                        onChange={handleChange} 
                        placeholder="Enter area"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                      />
                      <select 
                        name="area_unit" 
                        value={form.area_unit} 
                        onChange={handleChange} 
                        className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      >
                        <option value="Acre">Acre</option>
                        <option value="Guntha">Guntha</option>
                        <option value="Hectare">Hectare</option>
                        <option value="Sq Ft">Sq Ft</option>
                        <option value="Sq Meter">Sq Meter</option>
                        <option value="Bigha">Bigha</option>
                        <option value="Katha">Katha</option>
                        <option value="Cent">Cent</option>
                      </select>
                    </div>
                  </div>

                  <Input type="date" label="Purchase Date" name="purchase_date" value={form.purchase_date} onChange={handleChange} required />
                  <Input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" label="Purchase Amount" name="purchase_amount" value={form.purchase_amount} onChange={handleChange} required />
                  <Input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" label="Selling Amount" name="selling_amount" value={form.selling_amount} onChange={handleChange} />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Land Documents Section */}
              <div>
                <h3 className="text-md font-medium text-slate-800 mb-4">Land Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* 7/12 Extract */}
                  <DocumentUploadField
                    title="7/12"
                    description="Revenue record showing ownership details"
                    documents={landDocuments.extract}
                    onChange={(e) => handleLandDocumentChange('extract', e)}
                    onRemove={(index) => removeLandDocument('extract', index)}
                  />

                  {/* Property Card */}
                  <DocumentUploadField
                    title="Property Card"
                    description="Official property ownership document"
                    documents={landDocuments.property_card}
                    onChange={(e) => handleLandDocumentChange('property_card', e)}
                    onRemove={(index) => removeLandDocument('property_card', index)}
                  />

                  {/* Survey Map */}
                  <DocumentUploadField
                    title="Survey Map"
                    description="Official land survey map"
                    documents={landDocuments.survey_map}
                    onChange={(e) => handleLandDocumentChange('survey_map', e)}
                    onRemove={(index) => removeLandDocument('survey_map', index)}
                  />

                  {/* Demarcation Certificate / Measurement Map */}
                  <DocumentUploadField
                    title="Demarcation Certificate"
                    description="Boundary measurement map"
                    documents={landDocuments.demarcation_certificate}
                    onChange={(e) => handleLandDocumentChange('demarcation_certificate', e)}
                    onRemove={(index) => removeLandDocument('demarcation_certificate', index)}
                  />

                  {/* Development Plan / Zoning Certificate */}
                  <DocumentUploadField
                    title="Development Plan / Zoning Certificate"
                    description="Land use type verification"
                    documents={landDocuments.development_plan}
                    onChange={(e) => handleLandDocumentChange('development_plan', e)}
                    onRemove={(index) => removeLandDocument('development_plan', index)}
                  />

                  {/* Encumbrance Certificate */}
                  <DocumentUploadField
                    title="Encumbrance Certificate"
                    description="Proof land is free from legal disputes"
                    documents={landDocuments.encumbrance_certificate}
                    onChange={(e) => handleLandDocumentChange('encumbrance_certificate', e)}
                    onRemove={(index) => removeLandDocument('encumbrance_certificate', index)}
                  />

                  {/* Additional Documents */}
                  <AdditionalDocsField
                    additionalDocs={landDocuments.additional_docs}
                    onAdd={addAdditionalDoc}
                    onRemove={removeAdditionalDoc}
                    onUpdateName={updateAdditionalDocName}
                    onUpdateFiles={updateAdditionalDocFiles}
                    onRemoveFile={removeAdditionalDocFile}
                  />

                </div>
              </div>
            </section>

            {/* Owners & Documents */}
            <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 pb-3 border-b border-slate-200">
                Owners & Documents
              </h2>
              
              {/* Individual Owners with their Documents */}
              <div className="space-y-8">
                {form.owners.map((owner, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    {/* Owner Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-md font-medium text-slate-800">
                        Owner {idx + 1} {owner.name && `- ${owner.name}`}
                      </h3>
                      {form.owners.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeOwnerWithType(idx)} 
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors px-3 py-1 rounded border border-red-300 hover:border-red-400"
                        >
                          Remove Owner
                        </button>
                      )}
                    </div>

                    {/* Owner Type Selection */}
                    <div className="mb-6 p-4 bg-white border border-slate-200 rounded-lg">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Owner Type</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            (ownerSelectionTypes[idx] || 'new') === 'new' 
                              ? 'border-slate-500 bg-slate-50' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => handleOwnerTypeChange(idx, 'new')}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={`ownerType-${idx}`}
                              value="new"
                              checked={(ownerSelectionTypes[idx] || 'new') === 'new'}
                              onChange={() => handleOwnerTypeChange(idx, 'new')}
                              className="mr-3 w-4 h-4 text-slate-600"
                            />
                            <div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-slate-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="font-medium text-slate-900">New Owner</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">Create a new owner profile</p>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            ownerSelectionTypes[idx] === 'existing' 
                              ? 'border-slate-500 bg-slate-50' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => handleOwnerTypeChange(idx, 'existing')}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={`ownerType-${idx}`}
                              value="existing"
                              checked={ownerSelectionTypes[idx] === 'existing'}
                              onChange={() => handleOwnerTypeChange(idx, 'existing')}
                              className="mr-3 w-4 h-4 text-slate-600"
                            />
                            <div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-slate-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                <span className="font-medium text-slate-900">Existing Owner</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">Select from {existingOwners.length} existing owners</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Existing Owner Dropdown */}
                      {ownerSelectionTypes[idx] === 'existing' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Existing Owner
                          </label>
                          <select
                            value={selectedExistingOwners[idx] || ''}
                            onChange={(e) => handleExistingOwnerSelect(idx, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Choose an existing owner</option>
                            {existingOwners.map((existingOwner) => (
                              <option key={existingOwner.id} value={existingOwner.id}>
                                {existingOwner.name} - {existingOwner.mobile || 'No mobile'} ({existingOwner.email || 'No email'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Owner Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Owner Information
                        {ownerSelectionTypes[idx] === 'existing' && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">(From Existing Owner)</span>
                        )}
                      </h4>
                      
                      {ownerSelectionTypes[idx] === 'existing' ? (
                        // Read-only view for existing owners
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Owner Name</label>
                            <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                              {owner.name || 'Not provided'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Mobile Number</label>
                            <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                              {owner.mobile || 'Not provided'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Email Address</label>
                            <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                              {owner.email || 'Not provided'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Aadhaar Card</label>
                            <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                              {owner.aadhar_card || 'Not provided'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">PAN Card</label>
                            <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                              {owner.pan_card || 'Not provided'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Editable form for new owners
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          <Input name="name" value={owner.name} onChange={(e) => handleArrayChange('owners', idx, e)} placeholder="Owner Name" required />
                          <Input 
                            name="mobile" 
                            type="tel" 
                            value={owner.mobile} 
                            onChange={(e) => handleArrayChange('owners', idx, e)} 
                            placeholder="Mobile Number" 
                            pattern="[0-9]{10}"
                            title="Enter 10-digit mobile number"
                            maxLength="10" 
                          />
                          <Input 
                            name="email" 
                            type="email" 
                            value={owner.email} 
                            onChange={(e) => handleArrayChange('owners', idx, e)} 
                            placeholder="Email Address"
                            pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                            title="Enter valid email address"
                          />
                          <Input 
                            name="aadhar_card" 
                            value={owner.aadhar_card} 
                            onChange={(e) => handleArrayChange('owners', idx, e)} 
                            placeholder="XXXX XXXX XXXX" 
                            pattern="[0-9]{4} [0-9]{4} [0-9]{4}"
                            title="Enter 12-digit Aadhaar number"
                            maxLength="14" 
                          />
                          <Input 
                            name="pan_card" 
                            value={owner.pan_card} 
                            onChange={(e) => handleArrayChange('owners', idx, e)} 
                            placeholder="ABCDE1234F" 
                            pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                            title="Enter valid PAN card number (5 letters, 4 digits, 1 letter)"
                            maxLength="10" 
                          />
                        </div>
                      )}
                    </div>

                    {/* Owner Documents */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Documents for {owner.name || `Owner ${idx + 1}`}
                        {ownerSelectionTypes[idx] === 'existing' && (
                          <span className="ml-2 text-xs text-blue-600">(Existing Owner)</span>
                        )}
                      </h4>
                      
                      {ownerSelectionTypes[idx] === 'existing' ? (
                        // Existing Owner Documents
                        <div>
                          {existingOwnerDocuments[idx] && Object.keys(existingOwnerDocuments[idx]).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              {Object.entries(existingOwnerDocuments[idx]).map(([docType, docs]) => (
                                <div key={docType} className="border rounded-lg p-3 bg-green-50">
                                  <h5 className="font-medium text-green-800 mb-2">
                                    {getDocumentDisplayName(docType)}
                                  </h5>
                                  <div className="space-y-2">
                                    {docs.map((doc, docIdx) => (
                                      <div key={docIdx} className="flex items-center justify-between text-sm">
                                        <span className="text-green-700 truncate">{doc.name}</span>
                                        <button
                                          type="button"
                                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded bg-blue-100"
                                          onClick={() => window.open(`http://localhost:5000/uploads/${doc.file_path}`, '_blank')}
                                        >
                                          View
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-slate-500 mb-4 p-3 bg-slate-50 rounded">
                              No documents found for this owner.
                            </div>
                          )}
                          
                          {/* Missing Documents for Existing Owner */}
                          {missingDocuments[idx] && Object.keys(missingDocuments[idx]).length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-orange-700 mb-3">Missing Documents</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(missingDocuments[idx]).map(([docType, isMissing]) => 
                                  isMissing && (
                                    <DocumentUploadField
                                      key={docType}
                                      title={getDocumentDisplayName(docType)}
                                      description={getDocumentDescription(docType)}
                                      documents={ownerDocuments[idx]?.[docType] || []}
                                      onChange={(e) => handleOwnerDocumentChange(idx, docType, e)}
                                      onRemove={(index) => removeOwnerDocument(idx, docType, index)}
                                    />
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // New Owner Documents
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          
                          {/* Identity Proof */}
                          <DocumentUploadField
                            title="Identity Proof"
                            description="Aadhaar, PAN, Passport, Voter ID"
                            documents={ownerDocuments[idx]?.identity_proof || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'identity_proof', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'identity_proof', index)}
                          />

                          {/* Address Proof */}
                          <DocumentUploadField
                            title="Address Proof"
                            description="Electricity Bill, Ration Card, etc."
                            documents={ownerDocuments[idx]?.address_proof || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'address_proof', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'address_proof', index)}
                          />

                          {/* Photograph */}
                          <DocumentUploadField
                            title="Photograph"
                            description="Scanned photo for record"
                            documents={ownerDocuments[idx]?.photograph || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'photograph', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'photograph', index)}
                          />

                          {/* Bank Account Details */}
                          <DocumentUploadField
                            title="Bank Account Details"
                            description="Cancelled cheque or passbook copy"
                            documents={ownerDocuments[idx]?.bank_details || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'bank_details', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'bank_details', index)}
                          />

                          {/* Power of Attorney */}
                          <DocumentUploadField
                            title="Power of Attorney"
                            description="If someone else is signing on behalf"
                            documents={ownerDocuments[idx]?.power_of_attorney || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'power_of_attorney', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'power_of_attorney', index)}
                          />

                          {/* Past Sale Deeds */}
                          <DocumentUploadField
                            title="Past Sale Deeds"
                            description="Previous ownership records"
                            documents={ownerDocuments[idx]?.past_sale_deeds || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'past_sale_deeds', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'past_sale_deeds', index)}
                          />

                          {/* NOC from Co-owners */}
                          <DocumentUploadField
                            title="NOC from Co-owners"
                            description="Family members NOC (joint family property)"
                            documents={ownerDocuments[idx]?.noc_co_owners || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'noc_co_owners', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'noc_co_owners', index)}
                          />

                          {/* NOC from Society/Gram Panchayat */}
                          <DocumentUploadField
                            title="NOC from Society/Gram Panchayat"
                            description="If applicable"
                            documents={ownerDocuments[idx]?.noc_society || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'noc_society', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'noc_society', index)}
                          />

                          {/* Affidavit No Legal Dispute */}
                          <DocumentUploadField
                            title="Affidavit - No Legal Dispute"
                            description="Declaration of no legal dispute"
                            documents={ownerDocuments[idx]?.affidavit_no_dispute || []}
                            onChange={(e) => handleOwnerDocumentChange(idx, 'affidavit_no_dispute', e)}
                            onRemove={(index) => removeOwnerDocument(idx, 'affidavit_no_dispute', index)}
                          />

                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Owner Button - Moved to Bottom */}
                <button 
                  type="button" 
                  onClick={() => addOwnerWithType()} 
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 font-medium transition-colors"
                >
                  + Add Owner
                </button>
              </div>
            </section>

            {/* Investors */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                Investors & Documents
              </h2>
              
              {/* Individual Investors with their Documents */}
              <div className="space-y-8">
                {form.investors.map((investor, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    {/* Investor Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-md font-medium text-gray-800">
                        Investor {idx + 1} {investor.investor_name && `- ${investor.investor_name}`}
                      </h3>
                      {form.investors.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeInvestorWithType(idx)} 
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors px-3 py-1 rounded border border-red-300 hover:border-red-400"
                        >
                          Remove Investor
                        </button>
                      )}
                    </div>

                    {/* Investor Type Selection */}
                    <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Investor Type</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            (investorSelectionTypes[idx] || 'new') === 'new' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleInvestorTypeChange(idx, 'new')}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={`investorType-${idx}`}
                              value="new"
                              checked={(investorSelectionTypes[idx] || 'new') === 'new'}
                              onChange={() => handleInvestorTypeChange(idx, 'new')}
                              className="mr-3 w-4 h-4 text-blue-600"
                            />
                            <div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="font-medium text-gray-900">New Investor</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">Create a new investor profile</p>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            investorSelectionTypes[idx] === 'existing' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleInvestorTypeChange(idx, 'existing')}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={`investorType-${idx}`}
                              value="existing"
                              checked={investorSelectionTypes[idx] === 'existing'}
                              onChange={() => handleInvestorTypeChange(idx, 'existing')}
                              className="mr-3 w-4 h-4 text-blue-600"
                            />
                            <div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="font-medium text-gray-900">Existing Investor</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">Select from {existingInvestors.length} existing investors</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Existing Investor Dropdown */}
                      {investorSelectionTypes[idx] === 'existing' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Existing Investor
                          </label>
                          <select
                            value={selectedExistingInvestors[idx] || ''}
                            onChange={(e) => handleExistingInvestorSelect(idx, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Choose an existing investor</option>
                            {existingInvestors.map((existingInvestor) => (
                              <option key={existingInvestor.id} value={existingInvestor.id}>
                                {existingInvestor.investor_name} - {existingInvestor.mobile || 'No mobile'} ({existingInvestor.email || 'No email'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Investor Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Investor Information
                        {investorSelectionTypes[idx] === 'existing' && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">(From Existing Investor)</span>
                        )}
                      </h4>
                      
                      {investorSelectionTypes[idx] === 'existing' ? (
                        // Read-only view for existing investors
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Investor Name</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-800">
                              {investor.investor_name || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Investment Amount</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-800">
                              {investor.investment_amount || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Investment %</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-800">
                              {investor.investment_percentage || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mobile</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-800">
                              {investor.mobile || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-800">
                              {investor.email || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Aadhaar Card</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-800">
                              {investor.aadhar_card || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">PAN Card</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-800">
                              {investor.pan_card || 'Not specified'}
                            </div>
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                            <div className="p-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-800">
                              {investor.address || 'Not specified'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Editable form for new investors
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Investor Name *</label>
                            <input
                              type="text"
                              name="investor_name"
                              value={investor.investor_name}
                              onChange={(e) => handleArrayChange('investors', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter investor name"
                              required
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Investment Amount</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              name="investment_amount"
                              value={investor.investment_amount}
                              onChange={(e) => handleArrayChange('investors', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Amount"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Investment %</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              name="investment_percentage"
                              value={investor.investment_percentage}
                              onChange={(e) => handleArrayChange('investors', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Share %"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mobile</label>
                            <input
                              type="tel"
                              name="mobile"
                              value={investor.mobile}
                              onChange={(e) => handleArrayChange('investors', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="10-digit mobile number"
                              pattern="[0-9]{10}"
                              maxLength="10"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                            <input
                              type="email"
                              name="email"
                              value={investor.email}
                              onChange={(e) => handleArrayChange('investors', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Email address"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Aadhaar Card</label>
                            <input
                              type="text"
                              name="aadhar_card"
                              value={investor.aadhar_card}
                              onChange={(e) => handleArrayChange('investors', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="XXXX XXXX XXXX"
                              pattern="[0-9]{4} [0-9]{4} [0-9]{4}"
                              maxLength="14"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">PAN Card</label>
                            <input
                              type="text"
                              name="pan_card"
                              value={investor.pan_card}
                              onChange={(e) => handleArrayChange('investors', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="ABCDE1234F"
                              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                              maxLength="10"
                            />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                            <input
                              type="text"
                              name="address"
                              value={investor.address}
                              onChange={(e) => handleArrayChange('investors', idx, e)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Address"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Investor Documents */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">
                        Investor Documents
                        {investorSelectionTypes[idx] === 'existing' && (
                          <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">(Existing + Missing)</span>
                        )}
                      </h4>
                      
                      {investorSelectionTypes[idx] === 'existing' && selectedExistingInvestors[idx] ? (
                        <div>
                          {/* Existing Investor Documents Display */}
                          {existingInvestorDocuments[idx] && Object.keys(existingInvestorDocuments[idx]).length > 0 ? (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-green-700 mb-3">Existing Documents</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(existingInvestorDocuments[idx]).map(([docType, docs]) => (
                                  <div key={docType} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                    <h6 className="font-medium text-green-800 capitalize mb-2">
                                      {getInvestorDocumentDisplayName(docType)}
                                    </h6>
                                    <div className="space-y-1">
                                      {docs.map((doc, docIdx) => (
                                        <div key={docIdx} className="text-sm text-green-700 truncate">
                                          📄 {doc.filename || doc.file_path?.split('/').pop()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500 mb-4 p-3 bg-slate-50 rounded">
                              No documents found for this investor.
                            </div>
                          )}
                          
                          {/* Missing Documents for Existing Investor */}
                          {investorMissingDocuments[idx] && Object.keys(investorMissingDocuments[idx]).length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-orange-700 mb-3">Missing Documents</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(investorMissingDocuments[idx]).map(([docType, isMissing]) => 
                                  isMissing && (
                                    <DocumentUploadField
                                      key={docType}
                                      title={getInvestorDocumentDisplayName(docType)}
                                      description={getInvestorDocumentDescription(docType)}
                                      documents={investorDocuments[idx]?.[docType] || []}
                                      onChange={(e) => handleInvestorDocumentChange(idx, docType, e)}
                                      onRemove={(index) => removeInvestorDocument(idx, docType, index)}
                                    />
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // New Investor Documents
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          
                          {/* Investor KYC: Aadhaar, PAN, Passport/Voter ID */}
                          <DocumentUploadField
                            title="Investor KYC"
                            description="Aadhaar, PAN, Passport/Voter ID"
                            documents={investorDocuments[idx]?.identity_proof || []}
                            onChange={(e) => handleInvestorDocumentChange(idx, 'identity_proof', e)}
                            onRemove={(index) => removeInvestorDocument(idx, 'identity_proof', index)}
                          />

                          {/* Photograph */}
                          <DocumentUploadField
                            title="Photograph"
                            description="Scanned photo for record"
                            documents={investorDocuments[idx]?.photograph || []}
                            onChange={(e) => handleInvestorDocumentChange(idx, 'photograph', e)}
                            onRemove={(index) => removeInvestorDocument(idx, 'photograph', index)}
                          />

                          {/* Bank Account Details */}
                          <DocumentUploadField
                            title="Bank Account Details"
                            description="Cheque/passbook copy"
                            documents={investorDocuments[idx]?.bank_details || []}
                            onChange={(e) => handleInvestorDocumentChange(idx, 'bank_details', e)}
                            onRemove={(index) => removeInvestorDocument(idx, 'bank_details', index)}
                          />

                          {/* Capital Commitment Agreement */}
                          <DocumentUploadField
                            title="Capital Commitment Agreement"
                            description="How much %/₹ invested"
                            documents={investorDocuments[idx]?.investment_agreement || []}
                            onChange={(e) => handleInvestorDocumentChange(idx, 'investment_agreement', e)}
                            onRemove={(index) => removeInvestorDocument(idx, 'investment_agreement', index)}
                          />

                          {/* Actual Contribution Records */}
                          <DocumentUploadField
                            title="Actual Contribution Records"
                            description="Transaction proof"
                            documents={investorDocuments[idx]?.financial_proof || []}
                            onChange={(e) => handleInvestorDocumentChange(idx, 'financial_proof', e)}
                            onRemove={(index) => removeInvestorDocument(idx, 'financial_proof', index)}
                          />

                          {/* Partnership/Joint Venture Agreement */}
                          <DocumentUploadField
                            title="Partnership/Joint Venture Agreement"
                            description="Signed by all investors"
                            documents={investorDocuments[idx]?.partnership_agreement || []}
                            onChange={(e) => handleInvestorDocumentChange(idx, 'partnership_agreement', e)}
                            onRemove={(index) => removeInvestorDocument(idx, 'partnership_agreement', index)}
                          />

                          {/* Loan Agreement */}
                          <DocumentUploadField
                            title="Loan Agreement"
                            description="If investor money is borrowed"
                            documents={investorDocuments[idx]?.loan_agreement || []}
                            onChange={(e) => handleInvestorDocumentChange(idx, 'loan_agreement', e)}
                            onRemove={(index) => removeInvestorDocument(idx, 'loan_agreement', index)}
                          />

                          {/* Power of Attorney */}
                          <DocumentUploadField
                            title="Power of Attorney"
                            description="Optional, if investor authorizes manager"
                            documents={investorDocuments[idx]?.power_of_attorney || []}
                            onChange={(e) => handleInvestorDocumentChange(idx, 'power_of_attorney', e)}
                            onRemove={(index) => removeInvestorDocument(idx, 'power_of_attorney', index)}
                          />

                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Investor Button - Moved to Bottom */}
                <div className="flex justify-center pt-4">
                  <button 
                    type="button" 
                    onClick={addInvestorWithType}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors px-4 py-2 border border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50"
                  >
                    + Add Investor
                  </button>
                </div>
              </div>
            </section>

            {/* Expenses */}
            <DynamicSection
              title="Expenses"
              items={form.expenses}
              onAdd={() => addArrayItem('expenses', { expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' })}
              onRemove={(idx) => removeArrayItem('expenses', idx)}
              render={(exp, idx) => (
                <>
                  <Input name="expense_type" value={exp.expense_type} onChange={(e) => handleArrayChange('expenses', idx, e)} placeholder="Type (Survey, Legal...)" required />
                  <Input name="expense_description" value={exp.expense_description} onChange={(e) => handleArrayChange('expenses', idx, e)} placeholder="Description" />
                  <Input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" name="amount" value={exp.amount} onChange={(e) => handleArrayChange('expenses', idx, e)} placeholder="Amount" required />
                  <Input name="paid_by" value={exp.paid_by} onChange={(e) => handleArrayChange('expenses', idx, e)} placeholder="Paid By (Investor ID)" />
                  <Input type="date" name="expense_date" value={exp.expense_date} onChange={(e) => handleArrayChange('expenses', idx, e)} />
                  <Input name="receipt_number" value={exp.receipt_number} onChange={(e) => handleArrayChange('expenses', idx, e)} placeholder="Receipt Number" />
                </>
              )}
            />

            {/* Buyers */}
            <DynamicSection
              title="Buyers"
              items={form.buyers}
              onAdd={() => addArrayItem('buyers', { name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' })}
              onRemove={(idx) => removeArrayItem('buyers', idx)}
              render={(buyer, idx) => (
                <>
                  <Input name="name" value={buyer.name} onChange={(e) => handleArrayChange('buyers', idx, e)} placeholder="Buyer Name" required />
                  <Input 
                    name="mobile" 
                    type="tel" 
                    value={buyer.mobile} 
                    onChange={(e) => handleArrayChange('buyers', idx, e)} 
                    placeholder="Mobile Number" 
                    pattern="[0-9]{10}"
                    title="Enter 10-digit mobile number"
                    maxLength="10" 
                  />
                  <Input 
                    name="email" 
                    type="email" 
                    value={buyer.email} 
                    onChange={(e) => handleArrayChange('buyers', idx, e)} 
                    placeholder="Email Address"
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                    title="Enter valid email address"
                  />
                  <Input 
                    name="aadhar_card" 
                    value={buyer.aadhar_card} 
                    onChange={(e) => handleArrayChange('buyers', idx, e)} 
                    placeholder="XXXX XXXX XXXX" 
                    pattern="[0-9]{4} [0-9]{4} [0-9]{4}"
                    title="Enter 12-digit Aadhaar number"
                    maxLength="14" 
                  />
                  <Input 
                    name="pan_card" 
                    value={buyer.pan_card} 
                    onChange={(e) => handleArrayChange('buyers', idx, e)} 
                    placeholder="ABCDE1234F" 
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    title="Enter valid PAN card number (5 letters, 4 digits, 1 letter)"
                    maxLength="10" 
                  />
                </>
              )}
            />

            {/* Documents */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                Upload Documents
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
                <p className="mt-2 text-sm text-gray-500">Select multiple files to upload</p>
                {files.length > 0 && (
                  <div className="mt-4 text-left">
                    <p className="text-sm font-medium text-gray-700 mb-2">Selected files:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {files.map((file, idx) => (
                        <li key={idx} className="truncate">• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* Submit Button Section - Consistent with Dashboard */}
          <div className="bg-white border-t border-slate-200 px-6 py-4">
            <div className="max-w-md mx-auto flex space-x-4">
              <button 
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-white text-slate-700 px-6 py-3 rounded-md border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Minimal UI helper components ----
function Input({ label, pattern, title, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <input 
        {...props} 
        pattern={pattern}
        title={title}
        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors" 
      />
    </div>
  );
}

function DynamicSection({ title, items, onAdd, onRemove, render }) {
  return (
    <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-6 pb-3 border-b border-slate-200">
        {title}
      </h2>
      <div className="space-y-6">
        {items.map((item, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
              {render(item, idx)}
            </div>
            {items.length > 1 && (
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => onRemove(idx)} 
                  className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors px-3 py-1 rounded border border-red-300 hover:border-red-400"
                >
                  Remove {title.slice(0, -1)}
                </button>
              </div>
            )}
          </div>
        ))}
        <button 
          type="button" 
          onClick={onAdd} 
          className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-slate-600 hover:border-slate-400 hover:text-slate-700 font-medium transition-colors"
        >
          + Add {title.slice(0, -1)}
        </button>
      </div>
    </section>
  );
}

function AdditionalDocsField({ additionalDocs, onAdd, onRemove, onUpdateName, onUpdateFiles, onRemoveFile }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Additional Documents</h3>
        <p className="text-xs text-slate-600">Add custom named documents (up to 5)</p>
      </div>
      
      <div className="space-y-4">
        {additionalDocs.map((doc, docIndex) => (
          <div key={docIndex} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 mr-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => onUpdateName(docIndex, e.target.value)}
                  placeholder="e.g., NOC Certificate, Power of Attorney"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  required
                />
              </div>
              {additionalDocs.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(docIndex)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove document"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* File Upload Section - Always visible */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  multiple
                  onChange={(e) => onUpdateFiles(docIndex, e.target.files)}
                  className="hidden"
                  id={`additional-upload-${docIndex}`}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <label
                  htmlFor={`additional-upload-${docIndex}`}
                  className="w-full bg-slate-100 border border-slate-300 text-slate-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {doc.name ? `Upload Files for ${doc.name}` : 'Upload Files'}
                </label>
              </div>

              {/* Uploaded Files List */}
              {doc.files.length > 0 && (
                <div className="space-y-2">
                  {doc.files.map((file, fileIndex) => (
                    <div key={fileIndex} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs text-slate-700 truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveFile(docIndex, fileIndex)}
                        className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File Count */}
              {doc.files.length > 0 && (
                <p className="text-xs text-slate-500">
                  {doc.files.length} file{doc.files.length !== 1 ? 's' : ''} selected{doc.name ? ` for ${doc.name}` : ''}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Add More Documents Button */}
        {additionalDocs.length < 5 && (
          <button
            type="button"
            onClick={onAdd}
            className="w-full border-2 border-dashed border-slate-300 rounded-lg p-3 text-slate-600 hover:border-slate-400 hover:text-slate-700 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Another Document ({additionalDocs.length}/5)
          </button>
        )}

        {additionalDocs.length >= 5 && (
          <p className="text-xs text-slate-500 text-center italic">
            Maximum 5 additional documents allowed
          </p>
        )}
      </div>
    </div>
  );
}

function DocumentUploadField({ title, description, documents, onChange, onRemove }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
      
      <div className="space-y-3">
        {/* Upload Button */}
        <div className="relative">
          <input
            type="file"
            multiple
            onChange={onChange}
            className="hidden"
            id={`upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <label
            htmlFor={`upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="w-full bg-slate-100 border border-slate-300 text-slate-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Files
          </label>
        </div>

        {/* Uploaded Files List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white border border-slate-200 rounded px-3 py-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-slate-700 truncate" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File Count */}
        {documents.length > 0 && (
          <p className="text-xs text-slate-500">
            {documents.length} file{documents.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
    </div>
  );
}
