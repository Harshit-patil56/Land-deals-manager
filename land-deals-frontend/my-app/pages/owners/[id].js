import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUser, logout } from '../../lib/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/layout/Navbar';

export default function OwnerDetail() {
  const [owner, setOwner] = useState(null);
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    
    if (id) {
      fetchOwnerDetails();
    }
  }, [id]);

  const fetchOwnerDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owners/${id}`);
      setOwner(response.data.owner);
      setProjects(response.data.projects);
      
      // Ensure documents is an array
      const documentsArray = Array.isArray(response.data.documents) 
        ? response.data.documents 
        : Object.values(response.data.documents || {}).flat();
      
      setDocuments(documentsArray);
    } catch (error) {
      console.error('Error fetching owner details:', error);
      if (error.response?.status === 404) {
        toast.error('Owner not found');
        router.push('/owners');
      } else {
        toast.error('Failed to fetch owner details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !documentType) {
      toast.error('Please select a file and document type');
      return;
    }

    try {
      setUploadingDocument(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      
      await api.post(`/owners/${id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSelectedFile(null);
      setDocumentType('');
      toast.success('Document uploaded successfully');
      fetchOwnerDetails(); // Refresh data
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const shareOwnerInfo = async () => {
    const shareData = {
      title: `${owner.name} - Property Owner Details`,
      text: `Owner: ${owner.name}\nProjects: ${projects.length}\nTotal Investment: ₹${projects.reduce((sum, p) => sum + (p.purchase_amount || 0), 0).toLocaleString('en-IN')}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
        toast.success('Owner details link copied to clipboard!');
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.success('Owner details link copied to clipboard!');
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      return (
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (extension === 'pdf') {
      return (
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Owner Details</h3>
          <p className="text-slate-600">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b border-slate-200">
          <Navbar user={user} onLogout={handleLogout} />
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-lg mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Owner Not Found</h2>
            <p className="text-slate-600 mb-8">The requested owner could not be found or may have been removed.</p>
            <Link href="/owners">
              <span className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all duration-200 cursor-pointer">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Owners
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalInvestment = projects.reduce((sum, project) => sum + (project.purchase_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/owners">
                <span className="mr-4 p-2 hover:bg-slate-200 rounded-lg transition-colors duration-200 cursor-pointer">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </span>
              </Link>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{owner.name}</h1>
                <p className="text-slate-600 mt-1">Property Owner Details & Portfolio</p>
              </div>
            </div>
            <button
              onClick={shareOwnerInfo}
              className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share Details
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Owner Info & Upload */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Owner Information Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Owner Information
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mr-4">
                    <span className="text-slate-700 font-bold text-xl">
                      {owner.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{owner.name}</h3>
                    <p className="text-sm text-slate-600">Property Owner</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {owner.mobile && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mobile</p>
                        <p className="text-sm font-medium text-slate-900">{owner.mobile}</p>
                      </div>
                    </div>
                  )}
                  
                  {owner.email && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</p>
                        <p className="text-sm font-medium text-slate-900">{owner.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {owner.aadhar_card && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Aadhar Card</p>
                        <p className="text-sm font-medium text-slate-900">{owner.aadhar_card}</p>
                      </div>
                    </div>
                  )}
                  
                  {owner.pan_card && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">PAN Card</p>
                        <p className="text-sm font-medium text-slate-900">{owner.pan_card}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Portfolio Statistics
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="text-center p-6 bg-emerald-50 rounded-lg border border-emerald-200">
                    <svg className="w-8 h-8 text-emerald-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-3xl font-bold text-emerald-600">{projects.length}</p>
                    <p className="text-sm text-slate-600 mt-1">Properties Owned</p>
                  </div>
                  <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <svg className="w-8 h-8 text-blue-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <p className="text-3xl font-bold text-blue-600">₹{totalInvestment.toLocaleString('en-IN')}</p>
                    <p className="text-sm text-slate-600 mt-1">Total Investment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Upload Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Document
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Document Type
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white text-slate-900"
                      required
                    >
                      <option value="">Select document type</option>
                      <option value="id_proof">ID Proof</option>
                      <option value="address_proof">Address Proof</option>
                      <option value="photo">Photograph</option>
                      <option value="signature">Signature</option>
                      <option value="bank_details">Bank Details</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Choose File
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white text-slate-900"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={uploadingDocument || !selectedFile || !documentType}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center"
                  >
                    {uploadingDocument ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Uploading Document...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Document
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Content - Properties & Documents */}
          <div className="xl:col-span-3 space-y-8">
            
            {/* Owned Properties */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Owned Properties</h2>
                      <p className="text-sm text-slate-600 mt-1">Complete list of properties owned by {owner.name}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">
                    {projects.length} properties
                  </span>
                </div>
              </div>
              
              {projects.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="mx-auto h-16 w-16 text-slate-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">No Properties Found</h3>
                  <p className="text-slate-600 max-w-md mx-auto">This owner doesn't have any properties registered in the system yet. Properties will appear here once they are added.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {projects.map((project) => (
                    <div key={project.id} className="p-6 hover:bg-slate-50 transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 mb-3">{project.project_name}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center text-slate-600">
                              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{[project.district, project.taluka, project.village].filter(Boolean).join(', ') || 'Location not specified'}</span>
                            </div>
                            <div className="flex items-center text-slate-600">
                              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2 2 4-4" />
                              </svg>
                              <span>{project.purchase_date ? new Date(project.purchase_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'Date not available'}</span>
                            </div>
                            <div className="flex items-center text-slate-600">
                              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a1 1 0 011-1h4m0 0V1m0 2h4a1 1 0 011 1v4M9 9v10a1 1 0 001 1h4a1 1 0 001-1V9" />
                              </svg>
                              <span>{project.total_area ? `${project.total_area} ${project.area_unit || 'sq ft'}` : 'Area not specified'}</span>
                            </div>
                            <div className="flex items-center text-slate-600">
                              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Survey: {project.survey_number || 'Not available'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-6 text-right space-y-3">
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">
                              ₹{(project.purchase_amount || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-sm text-slate-500">Purchase Amount</p>
                          </div>
                          <Link href={`/deals/${project.id}`}>
                            <span className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 cursor-pointer text-sm font-medium">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Details
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-slate-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Uploaded Documents</h2>
                      <p className="text-sm text-slate-600 mt-1">All documents uploaded for this owner</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">
                    {documents.length} documents
                  </span>
                </div>
              </div>
              
              {documents.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="mx-auto h-16 w-16 text-slate-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">No Documents Uploaded</h3>
                  <p className="text-slate-600 max-w-md mx-auto">Upload documents using the form in the sidebar to keep track of important files for this owner.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {documents.map((document) => (
                    <div key={document.id} className="p-6 hover:bg-slate-50 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-4 p-2 bg-slate-100 rounded-lg">
                            {getFileIcon(document.document_name)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{document.document_name}</h4>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                              <span className="capitalize bg-slate-100 px-2 py-1 rounded text-xs font-medium">
                                {document.document_type?.replace('_', ' ') || 'Unknown Type'}
                              </span>
                              <span>{new Date(document.uploaded_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}</span>
                              <span>{Math.round(document.file_size / 1024)} KB</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`http://localhost:5000/uploads/${document.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-all duration-200"
                            title="View Document"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <a
                            href={`http://localhost:5000/uploads/${document.file_path}`}
                            download
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                            title="Download Document"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
