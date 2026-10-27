using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
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
[assembly: AssemblyVersion("1.2.2.0")]
[assembly: AssemblyFileVersion("1.2.2.0")]

namespace PlacasXToolDesktop
{
    static class Program
    {
        private const int PORT = 3456;
        private const string APP_USER_MODEL_ID = "PlacasXTool.DesktopApp.v6";
        private const string RELEASE_INSTALLER_URL = "https://github.com/raul-OO8/Placas-Ident/releases/latest/download/Instalador_Placas_xTool_Setup.exe";
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

        private const uint WM_SETICON = 0x0080;
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

            bool serverReady = IsServerHttpReady(PORT, 300);

            if (!serverReady)
            {
                string nodeExe = FindNodeExecutable(appDir);
                if (string.IsNullOrEmpty(nodeExe))
                {
                    // Si el usuario descargó el ZIP del código fuente en lugar del instalador oficial,
                    // descargar y ejecutar automáticamente el instalador oficial con el motor integrado.
                    if (DownloadAndRunOfficialInstaller())
                    {
                        return;
                    }

                    MessageBox.Show(
                        "No se encontró el motor local (node.exe) porque se descargó únicamente el código fuente sin el instalador.\n\n" +
                        "Por favor, descarga y ejecuta 'Instalador_Placas_xTool_Setup.exe' desde la sección Releases de GitHub.",
                        "Placas xTool — Falta motor local",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    return;
                }

                // Desbloquear node.exe por si Windows SmartScreen/Zone.Identifier lo retiene
                TryUnblockFile(nodeExe);
                TryUnblockFile(serverScript);

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

                // Esperar hasta 15 segundos a que el servidor HTTP responda (en el primer arranque Windows Defender escanea node.exe)
                for (int i = 0; i < 150; i++)
                {
                    if (IsServerHttpReady(PORT, 150))
                    {
                        serverReady = true;
                        break;
                    }
                    Thread.Sleep(100);
                }

                if (!serverReady)
                {
                    MessageBox.Show(
                        "El motor local tardó demasiado en responder en el puerto " + PORT + " o fue bloqueado por el antivirus.\n\n" +
                        "Vuelve a abrir 'Placas xTool' para reintentar la conexión.",
                        "Placas xTool",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    return;
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
                        "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1560,940 --no-first-run --no-default-browser-check --disable-extensions --disable-features=Translate,RendererCodeIntegrity",
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
                        // Aplicar el icono nítido a la ventana mientras está abierta
                        ApplyCrispWindowIcon(appDir, 25);
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
            }

            // IMPORTANTE: NO matar serverProcess al salir de uiProc.WaitForExit().
            // En Windows 10/11, Microsoft Edge con "Startup Boost / Inicio rápido" delega la creación de la ventana
            // al proceso principal de Edge y cierra uiProc en <100ms. Si matáramos serverProcess aquí,
            // Edge recibiría ERR_CONNECTION_REFUSED (127.0.0.1 rechazó la conexión).
            // El servidor Node queda activo en segundo plano de forma ligera e instantánea.
        }

        private static void TryUnblockFile(string filePath)
        {
            try
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath + ":Zone.Identifier");
                }
            }
            catch { }
        }

        private static bool DownloadAndRunOfficialInstaller()
        {
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
                string tempSetup = Path.Combine(Path.GetTempPath(), "Instalador_Placas_xTool_Setup.exe");

                using (Form progressForm = new Form())
                {
                    progressForm.Text = "Placas xTool — Configurando motor local...";
                    progressForm.Width = 440;
                    progressForm.Height = 140;
                    progressForm.FormBorderStyle = FormBorderStyle.FixedDialog;
                    progressForm.StartPosition = FormStartPosition.CenterScreen;
                    progressForm.MaximizeBox = false;
                    progressForm.MinimizeBox = false;

                    Label lbl = new Label
                    {
                        Text = "Descargando e instalando el motor autónomo de Placas xTool...\nEsto solo tomará unos segundos en la primera ejecución.",
                        Location = new Point(20, 20),
                        AutoSize = true,
                        Font = new Font("Segoe UI", 9.5f)
                    };
                    progressForm.Controls.Add(lbl);

                    ProgressBar pb = new ProgressBar
                    {
                        Location = new Point(20, 68),
                        Size = new Size(385, 20),
                        Style = ProgressBarStyle.Marquee
                    };
                    progressForm.Controls.Add(pb);

                    bool ok = false;
                    ThreadPool.QueueUserWorkItem(_ =>
                    {
                        try
                        {
                            using (WebClient wc = new WebClient())
                            {
                                wc.Headers.Add("User-Agent", "Placas-xTool-Bootstrap");
                                wc.DownloadFile(RELEASE_INSTALLER_URL, tempSetup);
                            }
                            TryUnblockFile(tempSetup);
                            if (File.Exists(tempSetup))
                            {
                                Process.Start(tempSetup);
                                ok = true;
                            }
                        }
                        catch { }
                        finally
                        {
                            try { progressForm.Invoke((Action)(() => progressForm.Close())); } catch { }
                        }
                    });

                    Application.Run(progressForm);
                    return ok;
                }
            }
            catch
            {
                return false;
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

        private static bool IsServerHttpReady(int port, int timeoutMs)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect("127.0.0.1", port, null, null);
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

        private static string FindNodeExecutable(string appDir)
        {
            string localNode = Path.Combine(appDir, "node.exe");
            if (File.Exists(localNode)) return localNode;

            string installedNode = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs", "Placas_xTool", "node.exe"
            );
            if (File.Exists(installedNode)) return installedNode;

            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "node.exe")
            };

            foreach (string c in candidates)
            {
                if (File.Exists(c)) return c;
            }

            // Buscar en PATH
            try
            {
                string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
                foreach (string dir in pathEnv.Split(';'))
                {
                    string trimmed = dir.Trim();
                    if (string.IsNullOrEmpty(trimmed)) continue;
                    string candidate = Path.Combine(trimmed, "node.exe");
                    if (File.Exists(candidate)) return candidate;
                }
            }
            catch { }

            return null;
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
