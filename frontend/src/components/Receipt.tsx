import React from 'react';

interface ReceiptData {
  receiptNumber: string;
  patientName: string;
  hospitalNumber: string;
  serviceName: string;
  amount: number;
  paymentDate: Date;
  cashierName: string;
  services?: Array<{
    name: string;
    category: string;
    price: number;
  }>;
}

interface ReceiptProps {
  receiptData: ReceiptData;
  onPrint: () => void;
  onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ receiptData, onPrint, onClose }) => {
  const handlePrint = () => {
    window.print();
    onPrint();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  };

  return (
    <>
      {/* Print Styles for Thermal Printer */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            
            .receipt-container, 
            .receipt-container * {
              visibility: visible;
            }
            
            .receipt-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 58mm;
              max-width: 58mm;
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              color: black;
              background: white;
            }
            
            .no-print {
              display: none !important;
            }
            
            .receipt-header {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1px solid black;
              padding-bottom: 4px;
            }
            
            .receipt-title {
              font-size: 14px;
              font-weight: bold;
              margin: 0;
            }
            
            .receipt-subtitle {
              font-size: 10px;
              margin: 2px 0;
            }
            
            .receipt-body {
              font-size: 11px;
              line-height: 1.3;
            }
            
            .receipt-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
              word-wrap: break-word;
            }
            
            .receipt-divider {
              border-top: 1px dashed black;
              margin: 6px 0;
            }
            
            .receipt-total {
              border-top: 1px solid black;
              border-bottom: 1px solid black;
              padding: 4px 0;
              font-weight: bold;
              text-align: center;
            }
            
            .receipt-footer {
              text-align: center;
              font-size: 10px;
              margin-top: 8px;
              border-top: 1px solid black;
              padding-top: 4px;
            }
          }
          
          @media screen {
            .receipt-preview {
              max-width: 300px;
              margin: 0 auto;
              background: white;
              border: 2px solid #ddd;
              border-radius: 8px;
              padding: 16px;
              font-family: 'Courier New', monospace;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
          }
        `}
      </style>

      {/* Modal Overlay */}
      <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Payment Receipt</h5>
              <button 
                type="button" 
                className="btn-close no-print" 
                onClick={onClose}
              ></button>
            </div>
            
            <div className="modal-body">
              {/* Receipt Preview for Screen */}
              <div className="receipt-preview d-print-none">
                <div className="receipt-container">
                  <div className="receipt-header">
                    <h6 className="receipt-title">HOSPITAL POS</h6>
                    <div className="receipt-subtitle">Payment Receipt</div>
                    <div className="receipt-subtitle">Receipt #: {receiptData.receiptNumber}</div>
                  </div>
                  
                  <div className="receipt-body">
                    <div className="receipt-row">
                      <span>Date:</span>
                      <span>{formatDate(receiptData.paymentDate)}</span>
                    </div>
                    
                    <div className="receipt-divider"></div>
                    
                    <div className="receipt-row">
                      <span>Patient:</span>
                      <span>{receiptData.patientName}</span>
                    </div>
                    
                    <div className="receipt-row">
                      <span>Hospital #:</span>
                      <span>{receiptData.hospitalNumber}</span>
                    </div>
                    
                    <div className="receipt-divider"></div>
                    
                    {receiptData.services && receiptData.services.length > 1 ? (
                      <>
                        <div className="receipt-row">
                          <span>Services:</span>
                        </div>
                        {receiptData.services.map((service, index) => (
                          <div key={index} className="receipt-row" style={{ fontSize: '10px', paddingLeft: '8px' }}>
                            <span>{service.name}</span>
                            <span>{formatCurrency(service.price)}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="receipt-row">
                          <span>Service:</span>
                          <span>{receiptData.serviceName}</span>
                        </div>
                        
                        <div className="receipt-row">
                          <span>Amount:</span>
                          <span>{formatCurrency(receiptData.amount)}</span>
                        </div>
                      </>
                    )}
                    
                    <div className="receipt-total">
                      TOTAL PAID: {formatCurrency(receiptData.amount)}
                    </div>
                    
                    <div className="receipt-divider"></div>
                    
                    <div className="receipt-row">
                      <span>Cashier:</span>
                      <span>{receiptData.cashierName}</span>
                    </div>
                    
                    <div className="receipt-footer">
                      <div>Thank you for your payment!</div>
                      <div>Keep this receipt for your records</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer no-print">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handlePrint}
              >
                <i className="bi bi-printer me-2"></i>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden Receipt Container for Printing */}
      <div className="receipt-container d-none d-print-block">
        <div className="receipt-header">
          <h6 className="receipt-title">HOSPITAL POS</h6>
          <div className="receipt-subtitle">Payment Receipt</div>
          <div className="receipt-subtitle">Receipt #: {receiptData.receiptNumber}</div>
        </div>
        
        <div className="receipt-body">
          <div className="receipt-row">
            <span>Date:</span>
            <span>{formatDate(receiptData.paymentDate)}</span>
          </div>
          
          <div className="receipt-divider"></div>
          
          <div className="receipt-row">
            <span>Patient:</span>
            <span>{receiptData.patientName}</span>
          </div>
          
          <div className="receipt-row">
            <span>Hospital #:</span>
            <span>{receiptData.hospitalNumber}</span>
          </div>
          
          <div className="receipt-divider"></div>
          
          {receiptData.services && receiptData.services.length > 1 ? (
            <>
              <div className="receipt-row">
                <span>Services:</span>
              </div>
              {receiptData.services.map((service, index) => (
                <div key={index} className="receipt-row" style={{ fontSize: '10px', paddingLeft: '8px' }}>
                  <span>{service.name}</span>
                  <span>{formatCurrency(service.price)}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="receipt-row">
                <span>Service:</span>
                <span>{receiptData.serviceName}</span>
              </div>
              
              <div className="receipt-row">
                <span>Amount:</span>
                <span>{formatCurrency(receiptData.amount)}</span>
              </div>
            </>
          )}
          
          <div className="receipt-total">
            TOTAL PAID: {formatCurrency(receiptData.amount)}
          </div>
          
          <div className="receipt-divider"></div>
          
          <div className="receipt-row">
            <span>Cashier:</span>
            <span>{receiptData.cashierName}</span>
          </div>
          
          <div className="receipt-footer">
            <div>Thank you for your payment!</div>
            <div>Keep this receipt for your records</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Receipt;