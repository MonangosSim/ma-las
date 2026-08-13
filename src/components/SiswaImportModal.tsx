import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { api } from "../api";
import type { Kelas } from "../types";
import Modal from "./Modal";
import { Loader2, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface ImportResult {
  inserted: number;
  updated: number;
  errors: { row: number; nisn: string; message: string }[];
  total: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  kelasList: Kelas[];
  onSuccess: () => void;
}

export default function SiswaImportModal({ open, onClose, kelasList, onSuccess }: Props) {
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreview([]);
    setFileName("");
    setError("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setError("");
    setResult(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const normalized = rows.map((r) => {
        const get = (keys: string[]) => {
          for (const k of keys) {
            for (const realKey of Object.keys(r)) {
              if (realKey.toLowerCase().trim() === k.toLowerCase().trim()) {
                return String(r[realKey] ?? "").trim();
              }
            }
          }
          return "";
        };
        return {
          nisn: get(["nisn", "nis", "nomor_induk"]),
          nama: get(["nama", "nama_lengkap", "nama_siswa"]),
          kelas: get(["kelas", "nama_kelas"]),
          jenis_kelamin: get(["jenis_kelamin", "jk", "gender", "l/p"]),
          tempat_lahir: get(["tempat_lahir", "tempat"]),
          tanggal_lahir: get(["tanggal_lahir", "tgl_lahir", "tanggal_lahir"]),
          alamat: get(["alamat"]),
          nama_ortu: get(["nama_ortu", "nama_orang_tua", "orang_tua", "wali"]),
          no_hp_ortu: get(["no_hp_ortu", "no_hp", "hp_ortu", "telepon", "telp"]),
          password_1: get(["password_1", "password_siswa", "password"]),
          password_2: get(["password_2", "password_ortu", "password_orang_tua"]),
        };
      });
      setPreview(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membaca file");
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const kelasMap: Record<string, string> = {};
      kelasList.forEach((k) => { kelasMap[k.nama_kelas] = k.id; });
      const res = await api.bulkImportSiswa({ siswaList: preview, kelasMap });
      setResult(res);
      setPreview([]);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengimport data");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { nisn: "1234567890", nama: "Contoh Siswa", kelas: "7A", jenis_kelamin: "L", tempat_lahir: "Jakarta", tanggal_lahir: "2010-01-15", alamat: "Jl. Contoh No. 1", nama_ortu: "Budi", no_hp_ortu: "081234567890" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "template_import_siswa.xlsx");
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Data Siswa dari Excel" size="lg">
      <div className="space-y-4">
        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-slate-900">Import Selesai</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Tambah Baru</div>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Diperbarui</div>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Gagal</div>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Baris dengan Error</span>
                </div>
                <ul className="space-y-1 text-xs text-red-700">
                  {result.errors.map((e, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>Baris {e.row}{e.nisn !== "-" && e.nisn ? ` (NISN: ${e.nisn})` : ""}: {e.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={handleClose} className="btn-primary">Selesai</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh template Excel untuk format yang sesuai</span>
              </div>
              <button onClick={downloadTemplate} className="btn-secondary text-sm">
                <Download className="w-4 h-4" />
                Template
              </button>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              {fileName ? (
                <p className="text-sm font-medium text-slate-700">{fileName}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-600">Klik untuk memilih file Excel/CSV</p>
                  <p className="text-xs text-slate-400 mt-1">Mendukung .xlsx, .xls, .csv</p>
                </>
              )}
            </div>

            {preview.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {preview.length} siswa siap diimport
                  </span>
                </div>
                <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">NISN</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Nama</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Kelas</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">L/P</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.slice(0, 50).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono text-slate-600">{r.nisn}</td>
                          <td className="px-3 py-1.5 text-slate-900">{r.nama}</td>
                          <td className="px-3 py-1.5 text-slate-600">{r.kelas}</td>
                          <td className="px-3 py-1.5 text-slate-600">{r.jenis_kelamin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 50 && (
                    <div className="px-3 py-2 text-center text-xs text-slate-400 bg-slate-50">
                      ...dan {preview.length - 50} baris lainnya
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={handleClose} className="btn-secondary" disabled={loading}>
                Batal
              </button>
              <button
                onClick={handleImport}
                className="btn-primary"
                disabled={loading || preview.length === 0}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading ? "Mengimport..." : `Import ${preview.length} Siswa`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
