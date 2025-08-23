// --- All imports remain untouched ---
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { dealAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function NewDeal() {
  // --- Logic & state unchanged ---
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    project_name: '',
    survey_number: '',
    location: '',
    district: '',
    taluka: '',
    village: '',
    total_area: '',
    purchase_date: '',
    purchase_amount: '',
    selling_amount: '',
    status: 'open',
    owners: [{ name: '', photo: '', aadhar_card: '', pan_card: '' }],
    investors: [{ investor_name: '', investment_amount: '', investment_percentage: '', phone: '', email: '', aadhar_card: '', pan_card: '' }],
    expenses: [{ expense_type: '', expense_description: '', amount: '', paid_by: '', expense_date: '', receipt_number: '' }],
    payment_mode: '',
    mutation_done: false,
    buyers: [{ name: '', photo: '', aadhar_card: '', pan_card: '' }],
    profit_allocation: '',
    documents: [],
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setAuthChecked(true);
  }, []);

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
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };
  
  const handleArrayChange = (arr, idx, e) => {
    const updated = [...form[arr]];
    updated[idx][e.target.name] = e.target.value;
    setForm({ ...form, [arr]: updated });
  };
  
  const addArrayItem = (arr, obj) => setForm({ ...form, [arr]: [...form[arr], obj] });
  const removeArrayItem = (arr, idx) => setForm({ ...form, [arr]: form[arr].filter((_, i) => i !== idx) });
  const handleFileChange = (e) => setFiles(Array.from(e.target.files));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, documents: files.map(f => f.name) };
      const dealRes = await dealAPI.create(payload);
      const dealId = dealRes.data.deal_id || dealRes.data.id;
      let allUploadsSuccessful = true;
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

            {/* Project & Land Details */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                Project & Land Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Input label="Project Name" name="project_name" value={form.project_name} onChange={handleChange} required />
                <Input label="Survey Number" name="survey_number" value={form.survey_number} onChange={handleChange} required />
                <Input label="Location" name="location" value={form.location} onChange={handleChange} required />
                <Input label="District" name="district" value={form.district} onChange={handleChange} required />
                <Input label="Taluka" name="taluka" value={form.taluka} onChange={handleChange} required />
                <Input label="Village" name="village" value={form.village} onChange={handleChange} required />
                <Input label="Total Area" name="total_area" value={form.total_area} onChange={handleChange} />
                <Input type="date" label="Purchase Date" name="purchase_date" value={form.purchase_date} onChange={handleChange} required />
                <Input type="number" label="Purchase Amount" name="purchase_amount" value={form.purchase_amount} onChange={handleChange} required />
                <Input type="number" label="Selling Amount" name="selling_amount" value={form.selling_amount} onChange={handleChange} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Owners */}
            <DynamicSection
              title="Owners"
              items={form.owners}
              onAdd={() => addArrayItem('owners', { name: '', photo: '', aadhar_card: '', pan_card: '' })}
              onRemove={(idx) => removeArrayItem('owners', idx)}
              render={(owner, idx) => (
                <>
                  <Input name="name" value={owner.name} onChange={(e) => handleArrayChange('owners', idx, e)} placeholder="Owner Name" required />
                  <Input name="photo" value={owner.photo} onChange={(e) => handleArrayChange('owners', idx, e)} placeholder="Photo URL" />
                  <Input name="aadhar_card" value={owner.aadhar_card} onChange={(e) => handleArrayChange('owners', idx, e)} placeholder="Aadhar Card" />
                  <Input name="pan_card" value={owner.pan_card} onChange={(e) => handleArrayChange('owners', idx, e)} placeholder="PAN Card" />
                </>
              )}
            />

            {/* Investors */}
            <DynamicSection
              title="Investors"
              items={form.investors}
              onAdd={() => addArrayItem('investors', { investor_name: '', investment_amount: '', investment_percentage: '', phone: '', email: '', aadhar_card: '', pan_card: '' })}
              onRemove={(idx) => removeArrayItem('investors', idx)}
              render={(inv, idx) => (
                <>
                  <Input name="investor_name" value={inv.investor_name} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Investor Name" required />
                  <Input type="number" name="investment_amount" value={inv.investment_amount} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Amount" required />
                  <Input type="number" name="investment_percentage" value={inv.investment_percentage} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Share (%)" required />
                  <Input name="phone" value={inv.phone} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Phone" />
                  <Input name="email" value={inv.email} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Email" />
                  <Input name="aadhar_card" value={inv.aadhar_card} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="Aadhar Card" />
                  <Input name="pan_card" value={inv.pan_card} onChange={(e) => handleArrayChange('investors', idx, e)} placeholder="PAN Card" />
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
                  <Input type="number" name="amount" value={exp.amount} onChange={(e) => handleArrayChange('expenses', idx, e)} placeholder="Amount" required />
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
              onAdd={() => addArrayItem('buyers', { name: '', photo: '', aadhar_card: '', pan_card: '' })}
              onRemove={(idx) => removeArrayItem('buyers', idx)}
              render={(buyer, idx) => (
                <>
                  <Input name="name" value={buyer.name} onChange={(e) => handleArrayChange('buyers', idx, e)} placeholder="Buyer Name" required />
                  <Input name="photo" value={buyer.photo} onChange={(e) => handleArrayChange('buyers', idx, e)} placeholder="Photo URL" />
                  <Input name="aadhar_card" value={buyer.aadhar_card} onChange={(e) => handleArrayChange('buyers', idx, e)} placeholder="Aadhar Card" />
                  <Input name="pan_card" value={buyer.pan_card} onChange={(e) => handleArrayChange('buyers', idx, e)} placeholder="PAN Card" />
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
function Input({ label, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <input 
        {...props} 
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
