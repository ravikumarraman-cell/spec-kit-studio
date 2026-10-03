/**
 * Static, shell-free native directory picker invocations. The browser never
 * receives a directory handle or broad filesystem access; the local connector
 * returns only the single folder the person explicitly selected.
 */
export function directoryPickerInvocation(platform = process.platform) {
  if (platform === 'darwin') return {
    command: 'osascript',
    args: ['-e', 'try\nPOSIX path of (choose folder with prompt "Choose a repository folder")\non error number -128\nreturn ""\nend try'],
  };
  if (platform === 'win32') return {
    command: 'powershell.exe',
    args: ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = "Choose a repository folder"; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }'],
  };
  if (platform === 'linux') return {
    command: 'zenity',
    args: ['--file-selection', '--directory', '--title=Choose a repository folder'],
  };
  return null;
}
