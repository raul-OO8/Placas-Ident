using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Instalador — Placas xTool")]
[assembly: AssemblyProduct("Placas xTool")]
[assembly: AssemblyCompany("Zybra · Vorma · Olsen & Kael")]
[assembly: AssemblyVersion("1.2.0.0")]
[assembly: AssemblyFileVersion("1.2.0.0")]

namespace PlacasXToolInstaller
{
    static class SetupProgram
    {
        private const string APP_NAME = "Placas xTool";
        private const string APP_VERSION = "1.2.0";
        private const string PUBLISHER = "Zybra · Vorma · Olsen & Kael";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool isSilent = false;
            if (args != null)
            {
                foreach (var a in args)
                {
                    if (a.Equals("/silent", StringComparison.OrdinalIgnoreCase) || a.Equals("/s", StringComparison.OrdinalIgnoreCase))
                    {
                        isSilent = true;
                        break;
                    }
                }
            }

            string defaultTarget = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "Placas_xTool"
            );

            if (isSilent)
            {
                PerformInstallation(defaultTarget, true, true, true, null);
                return;
            }

            Form form = new Form
            {
                Text = "Instalador de Placas xTool",
                Width = 560,
                Height = 410,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                StartPosition = FormStartPosition.CenterScreen,
                BackColor = Color.FromArgb(244, 246, 245),
                Font = new Font("Segoe UI", 9.5f)
            };

            // Intentar cargar icono embebido
            try
            {
                form.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch { }

            // Panel superior con estilo técnico
            Panel pnlHeader = new Panel
            {
                Dock = DockStyle.Top,
                Height = 82,
                BackColor = Color.FromArgb(22, 26, 24)
            };
            form.Controls.Add(pnlHeader);

            Label lblHeaderTitle = new Label
            {
                Text = "Placas xTool — Studio de Placas Técnicas",
                Location = new Point(22, 18),
                AutoSize = true,
                Font = new Font("Segoe UI", 12.5f, FontStyle.Bold),
                ForeColor = Color.White
            };
            pnlHeader.Controls.Add(lblHeaderTitle);

            Label lblHeaderSub = new Label
            {
                Text = "Zybra · Vorma Maschinen GmbH · Olsen & Kael | Versión " + APP_VERSION,
                Location = new Point(23, 46),
                AutoSize = true,
                Font = new Font("Segoe UI", 9f),
                ForeColor = Color.FromArgb(156, 163, 175)
            };
            pnlHeader.Controls.Add(lblHeaderSub);

            // Controles de cuerpo
            Label lblTarget = new Label
            {
                Text = "Carpeta de instalación del programa:",
                Location = new Point(24, 102),
                AutoSize = true,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(22, 26, 24)
            };
            form.Controls.Add(lblTarget);

            TextBox txtTarget = new TextBox
            {
                Text = defaultTarget,
                Location = new Point(26, 128),
                Size = new Size(405, 26),
                Font = new Font("Segoe UI", 9.5f),
                ReadOnly = true,
                BackColor = Color.White
            };
            form.Controls.Add(txtTarget);

            Button btnBrowse = new Button
            {
                Text = "Examinar…",
                Location = new Point(438, 126),
                Size = new Size(84, 28),
                FlatStyle = FlatStyle.System
            };
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Selecciona la carpeta donde deseas instalar Placas xTool:";
                    fbd.SelectedPath = txtTarget.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtTarget.Text = fbd.SelectedPath;
                    }
                }
            };
            form.Controls.Add(btnBrowse);

            CheckBox chkDesktop = new CheckBox
            {
                Text = "Crear acceso directo en el Escritorio",
                Checked = true,
                Location = new Point(26, 172),
                AutoSize = true
            };
            form.Controls.Add(chkDesktop);

            CheckBox chkStartMenu = new CheckBox
            {
                Text = "Crear acceso directo en el Menú Inicio de Windows",
                Checked = true,
                Location = new Point(26, 202),
                AutoSize = true
            };
            form.Controls.Add(chkStartMenu);

            CheckBox chkLaunch = new CheckBox
            {
                Text = "Iniciar Placas xTool al completar la instalación",
                Checked = true,
                Location = new Point(26, 232),
                AutoSize = true
            };
            form.Controls.Add(chkLaunch);

            ProgressBar prg = new ProgressBar
            {
                Location = new Point(26, 268),
                Size = new Size(496, 18),
                Visible = false
            };
            form.Controls.Add(prg);

            Label lblStatus = new Label
            {
                Location = new Point(26, 290),
                Size = new Size(496, 20),
                Font = new Font("Segoe UI", 8.5f),
                ForeColor = Color.FromArgb(71, 85, 105),
                Visible = false
            };
            form.Controls.Add(lblStatus);

            Button btnCancel = new Button
            {
                Text = "Cancelar",
                Location = new Point(326, 322),
                Size = new Size(92, 34),
                BackColor = Color.White,
                FlatStyle = FlatStyle.System
            };
            btnCancel.Click += (s, e) => form.Close();
            form.Controls.Add(btnCancel);

            Button btnInstall = new Button
            {
                Text = "Instalar",
                Location = new Point(426, 322),
                Size = new Size(96, 34),
                BackColor = Color.FromArgb(68, 175, 101),
                ForeColor = Color.Black,
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                FlatStyle = FlatStyle.System
            };

            btnInstall.Click += (s, e) =>
            {
                btnInstall.Enabled = false;
                btnCancel.Enabled = false;
                btnBrowse.Enabled = false;
                prg.Visible = true;
                lblStatus.Visible = true;
                prg.Value = 15;
                lblStatus.Text = "Cerrando procesos antiguos si los hubiera...";
                Application.DoEvents();

                ThreadPool.QueueUserWorkItem(_ =>
                {
                    string target = txtTarget.Text;
                    bool createDesktop = chkDesktop.Checked;
                    bool createStart = chkStartMenu.Checked;
                    bool launch = chkLaunch.Checked;

                    string error = PerformInstallation(target, createDesktop, createStart, launch, (pct, status) =>
                    {
                        form.Invoke((Action)(() =>
                        {
                            prg.Value = Math.Min(100, Math.Max(0, pct));
                            lblStatus.Text = status;
                        }));
                    });

                    form.Invoke((Action)(() =>
                    {
                        if (error == null)
                        {
                            form.Close();
                        }
                        else
                        {
                            btnInstall.Enabled = true;
                            btnCancel.Enabled = true;
                            btnBrowse.Enabled = true;
                            MessageBox.Show("Error durante la instalación:\n" + error, "Error de Instalación", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }));
                });
            };
            form.Controls.Add(btnInstall);

            Application.Run(form);
        }

        private static string PerformInstallation(string targetDir, bool createDesktop, bool createStartMenu, bool launchAfter, Action<int, string> onProgress)
        {
            try
            {
                // 1. Cerrar instancias previas si las hubiera
                if (onProgress != null) onProgress(20, "Preparando directorio de instalación...");
                foreach (var proc in Process.GetProcessesByName("Generador_Placas_xTool"))
                {
                    try { proc.Kill(); proc.WaitForExit(1500); } catch { }
                }

                // 2. Preservar maquinas.json si ya existía en la carpeta de destino
                string existingDb = Path.Combine(targetDir, "data", "maquinas.json");
                string preservedDbContent = null;
                if (File.Exists(existingDb))
                {
                    try { preservedDbContent = File.ReadAllText(existingDb); } catch { }
                }

                Directory.CreateDirectory(targetDir);

                // 3. Extraer el paquete de la aplicación embebido en el ejecutable
                if (onProgress != null) onProgress(40, "Extrayendo archivos del programa...");
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream resStream = asm.GetManifestResourceStream("AppPayload.zip"))
                {
                    if (resStream == null)
                    {
                        return "No se encontró el recurso de archivos embebidos (AppPayload.zip) en el instalador.";
                    }

                    using (ZipArchive archive = new ZipArchive(resStream, ZipArchiveMode.Read))
                    {
                        int count = archive.Entries.Count;
                        int idx = 0;
                        foreach (var entry in archive.Entries)
                        {
                            idx++;
                            string destFile = Path.Combine(targetDir, entry.FullName.Replace('/', '\\'));
                            string destFolder = Path.GetDirectoryName(destFile);

                            if (!string.IsNullOrEmpty(destFolder) && !Directory.Exists(destFolder))
                            {
                                Directory.CreateDirectory(destFolder);
                            }

                            if (string.IsNullOrEmpty(entry.Name)) continue; // Es directorio

                            // Si es la base de datos de máquinas y ya existía una previa, no sobrescribir
                            if (destFile.EndsWith("maquinas.json", StringComparison.OrdinalIgnoreCase) && preservedDbContent != null)
                            {
                                continue;
                            }

                            entry.ExtractToFile(destFile, true);

                            if (onProgress != null && idx % 3 == 0)
                            {
                                int p = 40 + (int)((idx / (float)count) * 40);
                                onProgress(p, "Instalando: " + entry.Name);
                            }
                        }
                    }
                }

                // Si se preservó la base de datos previa, asegurar que queda escrita
                if (preservedDbContent != null)
                {
                    string targetDb = Path.Combine(targetDir, "data", "maquinas.json");
                    Directory.CreateDirectory(Path.GetDirectoryName(targetDb));
                    File.WriteAllText(targetDb, preservedDbContent);
                }

                // 4. Crear accesos directos
                if (onProgress != null) onProgress(85, "Configurando accesos directos...");
                string exePath = Path.Combine(targetDir, "Generador_Placas_xTool.exe");
                string icoPath = Path.Combine(targetDir, "Placas_xTool_Icon_v6.ico");
                if (!File.Exists(icoPath)) icoPath = Path.Combine(targetDir, "app-icon.ico");

                if (createDesktop)
                {
                    string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    CreateShortcut(Path.Combine(desktop, "Placas xTool.lnk"), exePath, targetDir, icoPath, "Generador de Placas Técnicas para xTool Studio");
                }

                if (createStartMenu)
                {
                    string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                    CreateShortcut(Path.Combine(startMenu, "Placas xTool.lnk"), exePath, targetDir, icoPath, "Generador de Placas Técnicas para xTool Studio");
                }

                // 5. Registrar en Windows (Configuración > Aplicaciones instaladas / Desinstalar programa)
                if (onProgress != null) onProgress(92, "Registrando aplicación en Windows...");
                RegisterInWindows(targetDir, exePath, icoPath);

                // 6. Lanzar la aplicación si se solicitó
                if (onProgress != null) onProgress(100, "¡Instalación completada!");
                Thread.Sleep(300);

                if (launchAfter && File.Exists(exePath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo(exePath)
                    {
                        WorkingDirectory = targetDir
                    };
                    Process.Start(psi);
                }

                return null;
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }

        private static void CreateShortcut(string shortcutPath, string targetExe, string workDir, string iconPath, string desc)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetExe;
                shortcut.WorkingDirectory = workDir;
                if (!string.IsNullOrEmpty(iconPath) && File.Exists(iconPath))
                {
                    shortcut.IconLocation = iconPath + ",0";
                }
                shortcut.Description = desc;
                shortcut.Save();
            }
            catch { }
        }

        private static void RegisterInWindows(string installDir, string exePath, string iconPath)
        {
            try
            {
                string keyPath = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\PlacasXTool";
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(keyPath))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", APP_NAME);
                        key.SetValue("DisplayVersion", APP_VERSION);
                        key.SetValue("Publisher", PUBLISHER);
                        key.SetValue("InstallLocation", installDir);
                        key.SetValue("DisplayIcon", iconPath + ",0");
                        string uninstallExe = Path.Combine(installDir, "Desinstalar.exe");
                        key.SetValue("UninstallString", "\"" + uninstallExe + "\"");
                        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }
    }
}
