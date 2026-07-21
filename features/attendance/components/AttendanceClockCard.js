'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function AttendanceClockCard({ latestLog, onClockIn, onClockOut, isLoading }) {
  const isClockedIn = latestLog && latestLog.checkIn && !latestLog.checkOut;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Attendance Clock</h2>
        <p className="text-sm text-gray-500">
          Status: <span className="font-semibold text-gray-800">{isClockedIn ? 'Clocked In' : 'Clocked Out'}</span>
        </p>
        {latestLog && (
          <p className="text-xs text-gray-400 mt-1">
            Last Action: {latestLog.checkOut ? `Clocked out at ${latestLog.checkOut}` : `Clocked in at ${latestLog.checkIn}`}
          </p>
        )}
      </div>
      <div>
        {isClockedIn ? (
          <Button
            variant="danger"
            size="lg"
            isLoading={isLoading}
            onClick={onClockOut}
          >
            Clock Out
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            isLoading={isLoading}
            onClick={onClockIn}
          >
            Clock In
          </Button>
        )}
      </div>
    </div>
  );
}
