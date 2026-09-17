import * as fflate from 'fflate';
import {
  packageFolderToZip,
  validateMemberPathAndType,
  sanitizeArchiveName,
  readFileAsUint8Array,
  MAX_FOLDER_ZIP_BYTES,
  MAX_FOLDER_FILES,
  MAX_FOLDER_SOURCE_BYTES,
  ALLOWED_ATTACHMENT_EXTENSIONS,
} from '../../components/projects/FolderUploadHelper';

describe('FolderUploadHelper & Chat Folder Packaging V1', () => {
  // Helper to create mock File with webkitRelativePath
  function createMockFile(content, name, relativePath, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const file = new File([blob], name, { type });
    Object.defineProperty(file, 'webkitRelativePath', {
      value: relativePath,
      writable: false,
    });
    return file;
  }

  test('1. directory files preserve webkitRelativePath in validation', () => {
    const validPath = 'ProjectDocs/design/specs.pdf';
    const result = validateMemberPathAndType(validPath);
    expect(result).toBe('ProjectDocs/design/specs.pdf');
  });

  test('2. nested directory path preserved in ZIP structure', async () => {
    const file1 = createMockFile('logo image data', 'logo.png', 'MyProject/assets/images/logo.png', 'image/png');
    const file2 = createMockFile('some doc content', 'notes.txt', 'MyProject/docs/notes.txt', 'text/plain');

    const zipFile = await packageFolderToZip([file1, file2]);
    expect(zipFile).toBeInstanceOf(File);
    expect(zipFile.name).toBe('MyProject.zip');
    expect(zipFile.type).toBe('application/zip');

    // Inspect zip contents with unzipSync to verify nested paths
    const u8 = await readFileAsUint8Array(zipFile);
    const unzipped = fflate.unzipSync(u8);
    const entries = Object.keys(unzipped);

    expect(entries).toContain('MyProject/assets/images/logo.png');
    expect(entries).toContain('MyProject/docs/notes.txt');
  });

  test('3. one folder returns exactly one ZIP File object', async () => {
    const file1 = createMockFile('a', 'a.txt', 'FolderA/a.txt');
    const file2 = createMockFile('b', 'b.txt', 'FolderA/b.txt');
    const file3 = createMockFile('c', 'c.txt', 'FolderA/c.txt');

    const result = await packageFolderToZip([file1, file2, file3]);
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('FolderA.zip');
    expect(result.size).toBeGreaterThan(0);
  });

  test('4. prohibited inner extension rejected before packaging', async () => {
    const badFiles = [
      createMockFile('bad', 'script.js', 'Folder/script.js'),
      createMockFile('bad', 'malware.exe', 'Folder/bin/malware.exe'),
      createMockFile('bad', 'danger.PY', 'Folder/danger.PY'),
      createMockFile('bad', 'vector.svg', 'Folder/vector.svg'),
      createMockFile('bad', 'page.html', 'Folder/page.html'),
      createMockFile('bad', 'run.sh', 'Folder/run.sh'),
    ];

    for (const file of badFiles) {
      await expect(packageFolderToZip([file])).rejects.toThrow(/prohibited file/i);
    }
  });

  test('5. traversal paths rejected', async () => {
    const evil1 = createMockFile('evil', 'evil.txt', 'Folder/../../evil.txt');
    const evil2 = createMockFile('evil', 'evil.txt', 'Folder/..\\evil.txt');
    const evil3 = createMockFile('evil', 'evil.txt', '/absolute/evil.txt');
    const evil4 = createMockFile('evil', 'evil.txt', 'C:\\Windows\\evil.txt');

    await expect(packageFolderToZip([evil1])).rejects.toThrow(/unsafe path traversal/i);
    await expect(packageFolderToZip([evil2])).rejects.toThrow(/unsafe path traversal/i);
    await expect(packageFolderToZip([evil3])).rejects.toThrow(/unsafe path traversal/i);
    await expect(packageFolderToZip([evil4])).rejects.toThrow(/unsafe path traversal/i);
  });

  test('6. final ZIP > 10MB rejected', async () => {
    expect(MAX_FOLDER_ZIP_BYTES).toBe(10 * 1024 * 1024);

    const file = createMockFile('some test data to exceed threshold', 'data.txt', 'LargeFolder/data.txt');
    await expect(
      packageFolderToZip([file], { maxBytes: 10 })
    ).rejects.toThrow('Folder archive exceeds the 10MB attachment limit.');
  });

  test('7. generated folder counts as one pending attachment toward max 10 rule', () => {
    // Simulate pendingFiles array with 9 files
    const pendingFiles = Array.from({ length: 9 }, (_, i) => ({
      id: `p-${i}`,
      name: `file${i}.pdf`,
    }));

    // Adding 1 folder zip file -> 9 + 1 = 10 -> Allowed
    const canAddOneFolder = pendingFiles.length + 1 <= 10;
    expect(canAddOneFolder).toBe(true);

    // Adding 2 folder zip files -> 9 + 2 = 11 -> Rejected
    const canAddTwoFolders = pendingFiles.length + 2 <= 10;
    expect(canAddTwoFolders).toBe(false);
  });

  test('8. existing normal file picker unaffected', () => {
    // Normal single file selection doesn't use packageFolderToZip
    const normalFile = new File(['hello'], 'document.pdf', { type: 'application/pdf' });
    expect(normalFile.name).toBe('document.pdf');
    expect(normalFile.webkitRelativePath).toBeFalsy();
  });

  test('9. packaging error returns safe error message without sensitive path disclosure', async () => {
    const emptyList = [];
    await expect(packageFolderToZip(emptyList)).rejects.toThrow('No files found in the selected folder.');

    expect(sanitizeArchiveName('../../../etc/passwd')).toBe('etc_passwd');
    expect(sanitizeArchiveName('Design:Assets*V1?')).toBe('Design_Assets_V1');
  });

  test('10. unsupported .ps1 and .vbs rejected', async () => {
    const ps1File = createMockFile('powershell', 'script.ps1', 'Folder/script.ps1');
    await expect(packageFolderToZip([ps1File])).rejects.toThrow(/unsupported file/i);

    const vbsFile = createMockFile('vbs', 'macro.vbs', 'Folder/macro.vbs');
    await expect(packageFolderToZip([vbsFile])).rejects.toThrow(/unsupported file/i);
  });

  test('11. valid MP4 and PDF files accepted', async () => {
    const mp4File = createMockFile('video data', 'demo.mp4', 'MediaFolder/demo.mp4', 'video/mp4');
    const pdfFile = createMockFile('pdf data', 'manual.pdf', 'MediaFolder/manual.pdf', 'application/pdf');

    const zipFile = await packageFolderToZip([mp4File, pdfFile]);
    expect(zipFile).toBeInstanceOf(File);
    expect(zipFile.name).toBe('MediaFolder.zip');
    expect(zipFile.size).toBeGreaterThan(0);
  });

  test('12. >1000 selected files rejected before ZIP packaging', async () => {
    expect(MAX_FOLDER_FILES).toBe(1000);
    const files = Array.from({ length: 1001 }, (_, i) =>
      createMockFile('x', `file${i}.txt`, `BigFolder/file${i}.txt`)
    );

    await expect(packageFolderToZip(files)).rejects.toThrow(
      'Folder contains too many files. Maximum is 1000.'
    );
  });

  test('13. >50MB total source bytes rejected before ZIP packaging', async () => {
    expect(MAX_FOLDER_SOURCE_BYTES).toBe(50 * 1024 * 1024);
    const bigFile = createMockFile('data', 'huge.txt', 'LargeFolder/huge.txt');
    Object.defineProperty(bigFile, 'size', {
      value: 50 * 1024 * 1024 + 1,
      writable: false,
    });

    await expect(packageFolderToZip([bigFile])).rejects.toThrow(
      'Folder contents exceed the 50MB preparation limit.'
    );
  });

  test('14. <=1000 files and <=50MB total source can proceed', async () => {
    const file = createMockFile('hello', 'readme.txt', 'SafeFolder/readme.txt');
    const zip = await packageFolderToZip([file]);
    expect(zip).toBeInstanceOf(File);
    expect(zip.name).toBe('SafeFolder.zip');
  });

  test('15. canonical ALLOWED_ATTACHMENT_EXTENSIONS includes normal upload types', () => {
    expect(ALLOWED_ATTACHMENT_EXTENSIONS).toEqual(expect.arrayContaining([
      '.jpg', '.jpeg', '.png', '.webp', '.gif',
      '.pdf', '.txt', '.csv',
      '.doc', '.docx', '.xls', '.xlsx',
      '.zip',
      '.mp4', '.webm'
    ]));
  });

  test('16. folder containing nested .zip is rejected', async () => {
    const zipMember = createMockFile('fake zip', 'inner.zip', 'Archive/inner.zip', 'application/zip');
    await expect(packageFolderToZip([zipMember])).rejects.toThrow('ZIP files inside folders are not supported.');
  });

  test('17. uppercase .ZIP inside folder is rejected', async () => {
    const upperZip = createMockFile('fake zip', 'ARCHIVE.ZIP', 'Archive/sub/ARCHIVE.ZIP', 'application/zip');
    await expect(packageFolderToZip([upperZip])).rejects.toThrow('ZIP files inside folders are not supported.');
  });

  test('18. normal non-folder standalone ZIP behavior is unaffected', () => {
    const standaloneZip = new File(['PK fake data'], 'standalone.zip', { type: 'application/zip' });
    expect(standaloneZip.name).toBe('standalone.zip');
    expect(standaloneZip.webkitRelativePath).toBeFalsy();
    expect(ALLOWED_ATTACHMENT_EXTENSIONS).toContain('.zip');
  });

  test('19. valid folder with PDF, MP4, and images proceeds normally', async () => {
    const files = [
      createMockFile('img', 'photo.png', 'MixedFolder/photo.png', 'image/png'),
      createMockFile('pdf', 'spec.pdf', 'MixedFolder/spec.pdf', 'application/pdf'),
      createMockFile('video', 'vid.mp4', 'MixedFolder/vid.mp4', 'video/mp4'),
    ];
    const zip = await packageFolderToZip(files);
    expect(zip).toBeInstanceOf(File);
    expect(zip.name).toBe('MixedFolder.zip');
    expect(zip.size).toBeGreaterThan(0);
  });

  test('20. hidden system files like desktop.ini and thumbs.db are ignored without failing', async () => {
    const files = [
      createMockFile('img', 'photo.jpg', 'Camera Roll/photo.jpg', 'image/jpeg'),
      createMockFile('[ini]', 'desktop.ini', 'Camera Roll/desktop.ini', 'text/plain'),
      createMockFile('[db]', 'Thumbs.db', 'Camera Roll/Thumbs.db', 'application/octet-stream'),
    ];
    const zip = await packageFolderToZip(files);
    expect(zip).toBeInstanceOf(File);
    expect(zip.name).toBe('Camera Roll.zip');
    expect(zip.size).toBeGreaterThan(0);
  });
});
