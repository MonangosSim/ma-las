import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "../api";
import type { TahunAjaran } from "../types";

interface TahunAjaranContextValue {
  tahunAjaranList: TahunAjaran[];
  activeTahunAjaran: TahunAjaran | null;
  selectedTahunAjaranId: string;
  selectedSemester: string;
  setSelectedTahunAjaranId: (id: string) => void;
  setSelectedSemester: (s: string) => void;
  refresh: () => void;
  loading: boolean;
}

const TahunAjaranContext = createContext<TahunAjaranContextValue | null>(null);

const STORAGE_KEY_TA = "ma-las-selected-ta";
const STORAGE_KEY_SEM = "ma-las-selected-semester";

export function TahunAjaranProvider({ children }: { children: ReactNode }) {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState(
    () => localStorage.getItem(STORAGE_KEY_TA) || "",
  );
  const [selectedSemester, setSelectedSemester] = useState(
    () => localStorage.getItem(STORAGE_KEY_SEM) || "Ganjil",
  );

  const refresh = () => {
    setLoading(true);
    api.listTahunAjaran()
      .then((res) => {
        setTahunAjaranList(res.data);
        const active = res.data.find((t) => t.is_active);
        if (!selectedTahunAjaranId && active) {
          setSelectedTahunAjaranId(active.id);
        }
        if (active && !localStorage.getItem(STORAGE_KEY_SEM)) {
          setSelectedSemester(active.semester_aktif);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (selectedTahunAjaranId) localStorage.setItem(STORAGE_KEY_TA, selectedTahunAjaranId);
  }, [selectedTahunAjaranId]);

  useEffect(() => {
    if (selectedSemester) localStorage.setItem(STORAGE_KEY_SEM, selectedSemester);
  }, [selectedSemester]);

  const activeTahunAjaran = tahunAjaranList.find((t) => t.id === selectedTahunAjaranId) || null;

  return (
    <TahunAjaranContext.Provider
      value={{
        tahunAjaranList,
        activeTahunAjaran,
        selectedTahunAjaranId,
        selectedSemester,
        setSelectedTahunAjaranId,
        setSelectedSemester,
        refresh,
        loading,
      }}
    >
      {children}
    </TahunAjaranContext.Provider>
  );
}

export function useTahunAjaran() {
  const ctx = useContext(TahunAjaranContext);
  if (!ctx) throw new Error("useTahunAjaran must be used within TahunAjaranProvider");
  return ctx;
}
