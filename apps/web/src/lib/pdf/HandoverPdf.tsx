import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { registerHebrewFont } from './font';

registerHebrewFont();

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Rubik',
    fontSize: 11,
    direction: 'rtl',
    color: '#0f172a',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e',
    paddingBottom: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'right',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  rowText: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#94a3b8',
    marginStart: 8,
  },
  checkboxDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  signatureLine: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    paddingTop: 6,
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
  },
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

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface HandoverPdfProps {
  projectName: string;
  clientName: string | null;
  checklist: ChecklistItem[];
  signedAt: string | null;
  signedDateLabel: string;
  unsignedLabel: string;
  generatedAtLabel: string;
}

export function HandoverPdf(props: HandoverPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>פרוטוקול מסירה</Text>
          <Text style={styles.subtitle}>
            {props.projectName}
            {props.clientName ? ` · ${props.clientName}` : ''}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>צ׳ק-ליסט</Text>
        {props.checklist.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={item.done ? [styles.checkbox, styles.checkboxDone] : styles.checkbox} />
            <Text style={styles.rowText}>{item.text}</Text>
          </View>
        ))}

        <Text style={styles.signatureLine}>
          {props.signedAt
            ? `${props.signedDateLabel}: ${new Date(props.signedAt).toLocaleDateString('he-IL')}`
            : props.unsignedLabel}
        </Text>

        <Text style={styles.signatureLine}>
          חתימת לקוח: ____________________________
        </Text>

        <Text style={styles.footer}>{props.generatedAtLabel}</Text>
      </Page>
    </Document>
  );
}
