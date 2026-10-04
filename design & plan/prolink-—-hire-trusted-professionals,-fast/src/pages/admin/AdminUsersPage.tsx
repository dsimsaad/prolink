import React, { useState, useEffect } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { api } from '../../services/api';
import { User, UserRole } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { StatusChip } from '../../components/ui/StatusChip';
import { Button } from '../../components/ui/Button';
import { Search, Download, Filter, ShieldCheck, X, Ban, CheckCircle } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [roleTab, setRoleTab] = useState<'customer' | 'professional'>('professional');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await api.getUsers(roleTab);
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [roleTab]);

  const filteredUsers = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase()) && !u.city.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    await api.updateUserStatus(user.id, nextStatus);
    setSelectedUser({ ...user, status: nextStatus });
    await fetchUsers();
    marketplaceStore.addToast('User Status Updated', `${user.name} is now ${nextStatus}.`, 'info');
  };

  const handleExportCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["User ID,Name,Email,Phone,City,Status,JoinedDate"].join(",") + "\n"
      + filteredUsers.map(u => `${u.id},"${u.name}",${u.email},"${u.phone}",${u.city},${u.status},${u.joinedDate}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ProLink_Users_${roleTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    marketplaceStore.addToast('Users Exported', `${filteredUsers.length} records exported.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0C2A1B]">Users Directory</h1>
          <p className="text-xs text-[#6A7B70] mt-0.5">
            Audit, verify, and moderate registered customers and verified professionals.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Export User Roster
        </Button>
      </div>

      {/* Tabs: Professionals vs Customers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE8E0] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRoleTab('professional')}
            className={`px-4 py-1.5 rounded-[6px] text-xs font-semibold cursor-pointer transition-colors ${
              roleTab === 'professional'
                ? 'bg-[#0F6B3E] text-white shadow-2xs'
                : 'text-[#6A7B70] hover:text-[#0C2A1B] hover:bg-[#F4FAF6]'
            }`}
          >
            ⚡ Professionals ({users.length})
          </button>
          <button
            onClick={() => setRoleTab('customer')}
            className={`px-4 py-1.5 rounded-[6px] text-xs font-semibold cursor-pointer transition-colors ${
              roleTab === 'customer'
                ? 'bg-[#0F6B3E] text-white shadow-2xs'
                : 'text-[#6A7B70] hover:text-[#0C2A1B] hover:bg-[#F4FAF6]'
            }`}
          >
            👤 Customers
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, city..."
            className="w-full sm:w-64 h-9 pl-8 pr-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#6A7B70] absolute left-2.5 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#DCE8E0] bg-[#F4FAF6] text-[#6A7B70] font-semibold">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Role / Category</th>
              <th className="py-3 px-4">City / Area</th>
              <th className="py-3 px-4">Account Status</th>
              <th className="py-3 px-4">Stats</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE8E0]">
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="hover:bg-[#F4FAF6] transition-colors cursor-pointer group"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar} name={user.name} size="sm" isVerified={user.isVerified} />
                    <div>
                      <div className="font-bold text-[#0C2A1B] group-hover:text-[#0F6B3E]">
                        {user.name}
                      </div>
                      <div className="text-[10px] text-[#6A7B70]">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-[#34453B]">
                  {user.category || 'Customer'}
                </td>
                <td className="py-3 px-4 text-[#6A7B70]">
                  {user.area}, {user.city}
                </td>
                <td className="py-3 px-4">
                  <StatusChip status={user.status as any} />
                </td>
                <td className="py-3 px-4 tabular-nums">
                  {user.role === 'professional' ? (
                    <span>★ {user.rating || '4.8'} ({user.completedJobs || 50} jobs)</span>
                  ) : (
                    <span>{user.jobsPosted || 4} posted · PKR {(user.totalSpentPKR || 45000).toLocaleString()}</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-xs font-semibold text-[#0F6B3E] hover:underline cursor-pointer">
                    Inspect →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Drawer (when user clicked) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full p-6 space-y-6 overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
                <span className="text-xs font-bold text-[#0F6B3E] uppercase tracking-wider">
                  User Dossier
                </span>
                <button onClick={() => setSelectedUser(null)} className="text-[#6A7B70] hover:text-[#0C2A1B]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 bg-[#F4FAF6] rounded-[10px] border border-[#DCE8E0]">
                <Avatar src={selectedUser.avatar} name={selectedUser.name} size="lg" isVerified={selectedUser.isVerified} />
                <div>
                  <h3 className="text-base font-bold text-[#0C2A1B]">{selectedUser.name}</h3>
                  <p className="text-xs text-[#6A7B70]">{selectedUser.email}</p>
                  <p className="text-xs text-[#0F6B3E] font-medium mt-0.5">{selectedUser.phone}</p>
                  <div className="mt-1">
                    <StatusChip status={selectedUser.status as any} />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#DCE8E0]">
                  <span className="text-[#6A7B70]">User ID:</span>
                  <span className="font-mono text-[#0C2A1B]">{selectedUser.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#DCE8E0]">
                  <span className="text-[#6A7B70]">Operating City:</span>
                  <span className="font-semibold text-[#0C2A1B]">{selectedUser.city} ({selectedUser.area})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#DCE8E0]">
                  <span className="text-[#6A7B70]">Member Since:</span>
                  <span className="font-medium text-[#0C2A1B]">{selectedUser.joinedDate}</span>
                </div>
                {selectedUser.category && (
                  <div className="flex justify-between py-1.5 border-b border-[#DCE8E0]">
                    <span className="text-[#6A7B70]">Trade Category:</span>
                    <span className="font-semibold text-[#0F6B3E]">{selectedUser.category}</span>
                  </div>
                )}
                {selectedUser.skills && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[#6A7B70] block">Vetted Trade Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.skills.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-[#E6F4EA] text-[#0F6B3E] rounded-full text-[10px] font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Suspend or Activate */}
            <div className="pt-4 border-t border-[#DCE8E0] space-y-2">
              <Button
                variant={selectedUser.status === 'active' ? 'danger' : 'primary'}
                size="md"
                onClick={() => handleToggleStatus(selectedUser)}
                className="w-full font-bold"
              >
                {selectedUser.status === 'active' ? (
                  <>
                    <Ban className="w-4 h-4 mr-1.5" />
                    Suspend User Account
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Activate User Account
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedUser(null)}
                className="w-full text-xs"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
