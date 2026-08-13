import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import type { Pengumuman, Kelas } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Plus, Pencil, Trash2, Search, Loader2, Megaphone, Users, GraduationCap, School } from "lucide-react";

const TINGKAT_OPTIONS = ["X", "XI", "XII"];

const tingkatBadge: Record<string, string> = {
  X: "bg-blue-100 text-blue-700",
  XI: "bg-teal-100 text-teal-700",
  XII: "bg-purple-100 text-purple-700",
};

interface FormState {
  judul: string;
  isi: string;
  tingkat: string;
  kelas_id: string;
}

const emptyForm: FormState = { judul: "", isi: "", tingkat: "", kelas_id: "" };

function getTargetLabel(p: Pengumuman): { text: string; icon: typeof Megaphone } {
  if (p.kelas_id && p.kelas?.nama_kelas) return { text: p.kelas.nama_kelas, icon: School };
  if (p.tingkat) return { text: `Kelas ${p.tingkat}`, icon: GraduationCap };
  return { text: "Semua Siswa", icon: Users };
}

export default function PengumumanManager() {
  const [data, setData] = useState<Pengumuman[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pengumuman | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Pengumuman | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([api.listPengumuman({ search }), api.listKelas()])
      .then(([pengRes, kelasRes]) => {
        setData(pengRes.data);
        setKelasList(kelasRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (p: Pengumuman) => {
    setEditing(p);
    setForm({
      judul: p.judul,
      isi: p.isi,
      tingkat: p.tingkat || "",
      kelas_id: p.kelas_id || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.judul.trim()) {
      setFormError("Judul wajib diisi");
      return;
    }
    if (!form.isi.trim()) {
      setFormError("Isi pengumuman wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        judul: form.judul,
        isi: form.isi,
        tingkat: form.kelas_id ? "" : form.tingkat,
        kelas_id: form.kelas_id || null,
      };
      if (editing) {
        await api.updatePengumuman(editing.id, payload);
      } else {
        await api.createPengumuman(payload);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePengumuman(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const filteredKelas = form.tingkat
    ? kelasList.filter((k) => k.tingkat === form.tingkat)
    : kelasList;

  return (
    <div>
      <PageHeader
        title="Pengumuman"
        subtitle="Kelola pengumuman untuk siswa"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Pengumuman
          </button>
        }
      />

      <div className="card mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengumuman..."
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="Belum ada pengumuman" subtitle="Klik 'Tambah Pengumuman' untuk membuat pengumuman pertama" />
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((p) => {
              const target = getTargetLabel(p);
              const TargetIcon = target.icon;
              return (
                <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-900">{p.judul}</h3>
                          <span className="badge bg-slate-100 text-slate-600 flex items-center gap-1">
                            <TargetIcon className="w-3 h-3" />
                            {target.text}
                          </span>
                          {p.tingkat && !p.kelas_id && (
                            <span className={`badge ${tingkatBadge[p.tingkat] || "bg-slate-100 text-slate-600"}`}>
                              {p.tingkat}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-wrap line-clamp-3">{p.isi}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {p.created_by && `oleh ${p.created_by} • `}
                          {p.created_at ? new Date(p.created_at).toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric",
                          }) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(p)} className="btn-icon" title="Edit">
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="btn-icon hover:bg-red-50"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Pengumuman" : "Tambah Pengumuman"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Judul *</label>
            <input
              type="text"
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              className="input-field"
              placeholder="Judul pengumuman..."
              disabled={saving}
            />
          </div>
          <div>
            <label className="input-label">Isi Pengumuman *</label>
            <textarea
              value={form.isi}
              onChange={(e) => setForm({ ...form, isi: e.target.value })}
              className="input-field min-h-[120px] resize-y"
              placeholder="Tulis isi pengumuman..."
              disabled={saving}
            />
          </div>

          {/* Target audience */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Target Penerima</p>
            <p className="text-xs text-slate-500">
              Pilih tingkat atau kelas spesifik untuk membatasi penerima. Kosongkan keduanya untuk kirim ke semua siswa.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Tingkat</label>
                <select
                  value={form.tingkat}
                  onChange={(e) => setForm({ ...form, tingkat: e.target.value, kelas_id: "" })}
                  className="input-field"
                  disabled={saving || !!form.kelas_id}
                >
                  <option value="">Semua tingkat</option>
                  {TINGKAT_OPTIONS.map((t) => (
                    <option key={t} value={t}>Kelas {t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Kelas Spesifik</label>
                <select
                  value={form.kelas_id}
                  onChange={(e) => setForm({ ...form, kelas_id: e.target.value, tingkat: "" })}
                  className="input-field"
                  disabled={saving}
                >
                  <option value="">Semua kelas</option>
                  {filteredKelas.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                  ))}
                </select>
              </div>
            </div>
            {(form.tingkat || form.kelas_id) && (
              <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
                <Megaphone className="w-3.5 h-3.5" />
                {form.kelas_id
                  ? `Pengumuman khusus untuk kelas ${kelasList.find((k) => k.id === form.kelas_id)?.nama_kelas || ""}`
                  : `Pengumuman khusus untuk seluruh kelas ${form.tingkat}`}
              </div>
            )}
            {!form.tingkat && !form.kelas_id && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">
                <Users className="w-3.5 h-3.5" />
                Pengumuman akan dikirim ke semua siswa
              </div>
            )}
          </div>

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary" disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Pengumuman"
        message={`Apakah Anda yakin ingin menghapus pengumuman "${deleteTarget?.judul}"?`}
        loading={deleting}
      />
    </div>
  );
}
