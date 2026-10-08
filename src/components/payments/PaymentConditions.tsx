import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PaymentCountrySelect, PaymentCheckboxMark } from "./PaymentPresentation";
import { useTheme } from "../../contexts/ThemeContext";
import type { PaymentAcceptance } from "../../services/sessionPaymentService";
import type { BookingQuote } from "../../services/sessionsService";

const emptyBilling = {
  fiscalName: "",
  fiscalTaxId: "",
  fiscalAddress: "",
  fiscalPostalCode: "",
  fiscalCity: "",
  fiscalCountry: "",
};
export function PaymentConditions({
  quote,
  value,
  onChange,
}: {
  quote: BookingQuote;
  value?: PaymentAcceptance;
  onChange: (value?: PaymentAcceptance) => void;
}) {
  const { theme } = useTheme();
  const [country, setCountry] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [full, setFull] = useState(false);
  const [billing, setBilling] = useState(emptyBilling);
  const body = {
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 15,
    lineHeight: 23,
  };
  const needBilling = full || quote.payment?.fullInvoiceRequired;
  if (quote.payment?.mode !== "ONLINE") return null;
  const valid =
    country && (!needBilling || Object.values(billing).every((v) => v.trim()));
  return (
    <View
      style={{
        gap: 14,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text
        style={{
          color: theme.textPrimary,
          fontFamily: theme.fontSansBold,
          fontSize: 20,
        }}
      >
        Pago y cancelación
      </Text>
      <Text style={body}>
        Pagas al reservar, sin recargo por tarjeta. Si cancelas con al menos 24
        horas de antelación, se devuelve el importe pendiente.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Condiciones de pago y cancelación"
        accessibilityState={{ expanded: showDetails }}
        onPress={() => setShowDetails(!showDetails)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 44,
          alignSelf: "flex-start",
        }}
      >
        <Text
          style={[
            body,
            {
              color: theme.primary,
              fontFamily: theme.fontSansSemiBold,
              flexShrink: 1,
            },
          ]}
        >
          Condiciones de pago y cancelación
        </Text>
        <Feather
          name={showDetails ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.primary}
        />
      </Pressable>
      {showDetails && (
        <View
          style={{
            gap: 12,
            padding: 16,
            borderRadius: 12,
            backgroundColor: theme.bg,
          }}
        >
          <Text style={body}>
            El pago se realiza directamente a tu especialista e incluye los
            impuestos indicados.
          </Text>
          <Text style={body}>
            Con menos de 24 horas de antelación, una cita confirmada no tiene
            devolución automática. Si cancelas una solicitud aún sin aceptar, se
            devuelve el importe pendiente. También se devuelve si tu
            especialista rechaza, cancela o no acepta a tiempo.
          </Text>
          <Text style={body}>
            Si la cita requiere aceptación, tu especialista tiene hasta 24 horas
            desde el pago o hasta una hora antes de la cita, lo que ocurra
            primero.
          </Text>
        </View>
      )}
      <PaymentCountrySelect country={country} onChange={value => { setCountry(value); onChange(undefined); }} />
      {!quote.payment.fullInvoiceRequired && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Añadir mis datos fiscales a la factura (opcional)"
          accessibilityState={{ checked: full }}
          onPress={() => {
            setFull(!full);
            onChange(undefined);
          }}
          style={{
            paddingVertical: 8,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <PaymentCheckboxMark checked={full} />
          <Text style={[body, { flex: 1 }]}>
            Añadir mis datos fiscales a la factura (opcional)
          </Text>
        </Pressable>
      )}
      <Text style={[body, { fontSize: 13, lineHeight: 20 }]}>
        HERA emitirá la factura y te la enviará por correo. Estos datos sirven
        para incluir tu nombre fiscal, NIF y dirección en esa misma factura.
      </Text>
      {needBilling && (
        <View style={{ gap: 10 }}>
          <Text style={[body, { color: theme.textPrimary }]}>
            Tus datos fiscales
          </Text>
          {(Object.keys(emptyBilling) as (keyof typeof emptyBilling)[]).map(
            (key) => {
              const label = {
                fiscalName: "Nombre fiscal",
                fiscalTaxId: "NIF / identificación fiscal",
                fiscalAddress: "Domicilio fiscal",
                fiscalPostalCode: "Código postal",
                fiscalCity: "Ciudad",
                fiscalCountry: "País fiscal",
              }[key];
              return (
                <TextInput
                  key={key}
                  value={billing[key]}
                  accessibilityLabel={label}
                  placeholder={label}
                  placeholderTextColor={theme.textSecondary}
                  onChangeText={(text) => {
                    setBilling({ ...billing, [key]: text });
                    onChange(undefined);
                  }}
                  style={{
                    color: theme.textPrimary,
                    fontFamily: theme.fontSans,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                  }}
                />
              );
            },
          )}
        </View>
      )}
      {!quote.payment.available && (
        <Text accessibilityRole="alert" style={[body, { color: theme.error }]}>
          Los cobros de este especialista no están disponibles temporalmente.
        </Text>
      )}
      <Pressable
        accessibilityLabel="Acepto estas condiciones de pago y cancelación."
        disabled={!valid || !quote.payment.available}
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: Boolean(value),
          disabled: !valid || !quote.payment.available,
        }}
        onPress={() =>
          onChange(
            value
              ? undefined
              : {
                  termsVersion: quote.payment!.termsVersion,
                  country,
                  ...(needBilling ? { billing } : {}),
                },
          )
        }
        style={{
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: valid && quote.payment.available ? 1 : 0.6,
        }}
      >
        <PaymentCheckboxMark checked={Boolean(value)} />
        <Text style={[body, { flex: 1, color: theme.textPrimary }]}>
          Acepto estas condiciones de pago y cancelación.
        </Text>
      </Pressable>
    </View>
  );
}
