import { Team, ScoreLogItem } from '@/types/cca';

export function exportTeamsToCSV(teams: Team[]): void {
  const sorted = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const headers = ['Peringkat', 'Nama Tim', 'Asal Sekolah', 'Kategori', 'Total Skor', 'Status Tanding', 'Status Roda Putar'];
  
  const rows = sorted.map((team, idx) => [
    idx + 1,
    `"${team.name.replace(/"/g, '""')}"`,
    `"${team.school.replace(/"/g, '""')}"`,
    team.category,
    team.totalScore,
    team.hasPlayed ? 'Sudah Tanding' : 'Belum Tanding',
    team.isEliminatedFromWheel ? 'Sudah Di-spin' : 'Tersedia di Spinwheel',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, 'CCA_Malang_Semifinal_Skor.csv', 'text/csv;charset=utf-8;');
}

export function exportLogsToCSV(logs: ScoreLogItem[]): void {
  const headers = ['Waktu', 'Sesi', 'Nama Tim', 'Asal Sekolah', 'Aksi Penjurian', 'Perubahan Poin', 'Skor Akhir'];
  
  const rows = logs.map((log) => [
    `"${log.timestamp}"`,
    `Sesi ${log.sessionNumber}`,
    `"${log.teamName.replace(/"/g, '""')}"`,
    `"${log.school.replace(/"/g, '""')}"`,
    `"${log.action}"`,
    log.pointsDelta,
    log.scoreAfter,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, 'CCA_Malang_Log_Penjurian.csv', 'text/csv;charset=utf-8;');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// -------------------------------------------------------------
// GOOGLE APPS SCRIPT CADANGAN DATABASE CCA MALANG
// Petunjuk:
// 1. Buka Google Spreadsheet baru (https://sheets.new)
// 2. Klik Extensions (Ekstensi) > Apps Script
// 3. Hapus kode bawaan dan tempel kode berikut:
// -------------------------------------------------------------

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Log CCA");
    if (!sheet) {
      sheet = ss.insertSheet("Log CCA");
      sheet.appendRow(["Timestamp", "Sesi", "Tim A", "Sekolah A", "Skor A", "Tim B", "Sekolah B", "Skor B"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      "Sesi " + (data.session || "-"),
      data.teamAName || "-",
      data.teamASchool || "-",
      data.teamAScore || 0,
      data.teamBName || "-",
      data.teamBSchool || "-",
      data.teamBScore || 0
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 4. Klik tombol "Deploy" (Terapkan) > "New deployment" (Penerapan baru)
// 5. Pilih Type: "Web app"
// 6. Execute as: "Me"
// 7. Who has access: "Anyone" (Siapa saja)
// 8. Copy URL Web App dan tempel ke Pengaturan Portal Admin CCA!
`;
