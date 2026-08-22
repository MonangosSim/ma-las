import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../api";
import type { Nilai, Siswa, MataPelajaran, Kelas } from "../../types";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "../../components/UIStates";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useTahunAjaran } from "../../context/TahunAjaranContext";
import { Plus, Pencil, Trash2, Search, Loader2, CalendarRange, Table, Grid3x3, ArrowUpDown } from "lucide-react";

interface FormState {
  siswa_id: string;
  mata_pelajaran: string;
  jenis_nilai: string;
  nilai: string;
}

const emptyForm: FormState = {
  siswa_id: "",
  mata_pelajaran: "",
  jenis_nilai: "Harian",
  nilai: "0",
};

function getGradeColor(nilai: number): string {
  if (nilai >= 90) return "bg-emerald-100 text-emerald-700";
  if (nilai >= 75) return "bg-teal-100 text-teal-700";
  if (nilai >= 60) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function getGradeLabel(nilai: number): string {
  if (nilai >= 90) return "A";
  if (nilai >= 80) return "B";
  if (nilai >= 70) return "C";
  if (nilai >= 60) return "D";
  return "E";
}

export default function NilaiManager() {
  const { selectedTahunAjaranId, selectedSemester, tahunAjaranList } = useTahunAjaran();
  const tahunAjaranMap = new Map(tahunAjaranList.map((t) => [t.id, t.nama]));
  const activeTahunAjaranNama = tahunAjaranMap.get(selectedTahunAjaranId) || "";
  const [data, setData] = useState<Nilai[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("");
  const [sortBy, setSortBy] = useState<"nama" | "kelas">("nama");
  const [viewMode, setViewMode] = useState<"pivot" | "list">("pivot");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Nilai | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Nilai | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.listNilai({ tahun_ajaran_id: selectedTahunAjaranId, semester: selectedSemester }),
      api.listSiswa(),
      api.listMataPelajaran(),
      api.listKelas(),
    ])
      .then(([nilaiRes, siswaRes, mapelRes, kelasRes]) => {
        setData(nilaiRes.data);
        setSiswaList(siswaRes.data);
        setMapelList(mapelRes.data);
        setKelasList(kelasRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedTahunAjaranId, selectedSemester]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const siswaMap = new Map(siswaList.map((s) => [s.id, s]));
  const kelasMap = new Map(kelasList.map((k) => [k.id, k]));

  // Siswa in selected kelas (or all if no filter), filtered by search, then sorted
  const filteredSiswa = useMemo(() => {
    let result = kelasFilter ? siswaList.filter((s) => s.kelas_id === kelasFilter) : siswaList;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.nama.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "kelas") {
        const ka = kelasMap.get(a.kelas_id || "")?.nama_kelas || "";
        const kb = kelasMap.get(b.kelas_id || "")?.nama_kelas || "";
        return ka.localeCompare(kb) || a.nama.localeCompare(b.nama);
      }
      return a.nama.localeCompare(b.nama);
    });
    return result;
  }, [siswaList, kelasFilter, search, sortBy, kelasMap]);

  const filteredSiswaIds = useMemo(() => new Set(filteredSiswa.map((s) => s.id)), [filteredSiswa]);

  // Nilai entries filtered by kelas (via siswa) and search
  const filteredData = useMemo(() => {
    return data.filter((n) => {
      if (kelasFilter && !filteredSiswaIds.has(n.siswa_id)) return false;
      const siswa = siswaMap.get(n.siswa_id);
      if (search.trim() && siswa && !siswa.nama.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, kelasFilter, filteredSiswaIds, search, siswaMap]);

  const INFO_MATPEL = "Informatika";

  // Informatika nilai per siswa: siswa_id -> array of {id, nilai, jenis_nilai}
  const informatikaData = useMemo(() => {
    const map = new Map<string, { id: string; nilai: number; jenis: string }[]>();
    filteredData
      .filter((n) => n.mata_pelajaran === INFO_MATPEL)
      .forEach((n) => {
        if (!map.has(n.siswa_id)) map.set(n.siswa_id, []);
        map.get(n.siswa_id)!.push({ id: n.id, nilai: Number(n.nilai), jenis: n.jenis_nilai });
      });
    return map;
  }, [filteredData]);

  // Max number of Informatika nilai entries across all students (for N1, N2, ... columns)
  const maxInformatikaCount = useMemo(() => {
    let max = 0;
    informatikaData.forEach((arr) => {
      if (arr.length > max) max = arr.length;
    });
    return max;
  }, [informatikaData]);

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, siswa_id: kelasFilter ? "" : "" });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (n: Nilai) => {
    setEditing(n);
    setForm({
      siswa_id: n.siswa_id,
      mata_pelajaran: n.mata_pelajaran,
      jenis_nilai: n.jenis_nilai,
      nilai: String(n.nilai),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.siswa_id || !form.mata_pelajaran) {
      setFormError("Siswa dan mata pelajaran wajib diisi");
      return;
    }
    if (!selectedTahunAjaranId) {
      setFormError("Pilih tahun ajaran di header terlebih dahulu");
      return;
    }
    const nilaiNum = parseFloat(form.nilai);
    if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 100) {
      setFormError("Nilai harus berupa angka antara 0 dan 100");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        siswa_id: form.siswa_id,
        mata_pelajaran: form.mata_pelajaran,
        jenis_nilai: form.jenis_nilai,
        nilai: nilaiNum,
        semester: selectedSemester,
        tahun_ajaran_id: selectedTahunAjaranId || null,
      };
      if (editing) {
        await api.updateNilai(editing.id, payload);
      } else {
        await api.createNilai(payload);
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
      await api.deleteNilai(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  // Siswa options for the form modal (filtered by kelas if set)
  const formSiswaOptions = kelasFilter ? filteredSiswa : siswaList;

  return (
    <div>
      <PageHeader
        title="Manajemen Nilai"
        subtitle="Kelola nilai akademik siswa per mata pelajaran"
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Nilai
          </button>
        }
      />

      <div className="card mb-4 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa..."
              className="input-field pl-10"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="input-field"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
          </div>
          <div className="relative sm:w-44">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "nama" | "kelas")}
              className="input-field pl-10"
            >
              <option value="nama">Urut: Nama</option>
              <option value="kelas">Urut: Kelas</option>
            </select>
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode("pivot")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === "pivot" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Tabel Pivot per Siswa"
            >
              <Grid3x3 className="w-4 h-4" />
              Pivot
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === "list" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Daftar Nilai"
            >
              <Table className="w-4 h-4" />
              Daftar
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : viewMode === "pivot" ? (
          filteredSiswa.length === 0 ? (
            <EmptyState title="Belum ada data nilai" subtitle="Pilih kelas untuk melihat pivot nilai Informatika" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[180px]">
                      Nama Siswa
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[100px]">
                      Kelas
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 min-w-[70px] bg-teal-50">
                      Jml Nilai
                    </th>
                    {Array.from({ length: maxInformatikaCount }, (_, i) => (
                      <th key={i} className="text-center px-3 py-3 font-semibold text-slate-700 min-w-[70px] whitespace-nowrap">
                        N{i + 1}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 min-w-[90px] bg-blue-50">
                      Rata-rata
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700 min-w-[70px] bg-blue-50">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.map((s) => {
                    const arr = informatikaData.get(s.id) || [];
                    const paddedArr = Array.from({ length: maxInformatikaCount }, (_, i) => arr[i]?.nilai ?? 0);
                    const rata = avg(paddedArr);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-700">
                              {s.nama.charAt(0).toUpperCase()}
                            </div>
                            <span>{s.nama}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 sticky left-[180px] bg-white z-10">
                          {s.kelas_id ? kelasMap.get(s.kelas_id)?.nama_kelas || "-" : "-"}
                        </td>
                        <td className="px-3 py-3 text-center bg-teal-50/50">
                          <span className="badge bg-teal-100 text-teal-700 font-semibold">{arr.length}</span>
                        </td>
                        {Array.from({ length: maxInformatikaCount }, (_, i) => {
                          const item = arr[i];
                          if (!item) {
                            return (
                              <td key={i} className="px-3 py-3 text-center">
                                <span className="badge bg-slate-100 text-slate-400">0</span>
                              </td>
                            );
                          }
                          return (
                            <td key={i} className="px-3 py-3 text-center" title={item.jenis}>
                              <span className={`badge ${getGradeColor(item.nilai)}`}>{item.nilai}</span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center bg-blue-50/50">
                          <span className={`badge ${getGradeColor(rata)} font-semibold`}>
                            {rata.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center bg-blue-50/50 font-semibold text-slate-700">
                          {getGradeLabel(rata)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : filteredData.length === 0 ? (
          <EmptyState title="Belum ada data nilai" subtitle="Klik 'Tambah Nilai' untuk membuat data pertama" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Siswa</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Mata Pelajaran</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Jenis</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Nilai</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Grade</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Periode</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((n) => {
                  const siswa = siswaMap.get(n.siswa_id);
                  const nilaiNum = Number(n.nilai);
                  return (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {siswa?.nama || "Siswa tidak ditemukan"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{n.mata_pelajaran}</td>
                      <td className="px-4 py-3 text-slate-600">{n.jenis_nilai}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${getGradeColor(nilaiNum)}`}>{nilaiNum}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {getGradeLabel(nilaiNum)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {n.semester}{n.tahun_ajaran_id && tahunAjaranMap.get(n.tahun_ajaran_id) ? ` — ${tahunAjaranMap.get(n.tahun_ajaran_id)}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(n)} className="btn-icon" title="Edit">
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(n)}
                            className="btn-icon hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Nilai" : "Tambah Nilai"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Siswa *</label>
            <select
              value={form.siswa_id}
              onChange={(e) => setForm({ ...form, siswa_id: e.target.value })}
              className="input-field"
              disabled={saving}
            >
              <option value="">Pilih siswa</option>
              {formSiswaOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} — {s.nisn}
                </option>
              ))}
            </select>
            {kelasFilter && (
              <p className="text-xs text-slate-400 mt-1">
                Menampilkan siswa dari kelas: {kelasMap.get(kelasFilter)?.nama_kelas}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Mata Pelajaran *</label>
              <select
                value={form.mata_pelajaran}
                onChange={(e) => setForm({ ...form, mata_pelajaran: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="">Pilih mata pelajaran</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.nama}>{m.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Jenis Nilai *</label>
              <select
                value={form.jenis_nilai}
                onChange={(e) => setForm({ ...form, jenis_nilai: e.target.value })}
                className="input-field"
                disabled={saving}
              >
                <option value="Harian">Harian</option>
                <option value="Tugas">Tugas</option>
                <option value="UTS">UTS</option>
                <option value="UAS">UAS</option>
              </select>
            </div>
            <div>
              <label className="input-label">Nilai (0-100) *</label>
              <input
                type="number"
                value={form.nilai}
                onChange={(e) => setForm({ ...form, nilai: e.target.value })}
                className="input-field"
                min="0"
                max="100"
                disabled={saving}
              />
            </div>
            <div>
              <label className="input-label">Periode</label>
              <div className="input-field bg-slate-50 text-slate-600 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{selectedSemester} — {activeTahunAjaranNama || "Belum dipilih"}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Mengikuti periode aktif di header</p>
            </div>
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
        title="Hapus Nilai"
        message="Apakah Anda yakin ingin menghapus data nilai ini?"
        loading={deleting}
      />
    </div>
  );
}
