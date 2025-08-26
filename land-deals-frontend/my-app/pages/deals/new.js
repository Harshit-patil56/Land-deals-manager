// --- All imports remain untouched ---
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { dealAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import toast from 'react-hot-toast';
import * as locationAPI from '../../lib/locationAPI';

export default function NewDeal() {
  // --- Logic & state unchanged ---
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    project_name: '',
    survey_number: '',
    location: '',
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
    investors: [{ investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
    expenses: [{ expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' }],
    payment_mode: '',
    mutation_done: false,
    buyers: [{ name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' }],
    profit_allocation: '',
    documents: [],
  });
  const [files, setFiles] = useState([]);
  const [landDocuments, setLandDocuments] = useState({
    extract: [],
    property_card: [],
    mutation_records: [],
    survey_map: [],
    demarcation_certificate: [],
    development_plan: [],
    encumbrance_certificate: [],
    additional_docs: [
      { name: '', files: [] }
    ]
  });
  const [ownerDocuments, setOwnerDocuments] = useState({});
  
  // Initialize owner documents when owners array changes
  useEffect(() => {
    const newOwnerDocuments = {};
    form.owners.forEach((_, index) => {
      if (!ownerDocuments[index]) {
        newOwnerDocuments[index] = {
          identity_proof: [],
          address_proof: [],
          photograph: [],
          bank_details: [],
          power_of_attorney: [],
          past_sale_deeds: [],
          noc_co_owners: [],
          noc_society: [],
          affidavit_no_dispute: []
        };
      } else {
        newOwnerDocuments[index] = ownerDocuments[index];
      }
    });
    setOwnerDocuments(newOwnerDocuments);
  }, [form.owners.length]);
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
  }, []);

  // Location loading functions
  const loadStates = async () => {
    setLocationLoading(prev => ({ ...prev, states: true }));
    try {
      const states = await locationAPI.fetchStates();
      setLocationData(prev => ({ ...prev, states }));
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to load talukas');
    } finally {
      setLocationLoading(prev => ({ ...prev, talukas: false }));
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-2xl">Loading...</p>
      </div>
    );
  }
  
  if (!user || (user.role !== 'auditor' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-2xl font-medium">Only admin or auditor can create new deals.</p>
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
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      {/* Minimal Header with Back Button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create New Deal</h1>
              <p className="text-sm text-gray-600 mt-1">Fill in the details below</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="w-full h-full">
          <div className="max-w-none px-6 py-8 space-y-8">

            {/* Project & Land Details with Documents */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                Project & Land Details with Documents
              </h2>
              
              {/* Basic Project Information */}
              <div className="mb-8">
                <h3 className="text-md font-medium text-gray-800 mb-4">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <Input label="Project Name" name="project_name" value={form.project_name} onChange={handleChange} required />
                  <Input label="Survey Number" name="survey_number" value={form.survey_number} onChange={handleChange} required />
                  <Input label="Location" name="location" value={form.location} onChange={handleChange} required />
                  
                  {/* State Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <select 
                      name="state" 
                      value={form.state} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                    <select 
                      name="district" 
                      value={form.district} 
                      onChange={handleChange} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Taluka</label>
                    <input
                      type="text"
                      name="taluka"
                      value={form.taluka}
                      onChange={handleChange}
                      placeholder="Enter taluka name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Village Text Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Village</label>
                    <input
                      type="text"
                      name="village"
                      value={form.village}
                      onChange={handleChange}
                      placeholder="Enter village name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <select 
                        name="area_unit" 
                        value={form.area_unit} 
                        onChange={handleChange} 
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Land Documents Section */}
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-4">Land Documents</h3>
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

                  {/* Mutation Records */}
                  <DocumentUploadField
                    title="Mutation Records"
                    description="Property transfer records"
                    documents={landDocuments.mutation_records}
                    onChange={(e) => handleLandDocumentChange('mutation_records', e)}
                    onRemove={(index) => removeLandDocument('mutation_records', index)}
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
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                Owners & Documents
              </h2>
              
              {/* Individual Owners with their Documents */}
              <div className="space-y-8">
                {form.owners.map((owner, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    {/* Owner Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-md font-medium text-gray-800">
                        Owner {idx + 1} {owner.name && `- ${owner.name}`}
                      </h3>
                      {form.owners.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeArrayItem('owners', idx)} 
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors px-3 py-1 rounded border border-red-300 hover:border-red-400"
                        >
                          Remove Owner
                        </button>
                      )}
                    </div>

                    {/* Owner Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Owner Information</h4>
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
                    </div>

                    {/* Owner Documents */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Documents for {owner.name || `Owner ${idx + 1}`}</h4>
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
                    </div>
                  </div>
                ))}

                {/* Add Owner Button - Moved to Bottom */}
                <button 
                  type="button" 
                  onClick={() => addArrayItem('owners', { name: '', mobile: '', email: '', aadhar_card: '', pan_card: '' })} 
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 font-medium transition-colors"
                >
                  + Add Owner
                </button>
              </div>
            </section>

            {/* Investors */}
            <DynamicSection
              title="Investors"
              items={form.investors}
              onAdd={() => addArrayItem('investors', { investor_name: '', investment_amount: '', investment_percentage: '', mobile: '', email: '', aadhar_card: '', pan_card: '' })}
              onRemove={(idx) => removeArrayItem('investors', idx)}
              render={(inv, idx) => (
                <>
                  <Input name="investor_name" value={inv.investor_name} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Investor Name" required />
                  <Input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" name="investment_amount" value={inv.investment_amount} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Amount" required />
                  <Input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" name="investment_percentage" value={inv.investment_percentage} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Share (%)" required />
                  <Input 
                    name="mobile" 
                    type="tel" 
                    value={inv.mobile} 
                    onChange={(e) => handleArrayChange('investors', idx, e)} 
                    placeholder="Mobile Number" 
                    pattern="[0-9]{10}"
                    title="Enter 10-digit mobile number"
                    maxLength="10" 
                  />
                  <Input 
                    name="email" 
                    type="email" 
                    value={inv.email} 
                    onChange={(e) => handleArrayChange('investors', idx, e)} 
                    placeholder="Email Address"
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                    title="Enter valid email address"
                  />
                  <Input 
                    name="aadhar_card" 
                    value={inv.aadhar_card} 
                    onChange={(e) => handleArrayChange('investors', idx, e)} 
                    placeholder="XXXX XXXX XXXX" 
                    pattern="[0-9]{4} [0-9]{4} [0-9]{4}"
                    title="Enter 12-digit Aadhaar number"
                    maxLength="14" 
                  />
                  <Input 
                    name="pan_card" 
                    value={inv.pan_card} 
                    onChange={(e) => handleArrayChange('investors', idx, e)} 
                    placeholder="ABCDE1234F" 
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    title="Enter valid PAN card number (5 letters, 4 digits, 1 letter)"
                    maxLength="10" 
                  />
                </>
              )}
            />

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

            {/* Payment & Mutation */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                Payment & Mutation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Input label="Payment Mode" name="payment_mode" value={form.payment_mode} onChange={handleChange} placeholder="Bank, Cash, Cheque, Card" />
                <div className="flex items-center pt-6">
                  <input 
                    type="checkbox" 
                    name="mutation_done" 
                    checked={form.mutation_done} 
                    onChange={handleChange} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3" 
                  />
                  <label className="text-sm font-medium text-gray-700">Mutation Done</label>
                </div>
              </div>
            </section>

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

            {/* Profit Allocation */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                Profit Allocation
              </h2>
              <Input name="profit_allocation" value={form.profit_allocation} onChange={handleChange} placeholder="Describe how profit is distributed" />
            </section>

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

          {/* Minimal Fixed Submit Button */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="max-w-md mx-auto flex space-x-4">
              <button 
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
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
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <input 
        {...props} 
        pattern={pattern}
        title={title}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
      />
    </div>
  );
}

function DynamicSection({ title, items, onAdd, onRemove, render }) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
        {title}
      </h2>
      <div className="space-y-6">
        {items.map((item, idx) => (
          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
              {render(item, idx)}
            </div>
            {items.length > 1 && (
              <div className="flex justify-end pt-4 border-t border-gray-200">
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
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 font-medium transition-colors"
        >
          + Add {title.slice(0, -1)}
        </button>
      </div>
    </section>
  );
}

function AdditionalDocsField({ additionalDocs, onAdd, onRemove, onUpdateName, onUpdateFiles, onRemoveFile }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Additional Documents</h3>
        <p className="text-xs text-gray-600">Add custom named documents (up to 5)</p>
      </div>
      
      <div className="space-y-4">
        {additionalDocs.map((doc, docIndex) => (
          <div key={docIndex} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 mr-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => onUpdateName(docIndex, e.target.value)}
                  placeholder="e.g., NOC Certificate, Power of Attorney"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
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
                    <div key={fileIndex} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs text-gray-700 truncate" title={file.name}>
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
                <p className="text-xs text-gray-500">
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
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-600 hover:border-gray-400 hover:text-gray-700 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Another Document ({additionalDocs.length}/5)
          </button>
        )}

        {additionalDocs.length >= 5 && (
          <p className="text-xs text-gray-500 text-center italic">
            Maximum 5 additional documents allowed
          </p>
        )}
      </div>
    </div>
  );
}

function DocumentUploadField({ title, description, documents, onChange, onRemove }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-600">{description}</p>
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
            className="w-full bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
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
              <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-gray-700 truncate" title={file.name}>
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
          <p className="text-xs text-gray-500">
            {documents.length} file{documents.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
    </div>
  );
}
