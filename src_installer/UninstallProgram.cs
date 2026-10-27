using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Desinstalador — Placas xTool")]
[assembly: AssemblyProduct("Placas xTool")]
[assembly: AssemblyVersion("1.2.0.0")]

namespace PlacasXToolInstaller
{
    static class UninstallProgram
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');

            Form form = new Form
            {
                Text = "Desinstalar Placas xTool",
                Width = 460,
                Height = 240,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                StartPosition = FormStartPosition.CenterScreen,
                BackColor = Color.FromArgb(244, 246, 245),
                Font = new Font("Segoe UI", 9.5f)
            };

            string icoPath = Path.Combine(installDir, "Placas_xTool_Icon_v6.ico");
            if (File.Exists(icoPath))
            {
                try { form.Icon = new Icon(icoPath); } catch { }
            }

            Label lblTitle = new Label
            {
                Text = "¿Deseas desinstalar Placas xTool de este equipo?",
                Location = new Point(24, 20),
                AutoSize = true,
                Font = new Font("Segoe UI", 11.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(22, 26, 24)
            };
            form.Controls.Add(lblTitle);

            Label lblDesc = new Label
            {
                Text = "Se eliminarán los archivos del programa, los accesos directos y el registro de Windows.",
                Location = new Point(25, 54),
                Size = new Size(395, 40),
                ForeColor = Color.FromArgb(100, 116, 139)
            };
            form.Controls.Add(lblDesc);

            CheckBox chkKeepData = new CheckBox
            {
                Text = "Conservar mis máquinas creadas y placas exportadas",
                Checked = true,
                Location = new Point(26, 102),
                AutoSize = true,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular)
            };
            form.Controls.Add(chkKeepData);

            Button btnCancel = new Button
            {
                Text = "Cancelar",
                Location = new Point(220, 146),
                Size = new Size(95, 34),
                BackColor = Color.White,
                FlatStyle = FlatStyle.System
            };
            btnCancel.Click += (s, e) => form.Close();
            form.Controls.Add(btnCancel);

            Button btnUninstall = new Button
            {
                Text = "Desinstalar",
                Location = new Point(325, 146),
                Size = new Size(95, 34),
                BackColor = Color.FromArgb(198, 40, 40),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.System
            };
            btnUninstall.Click += (s, e) =>
            {
                btnUninstall.Enabled = false;
                btnCancel.Enabled = false;

                try
                {
                    // 1. Cerrar procesos activos del programa
                    foreach (var procName in new string[] { "Generador_Placas_xTool" })
                    {
                        foreach (var p in Process.GetProcessesByName(procName))
                        {
                            try { p.Kill(); } catch { }
                        }
                    }
                    foreach (var p in Process.GetProcessesByName("node"))
                    {
                        try
                        {
                            string modPath = p.MainModule.FileName;
                            if (modPath != null && modPath.StartsWith(installDir, StringComparison.OrdinalIgnoreCase))
                            {
                                p.Kill();
                            }
                        }
                        catch { }
                    }

                    // 2. Eliminar acceso directo del Escritorio
                    string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    string desktopLnk = Path.Combine(desktop, "Placas xTool.lnk");
                    if (File.Exists(desktopLnk)) File.Delete(desktopLnk);

                    // 3. Eliminar acceso directo del Menú Inicio
                    string startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Placas xTool.lnk");
                    if (File.Exists(startMenu)) File.Delete(startMenu);

                    // 4. Eliminar entrada en el Registro de Windows (Apps & Features)
                    try
                    {
                        Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\PlacasXTool", false);
                    }
                    catch { }

                    // 5. Eliminar archivos del programa preservando data si se marcó
                    string backupData = null;
                    string backupExports = null;

                    if (chkKeepData.Checked)
                    {
                        string dataFolder = Path.Combine(installDir, "data");
                        string exportsFolder = Path.Combine(installDir, "Exportados_xTool");
                        string safeKeep = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PlacasXTool_UserData");
                        Directory.CreateDirectory(safeKeep);

                        if (Directory.Exists(dataFolder))
                        {
                            backupData = Path.Combine(safeKeep, "data");
                            CopyDir(dataFolder, backupData);
                        }
                        if (Directory.Exists(exportsFolder))
                        {
                            backupExports = Path.Combine(safeKeep, "Exportados_xTool");
                            CopyDir(exportsFolder, backupExports);
                        }
                    }

                    // Lanzar script autodestructivo para limpiar la carpeta tras cerrar este proceso
                    string cmd = string.Format(
                        "/c ping 127.0.0.1 -n 2 >nul & rmdir /s /q \"{0}\"",
                        installDir
                    );
                    ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", cmd)
                    {
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process.Start(psi);

                    MessageBox.Show(
                        "Placas xTool ha sido desinstalado correctamente de tu equipo." +
                        (chkKeepData.Checked ? "\n\nTus máquinas y placas se han conservado en:\n" + Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PlacasXTool_UserData") : ""),
                        "Desinstalación Completa",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );

                    form.Close();
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Error durante la desinstalación: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    form.Close();
                }
            };
            form.Controls.Add(btnUninstall);

            Application.Run(form);
        }

        private static void CopyDir(string source, string target)
        {
            Directory.CreateDirectory(target);
            foreach (var file in Directory.GetFiles(source))
            {
                File.Copy(file, Path.Combine(target, Path.GetFileName(file)), true);
            }
            foreach (var dir in Directory.GetDirectories(source))
            {
                CopyDir(dir, Path.Combine(target, Path.GetFileName(dir)));
            }
        }
    }
}
