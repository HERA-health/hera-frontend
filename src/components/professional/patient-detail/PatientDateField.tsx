import React, { useState } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button } from "../../common";
import { useTheme } from "../../../contexts/ThemeContext";
import { ProfileDatePickerModal } from "../../../screens/profile/components/ProfileDatePickerModal";
import { SchedulerCalendar } from "../../scheduling/SchedulerCalendar";
import { Copy, DetailDialog } from "./PatientDetailPrimitives";
import { civilDate, civilDateKey, civilDateLabel } from "./patientPresentation";

export function PatientDateField({
  label,
  value,
  onChange,
  disabled = false,
  birth = false,
}: {
  label: string;
  value: string;
  onChange: (day: string) => void;
  disabled?: boolean;
  birth?: boolean;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const selected = value
    ? civilDate(value)
    : new Date(new Date().getFullYear() - 30, 0, 1, 12);
  return (
    <View style={{ gap: 5 }}>
      <Copy>{label}</Copy>
      <Button
        variant="outline"
        disabled={disabled}
        accessibilityLabel={label}
        icon={
          <Ionicons name="calendar-outline" size={17} color={theme.primary} />
        }
        onPress={() => {
          setDraft(value || civilDateKey(new Date()));
          setOpen(true);
        }}
      >
        {value ? civilDateLabel(value) : "Seleccionar fecha"}
      </Button>
      {birth ? (
        <ProfileDatePickerModal
          visible={open}
          selectedDate={selected}
          minimumYear={Math.min(1900, selected.getFullYear())}
          maximumYear={Math.max(
            new Date().getFullYear(),
            selected.getFullYear(),
          )}
          maxDate={new Date()}
          description="Selecciona día, mes y año de nacimiento."
          onCancel={() => setOpen(false)}
          onConfirm={(date) => {
            onChange(civilDateKey(date));
            setOpen(false);
          }}
        />
      ) : (
        <DetailDialog
          maxWidth={420}
          title={label}
          visible={open}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="outline" onPress={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onPress={() => {
                  onChange(draft);
                  setOpen(false);
                }}
              >
                Aplicar fecha
              </Button>
            </>
          }
        >
          <SchedulerCalendar
            current={draft}
            markedDates={{ [draft]: { selected: true } }}
            onSelectDate={setDraft}
          />
        </DetailDialog>
      )}
    </View>
  );
}
