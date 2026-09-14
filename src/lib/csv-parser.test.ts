import { describe, it, expect } from 'vitest';
import { parseParticipantCSV } from './csv-parser';

describe('parseParticipantCSV', () => {
  it('parses fullName, email, and ticketType columns', () => {
    const csv = 'fullName,email,ticketType\nNadeesha Perera,nadeesha@example.com,VIP\nKasun Fernando,kasun@example.com,General';

    const result = parseParticipantCSV(csv);

    expect(result).toEqual([
      { fullName: 'Nadeesha Perera', email: 'nadeesha@example.com', ticketType: 'VIP' },
      { fullName: 'Kasun Fernando', email: 'kasun@example.com', ticketType: 'General' },
    ]);
  });

  it('defaults ticketType to General when the column is missing', () => {
    const csv = 'fullName,email\nIshara Silva,ishara@example.com';

    const result = parseParticipantCSV(csv);

    expect(result).toEqual([
      { fullName: 'Ishara Silva', email: 'ishara@example.com', ticketType: 'General' },
    ]);
  });

  it('is tolerant of header naming and column order', () => {
    const csv = 'Email,Full Name\ntharindu@example.com,Tharindu Jayasuriya';

    const result = parseParticipantCSV(csv);

    expect(result).toEqual([
      { fullName: 'Tharindu Jayasuriya', email: 'tharindu@example.com', ticketType: 'General' },
    ]);
  });

  it('skips rows with a missing or invalid email', () => {
    const csv = 'fullName,email\nNo Email Person,\nBad Email Person,not-an-email\nValid Person,valid@example.com';

    const result = parseParticipantCSV(csv);

    expect(result).toEqual([
      { fullName: 'Valid Person', email: 'valid@example.com', ticketType: 'General' },
    ]);
  });

  it('returns an empty array for a header-only or empty CSV', () => {
    expect(parseParticipantCSV('fullName,email')).toEqual([]);
    expect(parseParticipantCSV('')).toEqual([]);
  });

  it('ignores blank lines between rows', () => {
    const csv = 'fullName,email\n\nValid Person,valid@example.com\n\n';

    const result = parseParticipantCSV(csv);

    expect(result).toEqual([
      { fullName: 'Valid Person', email: 'valid@example.com', ticketType: 'General' },
    ]);
  });
});
