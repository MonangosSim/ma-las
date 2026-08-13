import { useState } from "react";
import { api } from "../api";
import Modal from "./Modal";
import { Loader2, CheckCircle2 } from "lucide-react";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Semua field wajib diisi");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password baru minimal 4 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sesuai");
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setSuccess(true);
      setTimeout(() => handleClose(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Ubah Password" size="sm">
      {success ? (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-slate-900">Password berhasil diubah</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Password Lama</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="input-field"
              disabled={loading}
              autoFocus
            />
          </div>
          <div>
            <label className="input-label">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              disabled={loading}
            />
            <p className="text-xs text-slate-400 mt-1">Minimal 4 karakter</p>
          </div>
          <div>
            <label className="input-label">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary" disabled={loading}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Memproses..." : "Simpan"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
