import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { lightTheme as mockTheme } from "../../../constants/theme";
import { PatientActionsMenu } from "../patient-detail/PatientActionsMenu";
import { PatientSessionFilters } from "../patient-detail/PatientSessionFilters";
import { PatientDateField } from "../patient-detail/PatientDateField";
import { ProfileDatePickerModal } from "../../../screens/profile/components/ProfileDatePickerModal";
import {
  civilDate,
  civilDateKey,
  patientCountry,
  patientPeriodBounds,
} from "../patient-detail/patientPresentation";

jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));
jest.mock("../../common/AnimatedPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    AnimatedPressable: ({
      focusRef,
      children,
      ...props
    }: {
      focusRef?: React.Ref<unknown>;
      children: React.ReactNode;
    }) => {
      React.useImperativeHandle(focusRef, () => ({
        measureInWindow: (
          callback: (x: number, y: number, w: number, h: number) => void,
        ) => callback(100, 80, 80, 40),
        focus: jest.fn(),
      }));
      return <Pressable {...props}>{children}</Pressable>;
    },
  };
});
let mockDay = "2026-02-01";
jest.mock("../../scheduling/SchedulerCalendar", () => {
  const { Pressable, Text } = require("react-native");
  return {
    SchedulerCalendar: ({
      onSelectDate,
    }: {
      onSelectDate: (day: string) => void;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Elegir día del calendario"
        onPress={() => onSelectDate(mockDay)}
      >
        <Text>Calendario</Text>
      </Pressable>
    ),
  };
});

test("localizes Spain without changing unknown country values or civil birth dates", () => {
  for (const value of ["Spain", "ES", "españa", "ESPANA"])
    expect(patientCountry(value)).toBe("España");
  expect(patientCountry("Valor anterior")).toBe("Valor anterior");
  expect(civilDateKey(civilDate("1992-02-29"))).toBe("1992-02-29");
});

test("date ranges include the complete Madrid day across both DST transitions and support open ends", () => {
  expect(patientPeriodBounds("2026-03-29", "2026-03-29")).toEqual({
    from: "2026-03-28T23:00:00.000Z",
    to: "2026-03-29T21:59:59.999Z",
  });
  expect(patientPeriodBounds("2026-10-25", "2026-10-25")).toEqual({
    from: "2026-10-24T22:00:00.000Z",
    to: "2026-10-25T22:59:59.999Z",
  });
  expect(patientPeriodBounds("", "2026-10-25")).toEqual({
    from: undefined,
    to: "2026-10-25T22:59:59.999Z",
  });
  expect(patientPeriodBounds("", "")).toEqual({
    from: undefined,
    to: undefined,
  });
});

test("the patient birth selector preserves an underage birth date instead of inheriting the adult account limit", () => {
  const change = jest.fn();
  render(
    <PatientDateField
      label="Nacimiento del paciente"
      value="2010-02-28"
      birth
      onChange={change}
    />,
  );
  fireEvent.press(screen.getByLabelText("Nacimiento del paciente"));
  expect(screen.getByText("2010")).toBeTruthy();
  fireEvent.press(screen.getByText("Confirmar"));
  expect(change).toHaveBeenCalledWith("2010-02-28");
});

test("More opens an independent menu, invokes an action once and closes it", () => {
  const action = jest.fn();
  render(
    <PatientActionsMenu
      items={[
        {
          label: "Editar datos personales",
          icon: "create-outline",
          onPress: action,
        },
        {
          label: "Email",
          icon: "mail-outline",
          disabled: true,
          onPress: jest.fn(),
        },
      ]}
    />,
    {
      createNodeMock: () => ({
        measureInWindow: (
          callback: (x: number, y: number, w: number, h: number) => void,
        ) => callback(100, 80, 80, 40),
        focus: jest.fn(),
      }),
    },
  );
  expect(screen.queryByRole("menu")).toBeNull();
  fireEvent.press(screen.getByLabelText("Más acciones del paciente"));
  expect(screen.getByRole("menu")).toBeTruthy();
  fireEvent.press(
    screen.getByRole("menuitem", { name: "Editar datos personales" }),
  );
  expect(action).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("menu")).toBeNull();
});

test("birth selection keeps leap days and clamps them when changing to a non-leap year", () => {
  const confirm = jest.fn();
  render(
    <ProfileDatePickerModal
      visible
      selectedDate={new Date(2024, 1, 29)}
      maximumYear={2026}
      onConfirm={confirm}
      onCancel={jest.fn()}
    />,
  );
  fireEvent.press(screen.getByText("Confirmar"));
  expect(civilDateKey(confirm.mock.calls[0][0])).toBe("2024-02-29");
  fireEvent.press(screen.getByText("2025"));
  expect(screen.getByText("28 de Febrero de 2025")).toBeTruthy();
  fireEvent.press(screen.getByText("Confirmar"));
  expect(civilDateKey(confirm.mock.calls[1][0])).toBe("2025-02-28");
});

test("session period applies a range longer than 42 days as one change and Cancel discards it", () => {
  const change = jest.fn();
  render(<PatientSessionFilters query={{ page: 2 }} onChange={change} />);
  fireEvent.press(screen.getByLabelText("Período de sesiones"));
  mockDay = "2026-02-01";
  fireEvent.press(screen.getByLabelText("Elegir día del calendario"));
  fireEvent.press(screen.getByText("Hasta: Sin fin"));
  mockDay = "2026-10-25";
  fireEvent.press(screen.getByLabelText("Elegir día del calendario"));
  expect(change).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Aplicar período"));
  expect(change).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledWith(
    patientPeriodBounds("2026-02-01", "2026-10-25"),
  );
  fireEvent.press(screen.getByLabelText("Período de sesiones"));
  mockDay = "2026-01-01";
  fireEvent.press(screen.getByLabelText("Elegir día del calendario"));
  fireEvent.press(screen.getByText("Cancelar"));
  expect(change).toHaveBeenCalledTimes(1);
});
