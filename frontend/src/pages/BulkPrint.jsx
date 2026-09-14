import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import api from '../api/axios.js';
import InvoiceTemplate from '../components/InvoiceTemplate.jsx';
import { Spinner, Button } from '../components/ui.jsx';

const BulkPrint = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const ids = (params.get('ids') || '').split(',').filter(Boolean);

  useEffect(() => {
    if (ids.length === 0) {
      setError('No invoices selected');
      return;
    }
    api.post('/invoices/bulk-print', { ids }).then((res) => setData(res.data)).catch((err) => setError(err.response?.data?.message || 'Failed to load invoices'));
  }, [params]);

  if (error) return (
    <div className="text-center py-16">
      <p className="text-gray-600 mb-4">{error}</p>
      <Button onClick={() => navigate('/invoices')}>Back to Invoices</Button>
    </div>
  );
  if (!data) return <Spinner />;

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{data.length} invoice(s) ready</span>
          <Button onClick={() => window.print()} className="flex items-center">
            <Printer size={16} className="mr-1" /> Print All
          </Button>
        </div>
      </div>
      <div id="print-area" className="max-w-[800px] mx-auto space-y-6">
        {data.map(({ invoice, company }, idx) => (
          <InvoiceTemplate key={invoice._id} invoice={invoice} company={company} index={idx} />
        ))}
      </div>
    </div>
  );
};

export default BulkPrint;