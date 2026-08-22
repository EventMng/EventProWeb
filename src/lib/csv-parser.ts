export interface CSVParticipantRow {
  fullName: string;
  email: string;
  ticketType?: string;
}

export function parseParticipantCSV(csvText: string): CSVParticipantRow[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length <= 1) return [];

  // Headers (fullName, email, ticketType)
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const nameIndex = headers.findIndex((h) => h.includes('name') || h.includes('full'));
  const emailIndex = headers.findIndex((h) => h.includes('email'));
  const ticketIndex = headers.findIndex((h) => h.includes('ticket') || h.includes('type'));

  const result: CSVParticipantRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const fullName = nameIndex !== -1 ? values[nameIndex] : values[0];
    const email = emailIndex !== -1 ? values[emailIndex] : values[1];
    const ticketType = ticketIndex !== -1 ? values[ticketIndex] : 'General';

    if (fullName && email && email.includes('@')) {
      result.push({ fullName, email, ticketType });
    }
  }

  return result;
}
