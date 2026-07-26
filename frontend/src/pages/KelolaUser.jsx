// frontend/src/pages/KelolaUser.jsx
import { useEffect, useState } from 'react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import './KelolaUser.css';

function KelolaUser() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { user: currentUser } = useAuth();

  // State untuk notifikasi
  const [notification, setNotification] = useState({
    show: false,
    type: '', // 'success', 'error', 'warning'
    message: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'petugas'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await API.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showNotification('error', 'Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    // Hilangkan notifikasi setelah 4 detik
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await API.put(`/admin/users/${editingUser.id}`, formData);
        showNotification('success', `User "${formData.username}" berhasil diupdate!`);
      } else {
        await API.post('/auth/register', formData);
        showNotification('success', `User "${formData.username}" berhasil ditambahkan!`);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ username: '', email: '', password: '', role: 'petugas' });
      fetchUsers();
    } catch (error) {
      showNotification('error', error.response?.data?.detail || 'Gagal menyimpan user');
    }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`Yakin ingin menghapus user "${username}"?`)) return;
    try {
      await API.delete(`/admin/users/${userId}`);
      showNotification('success', `User "${username}" berhasil dihapus!`);
      fetchUsers();
    } catch (error) {
      showNotification('error', error.response?.data?.detail || 'Gagal menghapus user');
    }
  };

  const handleToggleActive = async (userId, currentStatus, username) => {
    try {
      await API.put(`/admin/users/${userId}`, { is_active: !currentStatus });
      const statusText = !currentStatus ? 'diaktifkan' : 'dinonaktifkan';
      showNotification('success', `User "${username}" berhasil ${statusText}!`);
      fetchUsers();
    } catch (error) {
      showNotification('error', error.response?.data?.detail || 'Gagal mengubah status user');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowModal(true);
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <span className="role-badge admin">Admin</span>;
    }
    return <span className="role-badge petugas">Petugas</span>;
  };

  const getStatusBadge = (isActive) => {
    if (isActive) {
      return <span className="status-badge active">Aktif</span>;
    }
    return <span className="status-badge inactive">Nonaktif</span>;
  };

  if (loading) {
    return <div className="loading-spinner">Memuat data...</div>;
  }

  return (
    <div className="kelola-user-page">
      {/* Notifikasi Card */}
      {notification.show && (
        <div className={`notification-card ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : '⚠️'}
            </span>
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification({ show: false, type: '', message: '' })}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>👥 Kelola User</h1>
          <p className="page-subtitle">Kelola akun pengguna sistem</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditingUser(null);
          setFormData({ username: '', email: '', password: '', role: 'petugas' });
          setShowModal(true);
        }}>
          + Tambah User
        </button>
      </div>

      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>#{user.id}</td>
                <td>
                  {user.username} 
                  {user.id === currentUser?.id && <span className="badge-me">(Anda)</span>}
                </td>
                <td>{user.email}</td>
                <td>{getRoleBadge(user.role)}</td>
                <td>{getStatusBadge(user.is_active)}</td>
                <td>{new Date(user.created_at).toLocaleDateString('id-ID')}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-edit" onClick={() => openEditModal(user)} title="Edit">
                      ✏️
                    </button>
                    {user.id !== currentUser?.id && (
                      <>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleDelete(user.id, user.username)}
                          title="Hapus"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{editingUser ? 'Password (kosongkan jika tidak diubah)' : 'Password'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="petugas">Petugas</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-save">
                  {editingUser ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default KelolaUser;