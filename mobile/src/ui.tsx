import { ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { c } from './theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({ name, size = 20, color = c.muted2 }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function IconButton({
  name,
  onPress,
  color,
  size,
  label,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [s.iconBtn, pressed && { backgroundColor: c.borderSoft }]}
    >
      <Icon name={name} color={color} size={size} />
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? c.red : c.muted2;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        variant === 'primary' && { backgroundColor: c.primary },
        variant === 'ghost' && { backgroundColor: c.surface },
        variant === 'danger' && { backgroundColor: c.redBg },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.75 },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={16} color={fg} />}
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** Page chrome: title bar with optional back button / actions, scrollable body. */
export function Screen({
  title,
  onBack,
  right,
  children,
  scroll = true,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}) {
  useBackHandler(onBack);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={s.header}>
        {onBack ? <IconButton name="chevron-back" onPress={onBack} label="戻る" color={c.text2} /> : <View style={{ width: 8 }} />}
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row' }}>{right}</View>
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

/** Android hardware back button behaves like the on-screen back button while a detail view is open. */
export function useBackHandler(onBack?: () => void) {
  useEffect(() => {
    if (!onBack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
}

export function confirmDelete(what: string, onConfirm: () => void) {
  Alert.alert(`${what}を削除`, 'この操作は元に戻せません。', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '削除', style: 'destructive', onPress: onConfirm },
  ]);
}

export function Field(props: TextInputProps & { style?: StyleProp<ViewStyle> }) {
  const { style, ...rest } = props;
  return <TextInput placeholderTextColor={c.muted} {...rest} style={[s.input, style as never]} />;
}

/**
 * Numeric input that keeps what the user typed ("7." or "") while storing a number,
 * and only overwrites the text when the value changed from outside.
 */
export function NumField({
  value,
  onChange,
  decimal = false,
  placeholder = '0',
  style,
  plain = false,
}: {
  value: number;
  onChange: (n: number) => void;
  decimal?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  plain?: boolean;
}) {
  const [text, setText] = useState(value ? String(value) : '');
  const parse = (t: string) => (decimal ? parseFloat(t) : parseInt(t, 10)) || 0;
  useEffect(() => {
    if (parse(text) !== value) setText(value ? String(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        const clean = decimal ? t.replace(/[^0-9.]/g, '') : t.replace(/[^0-9]/g, '');
        setText(clean);
        onChange(parse(clean));
      }}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      placeholder={placeholder}
      placeholderTextColor={c.muted}
      selectTextOnFocus
      style={[plain ? s.numPlain : s.input, { textAlign: 'center' }, style as never]}
    />
  );
}

export function Pill({ text, tone = 'gray' }: { text: string; tone?: 'gray' | 'green' | 'blue' | 'red' }) {
  const map = {
    gray: [c.borderSoft, c.muted2],
    green: [c.greenBg, c.greenText],
    blue: ['#eff6ff', c.blue],
    red: [c.redBg, c.red],
  } as const;
  return (
    <View style={[s.pill, { backgroundColor: map[tone][0] }]}>
      <Text style={{ fontSize: 11, color: map[tone][1] }}>{text}</Text>
    </View>
  );
}

export function Bar({ pct, color = c.blue, height = 8 }: { pct: number; color?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: c.borderSoft, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(pct, 100))}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function EmojiPicker({ emojis, value, onPick }: { emojis: string[]; value: string; onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 8 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityLabel="絵文字を変更" style={{ alignSelf: 'flex-start', padding: 4 }}>
        <Text style={{ fontSize: 44 }}>{value}</Text>
      </Pressable>
      {open && (
        <View style={s.emojiGrid}>
          {emojis.map((e) => (
            <Pressable
              key={e}
              onPress={() => {
                onPick(e);
                setOpen(false);
              }}
              style={{ padding: 8 }}
            >
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function EmptyHint({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 14 }}>
      <Text style={{ color: c.muted, fontSize: 14 }}>{text}</Text>
      {action}
    </View>
  );
}

export const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.borderSoft,
    backgroundColor: c.bg,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text, paddingHorizontal: 4 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnText: { fontSize: 14, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.bg, overflow: 'hidden' },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: c.text,
    backgroundColor: c.bg,
  },
  numPlain: { fontSize: 14, color: c.text2, paddingVertical: 6, backgroundColor: 'transparent' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 4,
    marginTop: 4,
  },
});
