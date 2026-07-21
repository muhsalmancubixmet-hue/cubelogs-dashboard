import React from 'react';
import { 
  CheckIcon, 
  WarningIcon, 
  ClockIcon 
} from '@/components/Icons';

export default function BillingTab({
  currentUser,
  wallet,
  topupAmount,
  setTopupAmount,
  topupLoading,
  walletSuccess,
  walletError,
  couponCode,
  setCouponCode,
  appliedCoupon,
  couponError,
  couponChecking,
  checkoutLoading,
  employeeCount,
  setEmployeeCount,
  premiumAddons,
  setPremiumAddons,
  toggleLoading,
  billingSearchQuery,
  setBillingSearchQuery,
  selectedReceipt,
  setSelectedReceipt,
  billingSuccess,
  handleApplyCoupon,
  handleRemoveCoupon,
  handleTopup,
  handleToggleModule,
  handleDynamicCheckout,
  PLANS,
  WalletIcon
}) {
  const isExpiring = currentUser?.subscription?.isExpiring ?? false;
  const subscriptionDays = currentUser?.subscription?.subscriptionDays ?? 0;

  const transactions = wallet.transactions || [];
  const debitTransactions = transactions.filter(tx => tx.transactionType === 'Debit' && tx.status === 'Success');
  const creditTransactions = transactions.filter(tx => tx.transactionType === 'Credit' && tx.status === 'Success');

  return (
    <div className="settings-single-card">
      <div className="panel settings-panel-card billing-theme" style={{ maxWidth: '1080px', margin: '0 auto' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClockIcon size={20} style={{ color: 'var(--primary)' }} />
          <span>Billing & Subscription Plans</span>
        </h3>
        <p className="tab-desc">Manage system licenses and subscription packages to prevent workforce check-in geofence blocks.</p>

        {billingSuccess && (
          <div className="tab-alert success" style={{ marginBottom: '24px' }}>
            <CheckIcon size={14} />
            <span>{billingSuccess}</span>
          </div>
        )}

        {walletSuccess && (
          <div className="tab-alert success" style={{ marginBottom: '24px' }}>
            <CheckIcon size={14} />
            <span>{walletSuccess}</span>
          </div>
        )}

        {walletError && (
          <div className="tab-alert danger" style={{ marginBottom: '24px' }}>
            <WarningIcon size={14} />
            <span>{walletError}</span>
          </div>
        )}

        {/* Warnings / Alerts Box */}
        {isExpiring ? (
          <div className="subscription-alert-banner danger-alert" style={{ backgroundColor: 'var(--danger-light)', border: '1.5px solid var(--primary-border)', color: 'var(--danger)', display: 'flex', gap: '16px', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <div className="banner-icon-side" style={{ color: 'var(--danger)' }}>
              <WarningIcon size={28} />
            </div>
            <div className="banner-text-side">
              <h4 style={{ margin: '0 0 4px' }}>Subscription Expiration Notice</h4>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Your enterprise subscription is set to expire in <strong>{subscriptionDays} days</strong>. 
                Renew immediately to ensure that coordinates checks and daily punches operate without interruptions.
              </p>
            </div>
          </div>
        ) : (
          <div className="subscription-alert-banner success-alert" style={{ backgroundColor: 'var(--success-light)', border: '1.5px solid var(--primary-border)', color: 'var(--success)', display: 'flex', gap: '16px', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <div className="banner-icon-side" style={{ color: 'var(--success)' }}>
              <CheckIcon size={28} />
            </div>
            <div className="banner-text-side">
              <h4 style={{ margin: '0 0 4px' }}>Subscription Plan Active</h4>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Your enterprise license holds premium active status with <strong>{subscriptionDays} days remaining</strong>. 
                No billing actions are required at this time.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Calculator UI */}
        <div className="dynamic-calculator-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Left Side: Configuration inputs */}
          <div className="panel calculator-panel" style={{ border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: '#ffffff', padding: '24px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>Configure Workspace Tiers</h4>
            
            {/* Team Size Display (Fixed based on registered company employees) */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="team-size" style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Registered Company Employee Count</span>
                <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>🔒 Fixed</span>
              </label>
              <input
                id="team-size"
                type="text"
                readOnly
                disabled
                value={`${employeeCount}`}
                style={{ border: '1px solid var(--border)', backgroundColor: '#f8fafc', color: 'var(--text-main)', padding: '12px', borderRadius: '8px', fontSize: '1.05rem', fontWeight: '700', width: '100%', cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                Fixed count of registered users in your company. Base core features (Dashboard, Employees, Settings, Audit Logs) are included free.
              </span>
            </div>

            {/* Module Selectors */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                Select Premium Add-on Modules (₹100 / employee / mo each)
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Attendance Management */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', transition: 'all 0.25s ease', backgroundColor: premiumAddons.attendance ? 'var(--primary-light, #eff6ff)' : '#ffffff', borderColor: premiumAddons.attendance ? 'var(--primary-border, #bfdbfe)' : 'var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>Attendance Management</strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block' }}>Includes geofenced clocking, leave requests, leave approvals, shifts scheduling, and holiday calendar.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {toggleLoading.attendance ? (
                      <div className="btn-spinner" style={{ width: '20px', height: '20px', borderColor: 'rgba(37,99,235,0.1)', borderTopColor: 'var(--primary)' }}></div>
                    ) : (
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '46px',
                        height: '24px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={premiumAddons.attendance}
                          onChange={() => handleToggleModule('attendance', premiumAddons.attendance)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: premiumAddons.attendance ? 'var(--primary, #2563eb)' : '#cbd5e1',
                          transition: 'background-color 0.2s ease',
                          borderRadius: '24px',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                        }} />
                        <span style={{
                          position: 'absolute',
                          height: '18px',
                          width: '18px',
                          left: '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: 'transform 0.2s ease',
                          borderRadius: '50%',
                          transform: premiumAddons.attendance ? 'translateX(22px)' : 'translateX(0)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                        }} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Project & Tasks Management */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', transition: 'all 0.25s ease', backgroundColor: premiumAddons.project ? 'var(--primary-light, #eff6ff)' : '#ffffff', borderColor: premiumAddons.project ? 'var(--primary-border, #bfdbfe)' : 'var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>Project & Tasks Management</strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block' }}>Includes assigning templates/roles, adding task workspaces, tracking goals, and task feeds.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {toggleLoading.project ? (
                      <div className="btn-spinner" style={{ width: '20px', height: '20px', borderColor: 'rgba(37,99,235,0.1)', borderTopColor: 'var(--primary)' }}></div>
                    ) : (
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '46px',
                        height: '24px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={premiumAddons.project}
                          onChange={() => handleToggleModule('project', premiumAddons.project)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: premiumAddons.project ? 'var(--primary, #2563eb)' : '#cbd5e1',
                          transition: 'background-color 0.2s ease',
                          borderRadius: '24px',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                        }} />
                        <span style={{
                          position: 'absolute',
                          height: '18px',
                          width: '18px',
                          left: '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: 'transform 0.2s ease',
                          borderRadius: '50%',
                          transform: premiumAddons.project ? 'translateX(22px)' : 'translateX(0)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Cost Estimation & Checkout */}
          <div className="premium-billing-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '2px solid var(--primary)', borderRadius: '12px', padding: '24px', backgroundColor: '#ffffff', boxShadow: '0 10px 30px rgba(37, 99, 235, 0.08)' }}>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: '850', marginBottom: '8px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Subscription Summary</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Metered plan customized specifically for your team size.</p>

              {/* Formula Visual */}
              <div style={{ backgroundColor: 'var(--primary-light)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--primary-border)' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '4px' }}>Formula</span>
                <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--primary-dark)', fontWeight: '600' }}>
                  {employeeCount} Employees × {((premiumAddons.attendance ? 1 : 0) + (premiumAddons.project ? 1 : 0)) * 100} INR
                </div>
              </div>

              {/* Dynamic Cost */}
              <div className="dynamic-price-display" style={{ marginTop: '0', marginBottom: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="currency-symbol" style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>₹</span>
                <span className="price-value" style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-main)' }}>{(employeeCount * (((premiumAddons.attendance ? 1 : 0) + (premiumAddons.project ? 1 : 0)) * 100)).toLocaleString('en-IN')}</span>
                <span className="price-period" style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>/ month</span>
              </div>

              {/* Wallet Balance Display */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', marginBottom: '20px' }}>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Wallet Balance</span>
                <div className="dynamic-price-display" style={{ marginTop: '0', marginBottom: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span className="currency-symbol" style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)' }}>₹</span>
                  <span className="price-value" style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{parseFloat(wallet.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="price-period" style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}> Available</span>
                </div>
              </div>
            </div>

            {/* Add Money to Wallet Form */}
            <form onSubmit={handleTopup} className="settings-form" style={{ marginTop: 'auto', width: '100%' }}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" htmlFor="topup-amount-billing" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.88rem' }}>Deposit Amount (INR)</label>
                <input
                  id="topup-amount-billing"
                  type="number"
                  min="100"
                  step="50"
                  className="form-input"
                  placeholder="Enter amount (e.g. 1000)"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  required
                  style={{ border: '1px solid var(--primary-border)', backgroundColor: 'var(--primary-light)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', width: '100%' }}
                />
              </div>

              {/* Promo Input Layout */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.88rem' }}>Have a Promo Code?</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={appliedCoupon || couponChecking}
                    style={{ border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', flex: 1 }}
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: '600', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponChecking}
                      style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {couponChecking ? 'Checking...' : 'Apply'}
                    </button>
                  )}
                </div>
                {couponError && <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px', display: 'block' }}>{couponError}</span>}
                {appliedCoupon && <span style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px', display: 'block' }}>Promo code "{appliedCoupon.code}" applied!</span>}
              </div>

              {/* Dynamic Breakdown Block */}
              {appliedCoupon && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Top-up Principal:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>₹{parseFloat(appliedCoupon.net_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#10b981' }}>
                    <span style={{ fontWeight: '500' }}>Promo Code Bonus ({appliedCoupon.code}):</span>
                    <span style={{ fontWeight: '600' }}>+ ₹{parseFloat(appliedCoupon.computed_bonus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Value Added to Wallet:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>₹{parseFloat(appliedCoupon.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '10px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary-dark)' }}>Net Payable Amount:</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: '850', color: '#ffffff', backgroundColor: '#2563eb', padding: '4px 10px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>
                      ₹{parseFloat(appliedCoupon.net_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={topupLoading}
                style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {topupLoading ? (
                  <div className="btn-spinner" style={{ margin: '0 auto', borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#fff' }}></div>
                ) : (
                  <>
                    <WalletIcon size={16} />
                    <span>Add Money to Wallet</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Billing History & Receipts Split */}
        <div className="billing-history-section" style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ClockIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>Billing & Receipt History</span>
            </h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <p className="tab-desc" style={{ margin: 0 }}>View subscription invoice debits and download prepaid wallet deposit receipts.</p>
            <input
              type="text"
              className="form-input"
              placeholder="Search invoices or receipts..."
              value={billingSearchQuery}
              onChange={(e) => setBillingSearchQuery(e.target.value)}
              style={{ width: '250px', padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div className="billing-history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            
            {/* Left side: Invoice Details (Debits) */}
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                <span>Invoice Details (Subscription Debits)</span>
              </h4>
              <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', maxHeight: '350px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Details</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debitTransactions.filter(tx => !billingSearchQuery || (tx.details && tx.details.toLowerCase().includes(billingSearchQuery.toLowerCase()))).length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-data" style={{ textAlign: 'center', padding: '32px 0' }}>No invoice debits recorded matching search.</td>
                      </tr>
                    ) : (
                      debitTransactions.filter(tx => !billingSearchQuery || (tx.details && tx.details.toLowerCase().includes(billingSearchQuery.toLowerCase()))).map((tx) => (
                        <tr key={tx.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedReceipt(tx)}>
                          <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                          <td style={{ whiteSpace: 'normal', fontSize: '0.85rem', color: 'var(--text-main)', maxWidth: '200px' }}>
                            {tx.details}
                          </td>
                          <td style={{ fontWeight: '700', color: '#1e293b' }}>
                            -₹{parseFloat(tx.amount).toFixed(2)}
                          </td>
                          <td>
                            <span className={`badge ${tx.status === 'Success' ? 'badge-success' : tx.status === 'Pending' ? 'badge-pending' : 'badge-danger'}`}>
                              {tx.status}
                            </span>
                          </td>
                          <td>
                            <div onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedReceipt(tx)}
                                style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right side: Payment Receipts (Credits) */}
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                <span>Payment Receipts (Wallet Deposits)</span>
              </h4>
              <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', maxHeight: '350px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditTransactions.filter(tx => !billingSearchQuery || (tx.details && tx.details.toLowerCase().includes(billingSearchQuery.toLowerCase()))).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="no-data" style={{ textAlign: 'center', padding: '32px 0' }}>No payment receipts recorded matching search.</td>
                      </tr>
                    ) : (
                      creditTransactions.filter(tx => !billingSearchQuery || (tx.details && tx.details.toLowerCase().includes(billingSearchQuery.toLowerCase()))).map((tx) => (
                        <tr key={tx.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedReceipt(tx)}>
                          <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                          <td style={{ fontWeight: '700', color: '#10b981' }}>
                            +₹{parseFloat(tx.amount).toFixed(2)}
                          </td>
                          <td>
                            <span className={`badge ${tx.status === 'Success' ? 'badge-success' : tx.status === 'Pending' ? 'badge-pending' : 'badge-danger'}`}>
                              {tx.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setSelectedReceipt(tx)}
                                style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                              >
                                View
                              </button>
                              {tx.receipt_url ? (
                                <a 
                                  href={tx.receipt_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                                >
                                  <span>Stripe</span>
                                  <span>↗</span>
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
