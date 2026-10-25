import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "../../common";
import { SimpleDropdown } from "../../common/SimpleDropdown";
import { SchedulerCalendar } from "../../scheduling/SchedulerCalendar";
import type { PatientSessionFilters as Filters } from "../../../services/patientDetailService";
import { getMadridDateKey } from "../../../utils/madridTime";
import { Copy, DetailDialog, pd } from "./PatientDetailPrimitives";
import { PatientFilters, ActivePatientFilters } from "./PatientFilters";
import {
  civilDateKey,
  civilDateLabel,
  patientPeriodBounds,
} from "./patientPresentation";

const definitions = [
  {
    key: "type",
    label: "Modalidad",
    options: [
      { value: "VIDEO_CALL", label: "Videollamada" },
      { value: "IN_PERSON", label: "Presencial" },
      { value: "PHONE_CALL", label: "Llamada" },
    ],
  },
  {
    key: "status",
    label: "Estado",
    options: [
      { value: "PENDING", label: "Pendiente" },
      { value: "CONFIRMED", label: "Confirmada" },
      { value: "COMPLETED", label: "Realizada" },
      { value: "CANCELLED", label: "Cancelada" },
    ],
  },
  {
    key: "payment",
    label: "Pago",
    options: [
      { value: "PAID", label: "Pagadas" },
      { value: "PENDING", label: "Pendientes de pago" },
      { value: "PACKAGE", label: "Con bono" },
    ],
  },
] as const;
export function PatientSessionFilters({
  query,
  onChange,
}: {
  query: Filters;
  onChange: (value: Partial<Filters>) => void;
}) {
  const [draft, setDraft] = useState(query);
  const [period, setPeriod] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [field, setField] = useState<"from" | "to">("from");
  const appliedFrom = query.from ? getMadridDateKey(new Date(query.from)) : "";
  const appliedTo = query.to ? getMadridDateKey(new Date(query.to)) : "";
  const periodLabel =
    appliedFrom || appliedTo
      ? `${appliedFrom ? civilDateLabel(appliedFrom) : "Sin inicio"} — ${appliedTo ? civilDateLabel(appliedTo) : "Sin fin"}`
      : "Todas las fechas";
  const valid = !from || !to || from <= to;
  return (
    <View style={{ gap: 8 }}>
      <View style={pd.filters}>
        <Button
          variant="outline"
          size="small"
          accessibilityLabel="Período de sesiones"
          onPress={() => {
            setFrom(appliedFrom);
            setTo(appliedTo);
            setField("from");
            setPeriod(true);
          }}
        >
          {periodLabel}
        </Button>
        <PatientFilters
          count={definitions.filter((item) => query[item.key]).length}
          onOpen={() => setDraft(query)}
          onClear={() =>
            setDraft((current) => ({
              ...current,
              type: "",
              status: "",
              payment: "",
            }))
          }
          onApply={() =>
            onChange({
              type: draft.type,
              status: draft.status,
              payment: draft.payment,
            })
          }
        >
          {definitions.map((item) => (
            <View key={item.key} style={{ gap: 5 }}>
              <Copy>{item.label}</Copy>
              <SimpleDropdown
                compact
                presentation="portal"
                keyboardNavigation
                accessibilityLabel={item.label}
                value={draft[item.key] || ""}
                onSelect={(value) =>
                  setDraft((current) => ({ ...current, [item.key]: value }))
                }
                options={[
                  { value: "", label: `Todos · ${item.label.toLowerCase()}` },
                  ...item.options,
                ]}
              />
            </View>
          ))}
        </PatientFilters>
      </View>
      <ActivePatientFilters
        items={[
          ...definitions.flatMap((item) =>
            query[item.key]
              ? [
                  {
                    key: item.key,
                    label:
                      item.options.find(
                        (option) => option.value === query[item.key],
                      )?.label ||
                      query[item.key] ||
                      "",
                    onRemove: () => onChange({ [item.key]: "" }),
                  },
                ]
              : [],
          ),
          ...(appliedFrom || appliedTo
            ? [
                {
                  key: "period",
                  label: periodLabel,
                  onRemove: () => onChange({ from: undefined, to: undefined }),
                },
              ]
            : []),
        ]}
      />
      <DetailDialog
        maxWidth={520}
        title="Período de sesiones"
        visible={period}
        onClose={() => setPeriod(false)}
        footer={
          <>
            <Button
              variant="outline"
              size="small"
              onPress={() => {
                setFrom("");
                setTo("");
              }}
            >
              Limpiar
            </Button>
            <Button
              variant="outline"
              size="small"
              onPress={() => setPeriod(false)}
            >
              Cancelar
            </Button>
            <Button
              size="small"
              disabled={!valid}
              onPress={() => {
                onChange(patientPeriodBounds(from, to));
                setPeriod(false);
              }}
            >
              Aplicar período
            </Button>
          </>
        }
      >
        <View style={pd.filters}>
          <Button
            variant={field === "from" ? "secondary" : "outline"}
            onPress={() => setField("from")}
          >
            Desde: {from ? civilDateLabel(from) : "Sin inicio"}
          </Button>
          <Button
            variant={field === "to" ? "secondary" : "outline"}
            onPress={() => setField("to")}
          >
            Hasta: {to ? civilDateLabel(to) : "Sin fin"}
          </Button>
        </View>
        <SchedulerCalendar
          current={(field === "from" ? from : to) || civilDateKey(new Date())}
          markedDates={{
            ...(from ? { [from]: { selected: true } } : {}),
            ...(to ? { [to]: { selected: true } } : {}),
          }}
          onSelectDate={(date) =>
            field === "from" ? setFrom(date) : setTo(date)
          }
        />
        <Button
          variant="outline"
          size="small"
          onPress={() => (field === "from" ? setFrom("") : setTo(""))}
        >
          Quitar {field === "from" ? "fecha inicial" : "fecha final"}
        </Button>
        <Copy muted>
          {valid
            ? "Puedes indicar solo una de las fechas o consultar todo el historial."
            : "La fecha final debe ser igual o posterior a la inicial."}
        </Copy>
      </DetailDialog>
    </View>
  );
}
