// pages/deals/[id].js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { dealAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function DealDetails() {
  const router = useRouter()
  const { id } = router.query
  const [deal, setDeal] = useState(null)
  const [investors, setInvestors] = useState([])
  const [expenses, setExpenses] = useState([])
  const [documents, setDocuments] = useState([])
  const [owners, setOwners] = useState([])
  const [buyers, setBuyers] = useState([])
  const [paymentMode, setPaymentMode] = useState('')
  const [mutationDone, setMutationDone] = useState(false)
  const [profitAllocation, setProfitAllocation] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetchDeal = async () => {
      try {
        const response = await dealAPI.getById(id)
        const data = response.data
        setDeal(data.deal || data)
        setInvestors(data.investors || [])
        setExpenses(data.expenses || [])
        setDocuments(data.documents || [])
        setOwners(data.owners || [])
        setBuyers(data.buyers || [])
        setPaymentMode(data.deal?.payment_mode || '')
        setMutationDone(data.deal?.mutation_done || false)
        setProfitAllocation(data.deal?.profit_allocation || '')
        setStatus(data.deal?.status || '')
      } catch (error) {
        toast.error('Failed to fetch deal details')
      } finally {
        setLoading(false)
      }
    }
    fetchDeal()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading deal details...</p>
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Deal Not Found</h2>
          <p className="text-gray-600 mb-6">The requested deal could not be found.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deal Details</h1>
            <p className="text-sm text-gray-600 mt-1">Complete information for {deal.project_name}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="space-y-8">

          {/* Project Information */}
          <section className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Project Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.project_name || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Survey Number</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.survey_number || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.location || `${deal.district}, ${deal.taluka}, ${deal.village}` || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.district || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taluka</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.taluka || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.village || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Area</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.total_area || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.created_by_name || deal.created_by || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border capitalize">{status || '-'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Financial Information */}
          <section className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Financial Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{deal.purchase_date || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Amount</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">₹{deal.purchase_amount?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Amount</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">₹{deal.selling_amount?.toLocaleString() || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{paymentMode || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mutation Done</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{mutationDone ? 'Yes' : 'No'}</div>
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profit Allocation</label>
                  <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded border">{profitAllocation || '-'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Owners */}
          <section className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Owners</h2>
            </div>
            <div className="p-6">
              {owners.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No owners information available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Photo URL</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Aadhar Card</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">PAN Card</th>
                      </tr>
                    </thead>
                    <tbody>
                      {owners.map((owner, index) => (
                        <tr key={owner.id || index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{owner.name || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{owner.photo || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{owner.aadhar_card || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{owner.pan_card || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Buyers */}
          <section className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Buyers</h2>
            </div>
            <div className="p-6">
              {buyers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No buyers information available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Photo URL</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Aadhar Card</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">PAN Card</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyers.map((buyer, index) => (
                        <tr key={buyer.id || index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{buyer.name || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{buyer.photo || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{buyer.aadhar_card || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{buyer.pan_card || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Investors */}
          <section className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Investors</h2>
            </div>
            <div className="p-6">
              {investors.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No investors information available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Percentage</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Phone</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Aadhar Card</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">PAN Card</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investors.map((inv, index) => (
                        <tr key={inv.id || index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{inv.investor_name || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">₹{inv.investment_amount?.toLocaleString() || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{inv.investment_percentage}% || '-'</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{inv.phone || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{inv.email || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{inv.aadhar_card || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{inv.pan_card || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Expenses */}
          <section className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
            </div>
            <div className="p-6">
              {expenses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No expenses recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Description</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Paid By</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Receipt Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp, index) => (
                        <tr key={exp.id || index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{exp.expense_type || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{exp.expense_description || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">₹{exp.amount?.toLocaleString() || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {exp.paid_by_name || 
                             (investors.find(inv => String(inv.id) === String(exp.paid_by))?.investor_name) || 
                             exp.paid_by || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{exp.expense_date || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{exp.receipt_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Documents */}
          <section className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            </div>
            <div className="p-6">
              {documents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No documents uploaded</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Document Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Document Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">File Size</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Uploaded By</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc, index) => (
                        <tr key={doc.id || index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{doc.document_type || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{doc.document_name || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{doc.uploaded_by || '-'}</td>
                          <td className="py-3 px-4 text-sm">
                            <a
                              href={`http://localhost:5000/uploads/${doc.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Document
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
