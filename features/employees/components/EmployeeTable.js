'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export function EmployeeTable({ employees = [], onEdit, onDelete }) {
  if (!employees || employees.length === 0) {
    return <EmptyState title="No employees found" description="No employees match your criteria." />;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-semibold">Name</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">Email</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">Designation</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold">Role</th>
            <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {employees.map((emp) => (
            <tr key={emp.id} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 font-medium text-gray-900">
                {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'N/A'}
              </td>
              <td className="px-4 py-3 text-gray-600">{emp.email}</td>
              <td className="px-4 py-3 text-gray-600">{emp.designation || 'Staff'}</td>
              <td className="px-4 py-3">
                {emp.isSuperAdmin ? (
                  <Badge variant="primary">Super Admin</Badge>
                ) : (
                  <Badge variant="default">Employee</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right space-x-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(emp)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold focus:outline-none"
                    aria-label={`Edit ${emp.email}`}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(emp)}
                    className="text-red-600 hover:text-red-800 text-xs font-semibold focus:outline-none"
                    aria-label={`Delete ${emp.email}`}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
