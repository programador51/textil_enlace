; Instalador de escritorio de TextilEnlace.
; Se compila con: npm run desktop:build  (o ISCC.exe desktop\textilenlace.iss después del build)

#define AppName "TextilEnlace"
#define AppVersion "0.1.0"
#define AppPublisher "Equipo 3"

[Setup]
AppId={{6B1E2F4A-7C3D-4E8B-9A1F-2D5C8E7B4A10}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=output
OutputBaseFilename=TextilEnlace-Setup-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#AppName}

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\runtime\node.exe"; Parameters: """{app}\launcher.mjs"""; WorkingDir: "{app}"; Comment: "Abre TextilEnlace sin conexión"
Name: "{group}\Desinstalar {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\runtime\node.exe"; Parameters: """{app}\launcher.mjs"""; WorkingDir: "{app}"; Tasks: desktopicon; Comment: "Abre TextilEnlace sin conexión"

[Run]
Filename: "{app}\runtime\node.exe"; Parameters: """{app}\launcher.mjs"""; WorkingDir: "{app}"; Description: "Abrir {#AppName} ahora"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -Command ""Get-Process node,postgres -ErrorAction SilentlyContinue | Where-Object {{ $_.Path -like '{app}\*' } | Stop-Process -Force"""; Flags: runhidden; RunOnceId: "StopTextilEnlace"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
