'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { WarningIcon, CheckIcon } from './Icons';

export default function CustomAlertModal() {
  const { alertModal, closeAlert } = useApp();

  if (!alertModal || !alertModal.isOpen) return null;

  const { title, message, type } = alertModal;

  // Infer error status from type or message keyword match
  const isError = type === 'error' || 
    message.toLowerCase().includes('fail') || 
    message.toLowerCase().includes('error') || 
    message.toLowerCase().includes('cannot') || 
    message.toLowerCase().includes('already') ||
    message.toLowerCase().includes('outside');

  return (
    <div className="custom-alert-overlay" onClick={closeAlert}>
      <div className="custom-alert-card" onClick={(e) => e.stopPropagation()}>
        <div className="custom-alert-header">
          <div className={`custom-alert-icon-wrapper ${isError ? 'error' : 'info'}`}>
            {isError ? (
              <WarningIcon size={24} style={{ color: 'white' }} />
            ) : (
              <CheckIcon size={24} style={{ color: 'white' }} />
            )}
          </div>
        </div>
        <div className="custom-alert-content">
          <h2 className="custom-alert-title">{title || (isError ? 'Action Blocked' : 'Notification')}</h2>
          <p className="custom-alert-message">{message}</p>
        </div>
        <div className="custom-alert-actions">
          <button className="custom-alert-btn" onClick={closeAlert}>
            Done
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-alert-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.25s ease-out;
        }

        .custom-alert-card {
          width: 100%;
          max-width: 420px;
          background: #111c2e; /* dark navy blue */
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 32px 28px 24px 28px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .custom-alert-header {
          margin-bottom: 20px;
        }

        .custom-alert-icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .custom-alert-icon-wrapper.error {
          background: #ef4444;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.45);
        }

        .custom-alert-icon-wrapper.info {
          background: #2563eb;
          box-shadow: 0 0 15px rgba(37, 99, 235, 0.45);
        }

        .custom-alert-content {
          margin-bottom: 24px;
          text-align: left;
          width: 100%;
        }

        .custom-alert-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
          letter-spacing: -0.01em;
        }

        .custom-alert-message {
          font-size: 0.92rem;
          color: #94a3b8; /* soft gray subtext */
          line-height: 1.5;
          margin: 0;
          white-space: pre-wrap;
        }

        .custom-alert-actions {
          width: 100%;
          display: flex;
          justify-content: flex-end;
        }

        .custom-alert-btn {
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 24px;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
        }

        .custom-alert-btn:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.4);
        }

        .custom-alert-btn:active {
          transform: translateY(0);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
