; Inno Setup Script for Astraura 1.58-Bit AI Engine (Windows)
#define MyAppName "Astraura 1.58-Bit"
#define MyAppVersion "1.5.8"
#define MyAppPublisher "StarSeed System"
#define MyAppURL "https://github.com/StarSeedSystem/astraura"
#define MyAppExeName "Astraura.exe"

[Setup]
AppId={{5B26E80C-89E3-4E8E-874C-9786A5E12E99}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Astraura
DisableProgramGroupPage=yes
LicenseFile=..\..\..\README.md
PrivilegesRequired=admin
OutputDir=..\..\dist
OutputBaseFilename=Astraura-1.58b-Windows-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\..\..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".git\*,.venv\*,frontend\node_modules\*"

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\deploy\installers\windows\install_windows.bat"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\deploy\installers\windows\install_windows.bat"; Tasks: desktopicon

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\deploy\installers\windows\install_windows.ps1"""; Description: "Completar configuracion de entorno y dependencias"; Flags: runascurrentuser postinstall nowait
