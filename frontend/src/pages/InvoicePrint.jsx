import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, MessageCircle, Mail, BadgeCheck, Ban } from 'lucide-react';
import api from '../api/axios.js';
import InvoiceTemplate from '../components/InvoiceTemplate.jsx';
import { Spinner, Button } from '../components/ui.jsx';

const InvoicePrint = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showCredit, setShowCredit] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/invoices/print/${id}`).then((res) => setData(res.data)).catch((err) => setError(err.response?.data?.message || 'Invoice not found'));
  }, [id]);

  const shareText = () => {
    if (!data) return '';
    const { invoice, company } = data;
    const lines = [
      `${company?.name || ''}`,
      `${invoice.billNumber} · ${new Date(invoice.date).toLocaleDateString()}`,
      `Amount: ₹${Number(invoice.total || 0).toLocaleString('en-IN')}`,
    ];
    if (invoice.paymentMode) lines.push(`Payment: ${invoice.paymentMode}${invoice.status === 'paid' ? ' (PAID)' : ''}`);
    return lines.join('\n');
  };

  const handleWhatsApp = () => {
    const phone = data?.invoice?.partySnapshot?.phone || '';
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(shareText())}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const to = data?.invoice?.party;
    const subject = encodeURIComponent(`Invoice ${data.invoice.billNumber} from ${data.company?.name || 'Biller'}`);
    const body = encodeURIComponent(`${shareText()}\n\nView / download from the Biller app.`);
    window.location.href = `mailto:${to || ''}?subject=${subject}&body=${body}`;
  };

  if (error) return (
    <div className="text-center py-16">
      <p className="text-gray-600 mb-4">{error}</p>
      <Button onClick={() => navigate('/invoices')}>Back to Invoices</Button>
    </div>
  );
  if (!data) return <Spinner />;

  const { invoice, company } = data;

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCredit((s) => !s)} title="Show or hide credit/due info on the printed bill">
            {showCredit ? <BadgeCheck size={16} className="mr-1" /> : <Ban size={16} className="mr-1" />}
            Credit {showCredit ? 'On' : 'Off'}
          </Button>
          <Button variant="secondary" onClick={handleWhatsApp} title="Send invoice on WhatsApp">
            <MessageCircle size={16} className="mr-1" /> WhatsApp
          </Button>
          <Button variant="secondary" onClick={handleEmail} title="Send invoice by email">
            <Mail size={16} className="mr-1" /> Email
          </Button>
          <Button variant="secondary" onClick={() => navigate('/billing')}>New Bill</Button>
          <Button onClick={() => window.print()} className="flex items-center">
            <Printer size={16} className="mr-1" /> Print Bill
          </Button>
        </div>
      </div>
      <div id="print-area" className="max-w-[800px] mx-auto shadow-lg">
        <InvoiceTemplate invoice={invoice} company={company} showCredit={showCredit} />
      </div>
    </div>
  );
};

export default InvoicePrint;