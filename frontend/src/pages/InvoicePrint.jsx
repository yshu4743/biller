import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import api from '../api/axios.js';
import { Spinner, Button } from '../components/ui.jsx';
import { formatCurrency, formatDate, amountToWords } from '../utils/format.js';

const InvoiceTemplate = React.forwardRef(({ invoice, company }, ref) => {
  const isGst = company != null && company.isGstRegistered;
  const stateCode = company?.stateCode;
  const partyState = invoice.partySnapshot?.stateCode;
  const interstate = isGst && stateCode && partyState && stateCode !== partyState;

  const gstByRate = {};
  invoice.items.forEach((it) => {
    const rate = it.gstRate || 0;
    const amount = it.discountedAmount || it.amount;
    const taxable = it.gstIncluded && rate > 0 ? amount / (1 + rate / 100) : amount;
    const gst = (taxable * rate) / 100;
    gstByRate[rate] = gstByRate[rate] || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    gstByRate[rate].taxable += taxable;
    if (interstate) gstByRate[rate].igst += gst;
    else {
      gstByRate[rate].cgst += gst / 2;
      gstByRate[rate].sgst += gst / 2;
    }
  });

  return (
    <div className="bg-white text-gray-900 print:shadow-none" ref={ref}>
      <div className="border border-gray-800" style={{ padding: '24px' }}>
        <div className="flex justify-between items-start">
          <div>
            {company?.logo && (
              <img src={company.logo} alt="logo" style={{ height: '70px', objectFit: 'contain', marginBottom: '8px' }} />
            )}
            <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>{company?.name}</h1>
            <p style={{ fontSize: '11px', lineHeight: '1.5' }}>
              {company?.address}{company?.city ? ', ' + company.city : ''}
              {company?.state ? ', ' + company.state : ''} {company?.pincode}
              <br />
              {company?.phone && <>Phone: {company.phone} </>}
              {company?.email && <>| Email: {company.email}</>}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '26px', fontWeight: 'bold', letterSpacing: '1px' }}>TAX INVOICE</p>
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              <div><b>Bill No:</b> {invoice.billNumber}</div>
              <div><b>Date:</b> {formatDate(invoice.date)}</div>
              {invoice.dueDate && <div><b>Due Date:</b> {formatDate(invoice.dueDate)}</div>}
            </div>
            {isGst && company.gstin && (
              <p style={{ marginTop: '8px', fontSize: '12px' }}>
                <b>GSTIN:</b> {company.gstin}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px' }}>
          {isGst && <b>Bill To:</b>} {invoice.partySnapshot?.name}
          {invoice.partySnapshot && <div>Address: {invoice.partySnapshot.address || '-'}</div>}
          {invoice.partySnapshot?.phone && <div>Phone: {invoice.partySnapshot.phone}</div>}
          {isGst && invoice.partySnapshot?.gstin && <div>GSTIN: {invoice.partySnapshot.gstin}</div>}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderTop: '2px solid #1f2937', borderBottom: '2px solid #1f2937' }}>
              <th style={{ padding: '6px 4px', textAlign: 'left', borderLeft: '1px solid #ddd' }}>#</th>
              <th style={{ padding: '6px 4px', textAlign: 'left', borderLeft: '1px solid #ddd' }}>Item</th>
              {isGst && <th style={{ padding: '6px 4px', textAlign: 'left', borderLeft: '1px solid #ddd' }}>HSN</th>}
              <th style={{ padding: '6px 4px', textAlign: 'left', borderLeft: '1px solid #ddd' }}>Qty</th>
              <th style={{ padding: '6px 4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>Rate</th>
              {invoice.discountAmount > 0 && <th style={{ padding: '6px 4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>Disc</th>}
              <th style={{ padding: '6px 4px', textAlign: 'right', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '6px 4px', borderLeft: '1px solid #ddd' }}>{idx + 1}</td>
                <td style={{ padding: '6px 4px', borderLeft: '1px solid #ddd' }}>{it.name}</td>
                {isGst && <td style={{ padding: '6px 4px', borderLeft: '1px solid #ddd' }}>{it.hsn || '-'}</td>}
                <td style={{ padding: '6px 4px', borderLeft: '1px solid #ddd' }}>{it.quantity} {it.unit}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>{formatCurrency(it.price)}</td>
                {invoice.discountAmount > 0 && (
                  <td style={{ padding: '6px 4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>
                    {it.discount ? formatCurrency(it.discount) : '-'}
                  </td>
                )}
                <td style={{ padding: '6px 4px', textAlign: 'right', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd' }}>
                  {formatCurrency(it.discountedAmount || it.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', fontSize: '12px' }}>
          <div style={{ width: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span>Discount</span><span>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Taxable</span><span>{formatCurrency(invoice.taxable)}</span>
            </div>
            {isGst && (
              <>
                {invoice.cgst > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>CGST</span><span>{formatCurrency(invoice.cgst)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>SGST</span><span>{formatCurrency(invoice.sgst)}</span></div>
                  </>
                )}
                {invoice.igst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>IGST</span><span>{formatCurrency(invoice.igst)}</span></div>
                )}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Round Off</span><span>{invoice.roundOff >= 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '2px solid #1f2937', fontWeight: 'bold', fontSize: '14px' }}>
              <span>TOTAL</span><span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '11px', marginTop: '8px' }}>
          <p><b>Amount in Words:</b> {amountToWords(invoice.total)}</p>
        </div>

        {isGst && Object.keys(gstByRate).length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderTop: '2px solid #1f2937', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '4px', textAlign: 'left', borderLeft: '1px solid #ddd' }}>GST %</th>
                <th style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>Taxable</th>
                <th style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>CGST</th>
                <th style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>SGST</th>
                {interstate && <th style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>IGST</th>}
                <th style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(gstByRate).map(([rate, v]) => (
                <tr key={rate} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '4px', borderLeft: '1px solid #ddd' }}>{rate}%</td>
                  <td style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>{formatCurrency(v.taxable)}</td>
                  <td style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>{formatCurrency(v.cgst)}</td>
                  <td style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>{formatCurrency(v.sgst)}</td>
                  {interstate && <td style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd' }}>{formatCurrency(v.igst)}</td>}
                  <td style={{ padding: '4px', textAlign: 'right', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd' }}>
                    {formatCurrency(v.taxable + v.cgst + v.sgst + v.igst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '11px' }}>
          <div style={{ width: '50%' }}>
            <p><b>Payment Mode:</b> {invoice.paymentMode.toUpperCase()}</p>
            {invoice.status === 'paid' ? (
              <p><b>Paid:</b> {formatCurrency(invoice.paidAmount)}</p>
            ) : (
              <p><b>Paid:</b> {formatCurrency(invoice.paidAmount)} | <b>Due:</b> {formatCurrency(invoice.dueAmount)}</p>
            )}
            {invoice.notes && <p><b>Notes:</b> {invoice.notes}</p>}
            {company?.bankName && (
              <p style={{ marginTop: '6px' }}>
                <b>Bank:</b> {company.bankName}
                {company.bankAccount ? ` | A/C: ${company.bankAccount}` : ''}
                {company.bankIfsc ? ` | IFSC: ${company.bankIfsc}` : ''}
              </p>
            )}
            {company?.upiId && <p><b>UPI:</b> {company.upiId}</p>}
          </div>
          <div style={{ textAlign: 'right', width: '30%' }}>
            {invoice.salesPerson && <p><b>Sales Person:</b> {invoice.salesPerson}</p>}
            <div style={{ marginTop: '40px', borderTop: '1px solid #333', paddingTop: '4px' }}>
              Authorised Signature
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px' }}>
          {company?.invoiceNote || 'Thank you for your business!'}
        </p>
      </div>
    </div>
  );
});

const InvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/invoices/print/${id}`).then((res) => setData(res.data)).catch((err) => setError(err.response?.data?.message || 'Invoice not found'));
  }, [id]);

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
          <Button variant="secondary" onClick={() => navigate('/billing')}>New Bill</Button>
          <Button onClick={() => window.print()} className="flex items-center">
            <Printer size={16} className="mr-1" /> Print Bill
          </Button>
        </div>
      </div>
      <div id="print-area" className="max-w-[800px] mx-auto shadow-lg">
        <InvoiceTemplate invoice={invoice} company={company} />
      </div>
    </div>
  );
};

export default InvoicePrint;