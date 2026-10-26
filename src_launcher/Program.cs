using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Placas xTool")]
[assembly: AssemblyDescription("Generador de Placas Técnicas para xTool Studio")]
[assembly: AssemblyCompany("Zybra · Vorma · Olsen & Kael")]
[assembly: AssemblyProduct("Placas xTool")]
[assembly: AssemblyVersion("1.2.1.0")]
[assembly: AssemblyFileVersion("1.2.1.0")]

namespace PlacasXToolDesktop
{
    static class Program
    {
        private const int PORT = 3456;
        private const string APP_USER_MODEL_ID = "PlacasXTool.DesktopApp.v6";
        private static Process serverProcess = null;

        [DllImport("shell32.dll", SetLastError = true)]
        private static extern int SetCurrentProcessExplicitAppUserModelID([MarshalAs(UnmanagedType.LPWStr)] string AppID);

        [DllImport("shell32.dll")]
        private static extern int SHGetPropertyStoreForWindow(IntPtr hwnd, ref Guid iid, [Out, MarshalAs(UnmanagedType.Interface)] out IPropertyStore propertyStore);

        [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IPropertyStore
        {
            [MethodImpl(MethodImplOptions.InternalCall, MethodCodeType = MethodCodeType.Runtime)]
            void GetCount([Out] out uint cProps);
            [MethodImpl(MethodImplOptions.InternalCall, MethodCodeType = MethodCodeType.Runtime)]
            void GetAt([In] uint iProp, out PROPERTYKEY pkey);
            [MethodImpl(MethodImplOptions.InternalCall, MethodCodeType = MethodCodeType.Runtime)]
            void GetValue([In] ref PROPERTYKEY key, out PROPVARIANT pv);
            [MethodImpl(MethodImplOptions.InternalCall, MethodCodeType = MethodCodeType.Runtime)]
            void SetValue([In] ref PROPERTYKEY key, [In] ref PROPVARIANT pv);
            [MethodImpl(MethodImplOptions.InternalCall, MethodCodeType = MethodCodeType.Runtime)]
            void Commit();
        }

        [StructLayout(LayoutKind.Sequential, Pack = 4)]
        private struct PROPERTYKEY
        {
            public Guid fmtid;
            public uint pid;
            public PROPERTYKEY(Guid guid, uint id) { fmtid = guid; pid = id; }
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct PROPVARIANT
        {
            public ushort vt;
            public ushort wReserved1;
            public ushort wReserved2;
            public ushort wReserved3;
            public IntPtr pwszVal;
            public IntPtr padding;

            public static PROPVARIANT FromString(string val)
            {
                PROPVARIANT pv = new PROPVARIANT();
                pv.vt = 31; // VT_LPWSTR
                pv.pwszVal = Marshal.StringToCoTaskMemUni(val);
                return pv;
            }
        }

        [DllImport("ole32.dll")]
        private static extern int PropVariantClear(ref PROPVARIANT pvar);

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr SetClassLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        private const uint WM_SETICON = 0x0080;
        private const int GCLP_HICON = -14;
        private const int GCLP_HICONSM = -34;
        private static readonly IntPtr ICON_SMALL = new IntPtr(0);
        private static readonly IntPtr ICON_BIG = new IntPtr(1);

        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                SetCurrentProcessExplicitAppUserModelID(APP_USER_MODEL_ID);
            }
            catch { }

            string appDir = AppDomain.CurrentDomain.BaseDirectory;

            // Modo auxiliar para actualizar en caliente el icono de una ventana ya abierta
            if (args != null && args.Length > 0 && args[0] == "--apply-icon-now")
            {
                ApplyCrispWindowIcon(appDir, 4);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

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

                // Limpiar caché de favicons para que Chromium use siempre icon_256.png
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
                        ThreadPool.QueueUserWorkItem(_ => ApplyCrispWindowIcon(appDir, 25));
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

        private static void ApplyCrispWindowIcon(string appDir, int maxAttempts)
        {
            try
            {
                string png256 = Path.Combine(appDir, "icon_256.png");
                string png48 = Path.Combine(appDir, "icon_48.png");
                string icoPath = Path.Combine(appDir, "Placas_xTool_Icon_v6.ico");
                if (!File.Exists(icoPath)) icoPath = Path.Combine(appDir, "app-icon.ico");
                string exePath = Path.Combine(appDir, "Generador_Placas_xTool.exe");

                IntPtr hIconBig = IntPtr.Zero;
                IntPtr hIconSmall = IntPtr.Zero;

                if (File.Exists(png256))
                {
                    using (Bitmap bmpBig = new Bitmap(png256))
                    {
                        hIconBig = bmpBig.GetHicon();
                    }
                }
                if (File.Exists(png48))
                {
                    using (Bitmap bmpSmall = new Bitmap(png48))
                    {
                        hIconSmall = bmpSmall.GetHicon();
                    }
                }

                Guid iidPropStore = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");
                Guid fmtAppUserModel = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");
                PROPERTYKEY pkeyAppId = new PROPERTYKEY(fmtAppUserModel, 5);           // PKEY_AppUserModel_ID
                PROPERTYKEY pkeyRelaunchCmd = new PROPERTYKEY(fmtAppUserModel, 2);     // PKEY_AppUserModel_RelaunchCommand
                PROPERTYKEY pkeyRelaunchIcon = new PROPERTYKEY(fmtAppUserModel, 3);    // PKEY_AppUserModel_RelaunchIconResource
                PROPERTYKEY pkeyRelaunchName = new PROPERTYKEY(fmtAppUserModel, 4);    // PKEY_AppUserModel_RelaunchDisplayNameResource

                for (int attempt = 0; attempt < maxAttempts; attempt++)
                {
                    Thread.Sleep(220);
                    bool applied = false;
                    EnumWindows((hWnd, lParam) =>
                    {
                        if (!IsWindowVisible(hWnd)) return true;
                        StringBuilder sb = new StringBuilder(256);
                        GetWindowText(hWnd, sb, sb.Capacity);
                        string title = sb.ToString();
                        if (title.Contains("Placas xTool"))
                        {
                            // 1. Asignar el recurso .ico vectorial en el PropertyStore de la barra de tareas de Windows 11
                            try
                            {
                                IPropertyStore store;
                                if (SHGetPropertyStoreForWindow(hWnd, ref iidPropStore, out store) == 0 && store != null)
                                {
                                    PROPVARIANT pvId = PROPVARIANT.FromString(APP_USER_MODEL_ID);
                                    PROPVARIANT pvIcon = PROPVARIANT.FromString(icoPath + ",0");
                                    PROPVARIANT pvCmd = PROPVARIANT.FromString("\"" + exePath + "\"");
                                    PROPVARIANT pvName = PROPVARIANT.FromString("Placas xTool");

                                    store.SetValue(ref pkeyAppId, ref pvId);
                                    store.SetValue(ref pkeyRelaunchIcon, ref pvIcon);
                                    store.SetValue(ref pkeyRelaunchCmd, ref pvCmd);
                                    store.SetValue(ref pkeyRelaunchName, ref pvName);
                                    store.Commit();

                                    PropVariantClear(ref pvId);
                                    PropVariantClear(ref pvIcon);
                                    PropVariantClear(ref pvCmd);
                                    PropVariantClear(ref pvName);
                                }
                            }
                            catch { }

                            // 2. Asignar HICON de 256x256 ARGB directo desde icon_256.png (sin pasar por el decodificador antiguo de System.Drawing.Icon)
                            if (hIconBig != IntPtr.Zero)
                            {
                                SendMessage(hWnd, WM_SETICON, ICON_BIG, hIconBig);
                            }
                            if (hIconSmall != IntPtr.Zero)
                            {
                                SendMessage(hWnd, WM_SETICON, ICON_SMALL, hIconSmall);
                            }
                            applied = true;
                        }
                        return true;
                    }, IntPtr.Zero);

                    if (applied && attempt > 5) break;
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
