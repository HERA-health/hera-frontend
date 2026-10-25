import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Button } from "../../common";
import {
  getPatientSessions,
  type PatientSessionPage,
  type PatientSessionListItem,
} from "../../../services/patientDetailService";
import { getErrorMessage } from "../../../constants/errors";
import { PatientPagination } from "./PatientPagination";
import {
  Copy,
  DetailDialog,
  Input,
  LoadState,
  patientDate,
  pd,
} from "./PatientDetailPrimitives";

// Session associations use the same bounded administrative list as the Sessions
// tab. Opening an editor never requires downloading the patient's full history.
export function PatientSessionPicker({
  clientId,
  value,
  onSelect,
  label,
  emptyLabel,
  selectedLabel,
  disabled = false,
}: {
  clientId: string;
  value: string;
  onSelect: (id: string, session?: PatientSessionListItem) => void;
  label: string;
  emptyLabel: string;
  selectedLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PatientSessionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [chosen, setChosen] = useState<PatientSessionListItem>();
  useEffect(() => {
    if (!open || disabled) return;
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    const timer = setTimeout(() => {
      void getPatientSessions(clientId, { page, search })
        .then((next) => {
          if (active) setData(next);
        })
        .catch((e: unknown) => {
          if (active)
            setError(getErrorMessage(e, "No se pudieron cargar las sesiones."));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [clientId, open, page, search, revision, disabled]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const choose = (id: string, session?: PatientSessionListItem) => {
    onSelect(id, session);
    setChosen(session);
    setOpen(false);
  };
  return (
    <View style={pd.stack}>
      <Button
        size="small"
        variant="outline"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        {value
          ? selectedLabel ||
            (chosen?.id === value
              ? patientDate(chosen.date, true)
              : "Sesión vinculada")
          : emptyLabel}
      </Button>
      <DetailDialog
        title={label}
        visible={open && !disabled}
        onClose={() => setOpen(false)}
      >
        <Input
          accessibilityLabel="Buscar sesión por servicio o tarifa"
          placeholder="Buscar por servicio o tarifa…"
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
        />
        <Button size="small" variant="outline" onPress={() => choose("")}>
          {emptyLabel}
        </Button>
        <LoadState
          loading={loading}
          error={error}
          onRetry={() => setRevision((current) => current + 1)}
        />
        {data?.items.map((session) => (
          <Button
            key={session.id}
            size="small"
            variant={value === session.id ? "primary" : "outline"}
            onPress={() => choose(session.id, session)}
          >
            {patientDate(session.date, true)} · {session.duration} min
          </Button>
        ))}
        {data && !data.total ? (
          <Copy muted>No hay sesiones con estos filtros.</Copy>
        ) : null}
        {data && data.totalPages > 1 ? (
          <PatientPagination
            page={page}
            totalPages={data.totalPages}
            hasNext={page < data.totalPages}
            loading={loading}
            onPrevious={() => setPage((current) => current - 1)}
            onNext={() => setPage((current) => current + 1)}
          />
        ) : null}
      </DetailDialog>
    </View>
  );
}
