using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Placas xTool")]
[assembly: AssemblyDescription("Generador de Placas Técnicas para xTool Studio")]
[assembly: AssemblyCompany("Zybra · Vorma · Olsen & Kael")]
[assembly: AssemblyProduct("Placas xTool")]
[assembly: AssemblyVersion("1.2.0.0")]
[assembly: AssemblyFileVersion("1.2.0.0")]

namespace PlacasXToolDesktop
{
    static class Program
    {
        private const int PORT = 3456;
        private static Process serverProcess = null;

        [DllImport("shell32.dll", SetLastError = true)]
        private static extern int SetCurrentProcessExplicitAppUserModelID([MarshalAs(UnmanagedType.LPWStr)] string AppID);

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        private const uint WM_SETICON = 0x0080;
        private static readonly IntPtr ICON_SMALL = new IntPtr(0);
        private static readonly IntPtr ICON_BIG = new IntPtr(1);

        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                SetCurrentProcessExplicitAppUserModelID("PlacasXTool.DesktopApp.v5");
            }
            catch { }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverScript = Path.Combine(appDir, "server.js");

            if (!File.Exists(serverScript))
            {
                MessageBox.Show(
                    "No se encontró el archivo 'server.js' en la carpeta del programa:\n" + appDir,
                    "Placas xTool",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            bool serverAlreadyRunning = IsPortOpen("127.0.0.1", PORT, 200);
            bool startedByUs = false;

            if (!serverAlreadyRunning)
            {
                string nodeExe = FindNodeExecutable();
                if (string.IsNullOrEmpty(nodeExe))
                {
                    MessageBox.Show(
                        "No se encontró Node.js en el sistema para iniciar el servicio local.",
                        "Placas xTool",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = "\"" + serverScript + "\"",
                    WorkingDirectory = appDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                try
                {
                    serverProcess = Process.Start(psi);
                    startedByUs = true;
                }
                catch (Exception ex)
                {
                    MessageBox.Show(
                        "Error al iniciar el motor interno:\n" + ex.Message,
                        "Placas xTool",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                for (int i = 0; i < 45; i++)
                {
                    if (IsPortOpen("127.0.0.1", PORT, 100))
                        break;
                    Thread.Sleep(80);
                }
            }

            string appUrl = "http://127.0.0.1:" + PORT;
            string desktopBrowser = FindChromiumEngine();

            if (!string.IsNullOrEmpty(desktopBrowser))
            {
                string profileDir = Path.Combine(appDir, "data", "desktop_window_profile");
                Directory.CreateDirectory(profileDir);

                // Limpiar caché antigua de favicons de 16x16 para que siempre se use el icono de alta resolución
                try
                {
                    string favDb = Path.Combine(profileDir, "Default", "Favicons");
                    string favJournal = Path.Combine(profileDir, "Default", "Favicons-journal");
                    if (File.Exists(favDb)) File.Delete(favDb);
                    if (File.Exists(favJournal)) File.Delete(favJournal);
                }
                catch { }

                ProcessStartInfo uiPsi = new ProcessStartInfo
                {
                    FileName = desktopBrowser,
                    Arguments = string.Format(
                        "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1560,940 --no-first-run --no-default-browser-check --disable-extensions --disable-features=Translate",
                        appUrl,
                        profileDir
                    ),
                    UseShellExecute = false
                };

                try
                {
                    Process uiProc = Process.Start(uiPsi);
                    if (uiProc != null)
                    {
                        // Aplicar icono nativo multi-resolución (256px + 32px + 16px) a la ventana de la aplicación
                        ThreadPool.QueueUserWorkItem(_ => ApplyCrispWindowIcon(appDir));
                        uiProc.WaitForExit();
                    }
                }
                catch
                {
                    Process.Start(appUrl);
                }
            }
            else
            {
                Process.Start(appUrl);
                if (startedByUs && serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.WaitForExit();
                }
            }

            if (startedByUs && serverProcess != null)
            {
                try
                {
                    if (!serverProcess.HasExited)
                    {
                        serverProcess.Kill();
                        serverProcess.Dispose();
                    }
                }
                catch { }
            }
        }

        private static void ApplyCrispWindowIcon(string appDir)
        {
            try
            {
                string icoPath = Path.Combine(appDir, "app-icon.ico");
                if (!File.Exists(icoPath)) return;

                Icon bigIcon = new Icon(icoPath, new Size(256, 256));
                Icon smallIcon = new Icon(icoPath, SystemInformation.SmallIconSize);

                for (int attempt = 0; attempt < 25; attempt++)
                {
                    Thread.Sleep(250);
                    bool applied = false;
                    EnumWindows((hWnd, lParam) =>
                    {
                        if (!IsWindowVisible(hWnd)) return true;
                        StringBuilder sb = new StringBuilder(256);
                        GetWindowText(hWnd, sb, sb.Capacity);
                        string title = sb.ToString();
                        if (title.Contains("Placas xTool"))
                        {
                            SendMessage(hWnd, WM_SETICON, ICON_BIG, bigIcon.Handle);
                            SendMessage(hWnd, WM_SETICON, ICON_SMALL, smallIcon.Handle);
                            applied = true;
                        }
                        return true;
                    }, IntPtr.Zero);

                    if (applied && attempt > 4) break;
                }
            }
            catch { }
        }

        private static bool IsPortOpen(string host, int port, int timeoutMs)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(timeoutMs));
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static string FindNodeExecutable()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "node.exe"),
                "node.exe"
            };

            foreach (string c in candidates)
            {
                if (File.Exists(c)) return c;
            }
            return "node.exe";
        }

        private static string FindChromiumEngine()
        {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string[] candidates = new string[]
            {
                Path.Combine(pfx86, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(pf, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(pfx86, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(localApp, "Google", "Chrome", "Application", "chrome.exe")
            };

            foreach (string c in candidates)
            {
                if (!string.IsNullOrEmpty(c) && File.Exists(c))
                    return c;
            }
            return null;
        }
    }
}
