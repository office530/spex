import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { registerHebrewFont } from './font';

registerHebrewFont();

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Rubik', fontSize: 11, direction: 'rtl', color: '#0f172a' },
  header: { borderBottomWidth: 2, borderBottomColor: '#0f766e', paddingBottom: 12, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, textAlign: 'right', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#64748b', textAlign: 'right' },
  meta: { flexDirection: 'row-reverse', gap: 12, marginTop: 8 },
  metaItem: { fontSize: 10, color: '#475569' },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 6, textAlign: 'right' },
  body: { fontSize: 11, lineHeight: 1.5, textAlign: 'right' },
  actionRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  actionText: { flex: 1, fontSize: 11, textAlign: 'right' },
  actionMeta: { fontSize: 9, color: '#64748b', marginEnd: 8 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export interface MeetingPdfActionItem {
  id: string;
  description: string;
  assignee?: string | null;
  due_date?: string | null;
  status?: string | null;
}

export interface MeetingPdfProps {
  projectName: string;
  meetingTitle: string;
  meetingDate: string;
  attendeesText: string | null;
  bodyText: string | null;
  actionItems: MeetingPdfActionItem[];
  generatedAtLabel: string;
}

export function MeetingPdf(props: MeetingPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{props.meetingTitle}</Text>
          <Text style={styles.subtitle}>{props.projectName}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaItem}>
              תאריך: {new Date(props.meetingDate).toLocaleDateString('he-IL')}
            </Text>
            {props.attendeesText && (
              <Text style={styles.metaItem}>משתתפים: {props.attendeesText}</Text>
            )}
          </View>
        </View>

        {props.bodyText && (
          <>
            <Text style={styles.sectionTitle}>סיכום</Text>
            <Text style={styles.body}>{props.bodyText}</Text>
          </>
        )}

        {props.actionItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>משימות לביצוע</Text>
            {props.actionItems.map((item) => (
              <View key={item.id} style={styles.actionRow}>
                <Text style={styles.actionText}>{item.description}</Text>
                <Text style={styles.actionMeta}>
                  {item.assignee ? item.assignee : ''}
                  {item.due_date
                    ? ` · ${new Date(item.due_date).toLocaleDateString('he-IL')}`
                    : ''}
                  {item.status ? ` · ${item.status}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.footer}>{props.generatedAtLabel}</Text>
      </Page>
    </Document>
  );
}
