import React, {useRef, useState} from 'react';
import {Modal, Pressable, ScrollView, Text, View, type LayoutRectangle} from 'react-native';
import {PracticeTags} from './PracticeTags';
import {useTheme} from '../../contexts/ThemeContext';

interface Props {title: string; values: readonly string[]; kind: 'specialties' | 'approaches'}

/** Measure the same wrapping chips at the available width, including multiline labels. */
export function RowLimitedPracticeTags(props: Props) {
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState(false);
  return <View style={{minWidth: 0}} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <MeasuredTags key={JSON.stringify([width, props.values])} {...props} open={open} setOpen={setOpen} />
  </View>;
}

function MeasuredTags({title, values, kind, open, setOpen}: Props & {open: boolean; setOpen: (value: boolean) => void}) {
  const {theme} = useTheme();
  const [count, setCount] = useState(Math.min(values.length, 3));
  const [measured, setMeasured] = useState(false);
  const positions = useRef(new Map<number, LayoutRectangle>());
  const record = (index: number, layout: LayoutRectangle) => {
    positions.current.set(index, layout);
    if (positions.current.size !== values.length) return;
    const rows = [...new Set([...positions.current.values()].map(item => Math.round(item.y)))].sort((a,b) => a-b);
    const lastRow = rows[Math.min(2, rows.length - 1)];
    setCount([...positions.current.values()].filter(item => Math.round(item.y) <= lastRow).length);
    setMeasured(true);
  };
  const text = {fontFamily: theme.fontSans, color: theme.textPrimary, fontSize: 14, lineHeight: 21};
  return <View style={{gap: 4, minWidth: 0}}>
    <View testID="practice-tags-measurement" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, pointerEvents: 'none'}}>
      <PracticeTags values={values} kind={kind} onItemLayout={record} />
    </View>
    <PracticeTags values={values.slice(0, count)} kind={kind} />
    {measured && count < values.length ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver todos: ${title.toLowerCase()} (${values.length})`} accessibilityState={{expanded: open}} onPress={() => setOpen(true)} hitSlop={6} style={{alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 8}}>
      <Text style={[text, {fontSize: 12, lineHeight: 18, color: theme.primary, fontFamily: theme.fontSansSemiBold}]}>Ver más (+{values.length - count})</Text>
    </Pressable> : null}
    <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.35)'}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar lista" onPress={() => setOpen(false)} style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0}} />
        <View accessibilityViewIsModal style={{width: '100%', maxWidth: 600, maxHeight: '80%', padding: 24, gap: 20, borderRadius: 20, backgroundColor: theme.bgCard}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <Text accessibilityRole="header" style={[text, {flex: 1, fontSize: 20, lineHeight: 26, fontFamily: theme.fontHeading}]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Cerrar ${title.toLowerCase()}`} onPress={() => setOpen(false)} style={{minHeight: 44, justifyContent: 'center', paddingHorizontal: 8}}><Text style={[text, {color: theme.primary}]}>Cerrar</Text></Pressable>
          </View>
          <ScrollView style={{flexShrink: 1}} contentContainerStyle={{paddingBottom: 4}}><PracticeTags values={values} kind={kind} /></ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}
