import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../../contexts/ThemeContext';

export type QuestionnairePictogramName =
  | 'individual'
  | 'couple'
  | 'family'
  | 'child'
  | 'online'
  | 'in-person'
  | 'under50'
  | '50to70'
  | 'over70'
  | 'budget-any'
  | 'first'
  | 'positive'
  | 'uncomfortable'
  | 'several'
  | 'woman'
  | 'man'
  | 'nonbinary'
  | 'gender-any';
const pictures: Record<string, Record<string, QuestionnairePictogramName>> = {
  therapyType: {
    individual: 'individual',
    couple: 'couple',
    family: 'family',
    child: 'child',
  },
  modalities: { online: 'online', 'in-person': 'in-person' },
  budget: {
    under50: 'under50',
    '50to70': '50to70',
    over70: 'over70',
    any: 'budget-any',
  },
  previousTherapy: {
    first: 'first',
    positive: 'positive',
    uncomfortable: 'uncomfortable',
    several: 'several',
  },
  gender: {
    woman: 'woman',
    man: 'man',
    nonbinary: 'nonbinary',
    any: 'gender-any',
  },
};
export const questionnairePictogram = (field: string, value: string) =>
  pictures[field]?.[value];

export function QuestionnairePictogram({
  name,
  size = 48,
}: {
  name: QuestionnairePictogramName;
  size?: number;
}) {
  const { theme } = useTheme();
  const person = (x: number, y: number, scale = 1) => (
    <G transform={'translate(' + x + ',' + y + ') scale(' + scale + ')'}>
      <Circle cx="0" cy="0" r="5" fill={theme.bgCard} />
      <Path d="M-10 21v-5a10 10 0 0 1 20 0v5Z" fill={theme.secondaryMuted} />
    </G>
  );
  let drawing: React.ReactNode;
  switch (name) {
    case 'woman':
      drawing = (
        <>
          <Path
            d="M19 31V20a13 13 0 0 1 26 0v17H19"
            fill={theme.secondaryMuted}
          />
          <Path
            d="M24 19q8 1 13-6l4 8v6a9 9 0 0 1-18 0v-7"
            fill={theme.bgCard}
          />
          <Path d="M14 54v-7q0-12 18-12t18 12v7Z" fill={theme.secondaryMuted} />
          <Path d="m26 36 6 7 6-7" />
        </>
      );
      break;
    case 'man':
      drawing = (
        <>
          <Path
            d="M21 24v-8q2-10 14-8 11 2 9 13l-7-5-16 4Z"
            fill={theme.secondaryMuted}
          />
          <Path d="M22 20v7a10 10 0 0 0 20 0v-8" fill={theme.bgCard} />
          <Path d="M14 54v-7q0-12 18-12t18 12v7Z" fill={theme.secondaryMuted} />
          <Path d="m26 36 6 7 6-7" />
        </>
      );
      break;
    case 'nonbinary':
      drawing = (
        <>
          <Path
            d="M20 28q-7-20 11-20 16-4 14 17l-9-9-15 6"
            fill={theme.secondaryMuted}
          />
          <Path d="M22 21v7a10 10 0 0 0 20 0v-7" fill={theme.bgCard} />
          <Path d="M14 54v-7q0-12 18-12t18 12v7Z" fill={theme.secondaryMuted} />
          <Path d="M25 37q7 11 14 0" />
        </>
      );
      break;
    case 'individual':
      drawing = (
        <>
          {person(32, 22, 1.35)}
          <Path d="M25 21h1m11 0h1m-9 8q3 3 6 0" />
        </>
      );
      break;
    case 'couple':
      drawing = (
        <>
          {person(20, 22)}
          {person(44, 22)}
          <Path
            d="M32 18c-9-7-13-14-7-16 4-1 7 3 7 3s3-4 7-3c6 2 2 9-7 16Z"
            transform="translate(8,13) scale(.75)"
            fill={theme.secondaryMuted}
          />
        </>
      );
      break;
    case 'family':
      drawing = (
        <>
          {person(18, 21)}
          {person(46, 21)}
          {person(32, 34, 0.8)}
        </>
      );
      break;
    case 'gender-any':
      drawing = (
        <>
          {person(17, 23, 0.9)}
          {person(47, 23, 0.9)}
          {person(32, 17, 1.2)}
        </>
      );
      break;
    case 'child':
      drawing = (
        <>
          <Circle cx="32" cy="29" r="16" fill={theme.bgCard} />
          <Path d="M24 17q0-10 8-8 6 3-1 7M24 27h1m14 0h1m-15 9q7 7 14 0M17 53q15-15 30 0" />
        </>
      );
      break;
    case 'online':
      drawing = (
        <>
          <Rect
            x="10"
            y="12"
            width="44"
            height="32"
            rx="5"
            fill={theme.bgCard}
          />
          {person(32, 24, 0.65)}
          <Path d="M6 49h52l-4 5H10ZM42 19h5m-3 4h3" />
        </>
      );
      break;
    case 'in-person':
      drawing = (
        <>
          <Path d="M14 52V26L32 10l18 16v26Z" fill={theme.bgCard} />
          <Path d="M8 29 32 7l24 22M26 52V36h12v16" />
          <Circle cx="32" cy="26" r="4" fill={theme.secondaryMuted} />
        </>
      );
      break;
    case 'under50':
    case '50to70':
    case 'over70': {
      const columns = name === 'under50' ? 1 : name === '50to70' ? 2 : 3;
      drawing = (
        <>
          {Array.from({ length: columns }, (_, i) => (
            <G
              key={i}
              transform={'translate(' + (32 - columns * 9 + i * 18) + ',0)'}
            >
              <Path
                d={'M0 ' + (38 - i * 9) + 'v12c0 7 18 7 18 0V' + (38 - i * 9)}
                fill={theme.secondaryMuted}
              />
              <Ellipse
                cx="9"
                cy={38 - i * 9}
                rx="9"
                ry="4"
                fill={theme.bgCard}
              />
              <Path d={'M0 ' + (44 - i * 6) + 'q9 7 18 0'} />
            </G>
          ))}
        </>
      );
      break;
    }
    case 'budget-any':
      drawing = (
        <>
          <Path d="M11 25 29 8h20v21L31 47Z" fill={theme.bgCard} />
          <Circle cx="41" cy="17" r="3" />
          <Path d="M25 26h12m-6-6v12M20 47l8 8 27-27" />
        </>
      );
      break;
    case 'first':
      drawing = (
        <>
          <Path
            d="M31 54V29M31 40C12 40 12 24 12 24s19-1 19 16ZM32 31C32 12 51 12 51 12s1 19-19 19Z"
            fill={theme.secondaryMuted}
          />
          <Path d="M12 14h8m-4-4v8M44 44h10m-5-5v10" />
        </>
      );
      break;
    case 'positive':
      drawing = (
        <>
          <Path
            d="M32 49C24 43 8 32 8 21C8 8 25 6 32 19C39 6 56 8 56 21C56 32 40 43 32 49Z"
            fill={theme.secondaryMuted}
          />
          <Path d="m22 28 7 7 14-14" />
        </>
      );
      break;
    case 'uncomfortable':
      drawing = (
        <>
          <Circle cx="32" cy="30" r="22" fill={theme.bgCard} />
          <Path d="m41 18-6 19-13 6 6-19Z" fill={theme.secondaryMuted} />
          <Path d="M32 4v4m0 44v5M6 30h4m44 0h4" />
        </>
      );
      break;
    case 'several':
      drawing = (
        <>
          <Path d="M8 10h35v27H24L13 46v-9H8Z" fill={theme.bgCard} />
          <Path
            d="M45 21h11v30h-8l-8 6v-6H26v-11"
            fill={theme.secondaryMuted}
          />
          <Path d="M16 20h19m-19 8h13" />
        </>
      );
      break;
  }
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size + 12,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size + 12} height={size} viewBox="0 0 76 64">
        <Ellipse cx="38" cy="36" rx="37" ry="25" fill={theme.bgMuted} />
        <G
          transform="translate(6,0)"
          fill="none"
          stroke={theme.textPrimary}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {drawing}
        </G>
      </Svg>
    </View>
  );
}
