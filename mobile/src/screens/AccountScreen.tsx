import { Text, View } from 'react-native';
import type { SyncStatus } from '../../../shared/useAppData';
import { Button, Card, Screen } from '../ui';
import { c } from '../theme';

const LABEL: Record<SyncStatus, { text: string; color: string }> = {
  local: { text: 'この端末のみに保存', color: '#d1d5db' },
  syncing: { text: '同期中…', color: c.amber },
  synced: { text: '同期済み', color: c.green },
  error: { text: '同期エラー(自動で再試行します)', color: c.red },
};

export default function AccountScreen({
  email,
  status,
  error,
  onSync,
  onSignOut,
}: {
  email: string | null;
  status: SyncStatus;
  error: string | null;
  onSync: () => void;
  onSignOut: () => void;
}) {
  return (
    <Screen title="アカウント">
      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: LABEL[status].color }} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{LABEL[status].text}</Text>
        </View>
        {email ? (
          <Text style={{ fontSize: 13, color: c.muted2 }}>ログイン中: {email}</Text>
        ) : (
          <Text style={{ fontSize: 12, color: c.muted2, lineHeight: 18 }}>
            Supabase が未設定のため、データはこの端末のみに保存されています。README の手順で設定すると Web 版と同期できます。
          </Text>
        )}
        {error && <Text style={{ fontSize: 12, color: c.red }}>{error}</Text>}
        {email && (
          <>
            <Button title="今すぐ同期" icon="sync" variant="ghost" onPress={onSync} />
            <Button title="ログアウト" icon="log-out-outline" variant="danger" onPress={onSignOut} />
          </>
        )}
      </Card>
    </Screen>
  );
}
