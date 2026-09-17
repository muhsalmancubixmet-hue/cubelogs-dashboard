import React from 'react';
import { 
  CheckIcon, 
  WarningIcon, 
  ClockIcon 
} from '@/components/Icons';
import StorageMediaSection from './StorageMediaSection';

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
  billingEstimate,
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
  const daysRemaining = currentUser?.subscription?.daysRemaining ?? 0;
  const isExpired = currentUser?.subscription?.isExpired ?? false;
  const isExpiring = isExpired || daysRemaining <= 15;
  const subscriptionDays = daysRemaining;

  const attPrice = wallet?.attendance_module_price ? parseFloat(wallet.attendance_module_price) : 100;
  const tasksPrice = wallet?.tasks_module_price ? parseFloat(wallet.tasks_module_price) : 100;

  const transactions = wallet.transactions || [];
  const debitTransactions = transactions.filter(tx => tx.transactionType === 'Debit' && tx.status === 'Success');
  const creditTransactions = transactions.filter(tx => tx.transactionType === 'Credit' && tx.status === 'Success');

  return (
    <div className="settings-single-card" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div className="panel settings-panel-card billing-theme" style={{ maxWidth: '1080px', margin: '0 auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.96rem', fontWeight: '700', marginBottom: '14px' }}>
          <ClockIcon size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span>Billing & Subscription Plans</span>
        </h3>

        {billingSuccess && (
          <div className="tab-alert success" style={{ marginBottom: '16px' }}>
            <CheckIcon size={14} />
            <span>{billingSuccess}</span>
          </div>
        )}

        {walletSuccess && (
          <div className="tab-alert success" style={{ marginBottom: '16px' }}>
            <CheckIcon size={14} />
            <span>{walletSuccess}</span>
          </div>
        )}

        {walletError && (
          <div className="tab-alert danger" style={{ marginBottom: '16px' }}>
            <WarningIcon size={14} />
            <span>{walletError}</span>
          </div>
        )}

        {/* Warnings / Alerts Box */}
        {isExpiring ? (
          <div className="subscription-alert-banner danger-alert" style={{ backgroundColor: 'var(--danger-light)', border: '1.5px solid var(--primary-border)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', boxSizing: 'border-box', width: '100%', minWidth: 0 }}>
            <div className="banner-icon-side" style={{ color: 'var(--danger)', flexShrink: 0 }}>
              <WarningIcon size={22} />
            </div>
            <div className="banner-text-side" style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: '0.88rem', fontWeight: '700', display: 'block', wordBreak: 'break-word' }}>
                {currentUser?.subscription?.isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
              </strong>
              <span style={{ fontSize: '0.8rem', lineHeight: '1.35', color: 'var(--danger)', wordBreak: 'break-word' }}>
                {currentUser?.subscription?.isExpired ? (
                  <>Access locks in <strong>{subscriptionDays} days</strong> (grace period). Deposit funds to avoid restriction.</>
                ) : (
                  <>Expires in <strong>{subscriptionDays} days</strong>. Renew to ensure continuous workforce tracking.</>
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="subscription-alert-banner success-alert" style={{ backgroundColor: 'var(--success-light)', border: '1.5px solid var(--primary-border)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', boxSizing: 'border-box', width: '100%', minWidth: 0 }}>
            <div className="banner-icon-side" style={{ color: 'var(--success)', flexShrink: 0 }}>
              <CheckIcon size={20} />
            </div>
            <div className="banner-text-side" style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: '0.88rem', fontWeight: '700', display: 'block', wordBreak: 'break-word' }}>Subscription Plan Active</strong>
              <span style={{ fontSize: '0.8rem', lineHeight: '1.35', color: 'var(--primary-dark)', wordBreak: 'break-word' }}>
                Premium active status with <strong>{subscriptionDays} days remaining</strong>. No billing actions required.
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Calculator UI */}
        <div className="dynamic-calculator-container">
          {/* Left Side: Configuration inputs */}
          <div className="panel calculator-panel">
            <h4 style={{ fontSize: '0.94rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)', wordBreak: 'break-word' }}>Configure Workspace Tiers</h4>
            
            {/* Registered Employee Count Display */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontWeight: '600', marginBottom: '6px', fontSize: '0.84rem' }}>
                <span>Billable Employee Count</span>
                <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>🔒 Canonical</span>
              </label>
              <input
                id="team-size"
                type="text"
                readOnly
                disabled
                value={`${employeeCount}`}
                style={{ border: '1px solid var(--border)', backgroundColor: '#f8fafc', color: 'var(--text-main)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '700', width: '100%', cursor: 'not-allowed', boxSizing: 'border-box' }}
              />
            </div>

            {/* Module Selectors */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block', fontSize: '0.84rem' }}>
                Select Premium Add-on Modules
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Attendance Management */}
                <div className="addon-module-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '10px', transition: 'all 0.25s ease', backgroundColor: premiumAddons.attendance ? 'var(--primary-light, #eff6ff)' : '#ffffff', borderColor: premiumAddons.attendance ? 'var(--primary-border, #bfdbfe)' : 'var(--border)', boxSizing: 'border-box', width: '100%', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <strong style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-main)', wordBreak: 'break-word' }}>Attendance Management</strong>
                    <span style={{ fontSize: '0.72rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 6px', borderRadius: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>₹{attPrice} / employee / month</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {toggleLoading.attendance ? (
                      <div className="btn-spinner" style={{ width: '18px', height: '18px', borderColor: 'rgba(37,99,235,0.1)', borderTopColor: 'var(--primary)' }}></div>
                    ) : (
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '42px',
                        height: '22px',
                        cursor: 'pointer',
                        flexShrink: 0
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
                          borderRadius: '22px',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                        }} />
                        <span style={{
                          position: 'absolute',
                          height: '16px',
                          width: '16px',
                          left: '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: 'transform 0.2s ease',
                          borderRadius: '50%',
                          transform: premiumAddons.attendance ? 'translateX(20px)' : 'translateX(0)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                        }} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Project & Tasks Management */}
                <div className="addon-module-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '10px', transition: 'all 0.25s ease', backgroundColor: premiumAddons.project ? 'var(--primary-light, #eff6ff)' : '#ffffff', borderColor: premiumAddons.project ? 'var(--primary-border, #bfdbfe)' : 'var(--border)', boxSizing: 'border-box', width: '100%', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <strong style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-main)', wordBreak: 'break-word' }}>Project & Tasks Management</strong>
                    <span style={{ fontSize: '0.72rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 6px', borderRadius: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>₹{tasksPrice} / employee / month</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {toggleLoading.project ? (
                      <div className="btn-spinner" style={{ width: '18px', height: '18px', borderColor: 'rgba(37,99,235,0.1)', borderTopColor: 'var(--primary)' }}></div>
                    ) : (
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '42px',
                        height: '22px',
                        cursor: 'pointer',
                        flexShrink: 0
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
                          borderRadius: '22px',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                        }} />
                        <span style={{
                          position: 'absolute',
                          height: '16px',
                          width: '16px',
                          left: '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: 'transform 0.2s ease',
                          borderRadius: '50%',
                          transform: premiumAddons.project ? 'translateX(20px)' : 'translateX(0)',
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
          <div className="panel premium-billing-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1.5px solid var(--primary)', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.06)', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <div>
              <h4 style={{ fontSize: '0.86rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)', letterSpacing: '-0.01em', wordBreak: 'break-word' }}>Subscription Summary</h4>

              {/* Formula Visual & Itemized Breakdown */}
              <div style={{ backgroundColor: 'var(--primary-light)', padding: '8px 10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--primary-border)', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.04em', marginBottom: '4px', wordBreak: 'break-word' }}>
                  Per-Employee Monthly Breakdown ({employeeCount} Seats)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: 'var(--primary-dark)', fontWeight: '600' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <span>Employee Seats:</span>
                    <span>{employeeCount} × ₹{billingEstimate?.employee_rate || '50.00'} = ₹{billingEstimate ? (parseFloat(billingEstimate.employee_charge) || 0).toLocaleString('en-IN') : (employeeCount * 50).toLocaleString('en-IN')}</span>
                  </div>
                  {premiumAddons.attendance && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                      <span>Attendance Module:</span>
                      <span>{employeeCount} × ₹{billingEstimate?.attendance_rate || attPrice || '99.00'} = ₹{billingEstimate ? (parseFloat(billingEstimate.attendance_charge) || 0).toLocaleString('en-IN') : (employeeCount * (attPrice || 99)).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {premiumAddons.project && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                      <span>Projects Module:</span>
                      <span>{employeeCount} × ₹{billingEstimate?.project_rate || tasksPrice || '56.00'} = ₹{billingEstimate ? (parseFloat(billingEstimate.project_charge) || 0).toLocaleString('en-IN') : (employeeCount * (tasksPrice || 56)).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Cost */}
              <div className="dynamic-price-display" style={{ marginTop: '0', marginBottom: '10px', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                <span className="currency-symbol" style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>₹</span>
                <span className="price-value" style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>
                  {billingEstimate && typeof billingEstimate.estimated_next_total === 'number'
                    ? billingEstimate.estimated_next_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : (employeeCount * (50 + (premiumAddons.attendance ? (attPrice || 99) : 0) + (premiumAddons.project ? (tasksPrice || 56) : 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                </span>
                <span className="price-period" style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>/ month</span>
              </div>

              {/* Wallet Balance Display */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px', marginBottom: '10px', width: '100%', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '2px' }}>Wallet Balance</span>
                <div className="dynamic-price-display" style={{ marginTop: '0', marginBottom: '8px', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                  <span className="currency-symbol" style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>₹</span>
                  <span className="price-value" style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>{parseFloat(wallet.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="price-period" style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}> Available</span>
                </div>
              </div>
            </div>

            {/* Add Money to Wallet Form */}
            <form onSubmit={handleTopup} className="settings-form" style={{ marginTop: 'auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" htmlFor="topup-amount-billing" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.75rem', marginBottom: '3px', display: 'block' }}>Deposit Amount (INR)</label>
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
                  style={{ border: '1px solid var(--primary-border)', backgroundColor: 'var(--primary-light)', padding: '6px 10px', borderRadius: '7px', fontSize: '0.82rem', height: '34px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Promo Input Layout */}
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.75rem', marginBottom: '3px', display: 'block' }}>Have a Promo Code?</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={appliedCoupon || couponChecking}
                    style={{ border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '7px', fontSize: '0.82rem', height: '34px', flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      style={{ padding: '6px 10px', fontSize: '0.76rem', fontWeight: '600', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '7px', cursor: 'pointer', flexShrink: 0, height: '34px' }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponChecking}
                      style={{ padding: '6px 12px', fontSize: '0.76rem', fontWeight: '600', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '7px', cursor: 'pointer', flexShrink: 0, height: '34px' }}
                    >
                      {couponChecking ? 'Checking...' : 'Apply'}
                    </button>
                  )}
                </div>
                {couponError && <span style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '3px', display: 'block' }}>{couponError}</span>}
                {appliedCoupon && <span style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '3px', display: 'block' }}>Promo code "{appliedCoupon.code}" applied!</span>}
              </div>

              {/* Dynamic Breakdown Block */}
              {appliedCoupon && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', fontSize: '0.75rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Top-up Principal:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>₹{parseFloat(appliedCoupon.net_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', marginBottom: '4px', color: '#10b981' }}>
                    <span style={{ fontWeight: '500' }}>Promo Code Bonus ({appliedCoupon.code}):</span>
                    <span style={{ fontWeight: '600' }}>+ ₹{parseFloat(appliedCoupon.computed_bonus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Value Added:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>₹{parseFloat(appliedCoupon.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '8px', padding: '6px 8px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary-dark)' }}>Net Payable:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ffffff', backgroundColor: '#2563eb', padding: '3px 6px', borderRadius: '5px' }}>
                      ₹{parseFloat(appliedCoupon.net_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={topupLoading}
                style={{ width: '100%', padding: '8px 12px', height: '36px', fontSize: '0.82rem', fontWeight: '600', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxSizing: 'border-box' }}
              >
                {topupLoading ? (
                  <div className="btn-spinner" style={{ margin: '0 auto', borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#fff' }}></div>
                ) : (
                  <>
                    <WalletIcon size={15} />
                    <span>Add Money to Wallet</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Company Storage & Media Section */}
        <StorageMediaSection />

        {/* Billing History & Receipts Split */}
        <div className="billing-history-section" style={{ marginTop: '28px', borderTop: '1px solid var(--border)', paddingTop: '20px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '0.96rem', fontWeight: '700' }}>
              <ClockIcon size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>Billing & Receipt History</span>
            </h3>
            <input
              type="text"
              className="form-input billing-search-input"
              placeholder="Search invoices or receipts..."
              value={billingSearchQuery}
              onChange={(e) => setBillingSearchQuery(e.target.value)}
              style={{ width: '100%', maxWidth: '240px', padding: '6px 10px', fontSize: '0.8rem', boxSizing: 'border-box' }}
            />
          </div>

          <div className="billing-history-grid">
            
            {/* Left side: Invoice Details (Debits) */}
            <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
              <h4 style={{ fontSize: '0.96rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }}></span>
                <span>Invoice Details (Subscription Debits)</span>
              </h4>
              <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', maxHeight: '350px', overflowY: 'auto', backgroundColor: '#ffffff', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
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
                              <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setSelectedReceipt(tx)}
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                                >
                                  View
                                </button>
                                {tx.invoice_id ? (
                                  <a
                                    href={`/api/monthly-invoices/${tx.invoice_id}/pdf/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    Download PDF
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', alignSelf: 'center', padding: '0 4px' }}>
                                    Receipt
                                  </span>
                                )}
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
            <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
              <h4 style={{ fontSize: '0.96rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }}></span>
                <span>Payment Receipts (Wallet Deposits)</span>
              </h4>
              <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', maxHeight: '350px', overflowY: 'auto', backgroundColor: '#ffffff', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
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
                                  <span>Receipt</span>
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

      <style jsx>{`
        .dynamic-calculator-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-top: 20px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .billing-history-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        @media (min-width: 900px) {
          .dynamic-calculator-container {
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          .billing-history-grid {
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
        }

        .calculator-panel {
          padding: 24px;
          border-radius: 12px;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }

        .premium-billing-card {
          padding: 16px 14px;
          border-radius: 12px;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }

        @media (max-width: 480px) {
          .calculator-panel {
            padding: 12px 10px !important;
          }
          .premium-billing-card {
            padding: 12px 10px !important;
          }
          .dynamic-price-display .price-value {
            font-size: 1.45rem !important;
          }
          .dynamic-price-display .currency-symbol {
            font-size: 1rem !important;
          }
          .addon-module-item {
            padding: 10px 8px !important;
          }
          .billing-search-input {
            width: 100% !important;
            max-width: 100% !important;
          }
        }

        :global(:root.dark) .settings-panel-card {
          background: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
        :global(:root.dark) .calculator-panel {
          background: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
        :global(:root.dark) .premium-billing-card {
          background: #1e293b !important;
          background-color: #1e293b !important;
          border-color: #2563eb !important;
          color: #f8fafc !important;
        }
        :global(:root.dark) .addon-module-item {
          background-color: #0f172a !important;
          border-color: #334155 !important;
        }
        :global(:root.dark) .table-container {
          background: #1e293b !important;
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }
        :global(:root.dark) .table-container table {
          background: #1e293b !important;
        }
        :global(:root.dark) .table-container th {
          background: #0f172a !important;
          border-color: #334155 !important;
          color: #94a3b8 !important;
        }
        :global(:root.dark) .table-container td {
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }
        :global(:root.dark) .table-container tr:hover {
          background: rgba(255, 255, 255, 0.03) !important;
        }
        :global(:root.dark) .billing-search-input {
          background: #0f172a !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
        :global(:root.dark) input#team-size {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
