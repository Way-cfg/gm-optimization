import { useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Check, History, ShieldOff, AlertTriangle, RotateCw, Zap, Gauge, Mountain, Sparkles } from "lucide-react";
import { useToast } from "../components/Toast";

interface RegistryEntry {
  path: string;
  name: string;
  value: string;
  type_: string;
}

interface ServiceEntry {
  name: string;
  startup_type: string;
}

interface TweakDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  registry?: RegistryEntry[];
  services?: ServiceEntry[];
  enableScript?: string[];
  disableScript?: string[];
  commands?: string[];
  requiresReboot?: boolean;
}

interface Preset {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tweaks: string[];
}

const tweaks: TweakDefinition[] = [
  {
    id: "WPFTweaksActivity",
    title: "Activity History - Disable",
    description: "Erases recent docs, clipboard, and run history.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "EnableActivityFeed", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "PublishUserActivities", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "UploadUserActivities", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksConsumerFeatures",
    title: "ConsumerFeatures - Disable",
    description: "Windows will not automatically install any games, third-party apps, or application links from the Windows Store for the signed-in user. Some default Apps will be inaccessible (eg. Phone Link).",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent", name: "DisableWindowsConsumerFeatures", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksTelemetry",
    title: "Telemetry - Disable",
    description: "Disables Microsoft Telemetry.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo", name: "Enabled", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy", name: "TailoredExperiencesWithDiagnosticDataEnabled", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy", name: "HasAccepted", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Input\\TIPC", name: "Enabled", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\InputPersonalization", name: "RestrictImplicitInkCollection", value: "1", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\InputPersonalization", name: "RestrictImplicitTextCollection", value: "1", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\InputPersonalization\\TrainedDataStore", name: "HarvestContacts", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Personalization\\Settings", name: "AcceptedPrivacyPolicy", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection", name: "AllowTelemetry", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "Start_TrackProgs", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "PublishUserActivities", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Siuf\\Rules", name: "NumberOfSIUFInPeriod", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "Set-MpPreference -SubmitSamplesConsent 2",
      "Set-Service -Name diagtrack -StartupType Disabled",
      "Set-Service -Name wermgr -StartupType Disabled",
      "Remove-ItemProperty -Path \"HKCU:\\Software\\Microsoft\\Siuf\\Rules\" -Name PeriodInNanoSeconds",
    ],
    disableScript: [
      "Set-MpPreference -SubmitSamplesConsent 1",
      "Set-Service -Name diagtrack -StartupType Automatic",
      "Set-Service -Name wermgr -StartupType Automatic",
    ],
  },
  {
    id: "WPFTweaksPowershell7Tele",
    title: "PowerShell 7 Telemetry - Disable",
    description: "Creates a system environment variable called 'POWERSHELL_TELEMETRY_OPTOUT' with a value of '1' to tell PowerShell 7 to opt-out of telemetry collections.",
    category: "Essential Tweaks",
    enableScript: [
      "[Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '1', 'Machine')",
    ],
    disableScript: [
      "[Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '', 'Machine')",
    ],
  },
  {
    id: "WPFTweaksDeleteTempFiles",
    title: "Temporary Files - Remove",
    description: "Erases TEMP Folders.",
    category: "Essential Tweaks",
    enableScript: [
      "Remove-Item -Path \"$Env:Temp\\*\" -Recurse -Force",
      "Remove-Item -Path \"$Env:SystemRoot\\Temp\\*\" -Recurse -Force",
    ],
    disableScript: [],
  },
  {
    id: "WPFTweaksRevertStartMenu",
    title: "Start Menu Previous Layout - Enable",
    description: "Brings back the previous classic Start Menu layout from before the gradual feature configuration changes rolled out in newer Windows editions.",
    category: "Essential Tweaks",
    requiresReboot: true,
    enableScript: [
      "Invoke-WebRequest https://github.com/thebookisclosed/ViVe/releases/download/v0.3.4/ViVeTool-v0.3.4-IntelAmd.zip -OutFile ViVeTool.zip",
      "Expand-Archive ViVeTool.zip -Force",
      "Remove-Item ViVeTool.zip -Force",
      "Start-Process 'ViVeTool\\ViVeTool.exe' -ArgumentList '/disable /id:47205210' -Wait -NoNewWindow",
      "Remove-Item ViVeTool -Recurse -Force",
    ],
    disableScript: [
      "Invoke-WebRequest https://github.com/thebookisclosed/ViVe/releases/download/v0.3.4/ViVeTool-v0.3.4-IntelAmd.zip -OutFile ViVeTool.zip",
      "Expand-Archive ViVeTool.zip -Force",
      "Remove-Item ViVeTool.zip -Force",
      "Start-Process 'ViVeTool\\ViVeTool.exe' -ArgumentList '/enable /id:47205210' -Wait -NoNewWindow",
      "Remove-Item ViVeTool -Recurse -Force",
    ],
  },
  {
    id: "WPFTweaksRestorePoint",
    title: "Restore Point - Create",
    description: "Removes Windows creation frequency limits and creates a live System Restore snapshot before applying modifications.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore", name: "SystemRestorePointCreationFrequency", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "if (-not (Get-ComputerRestorePoint)) { Enable-ComputerRestore -Drive $Env:SystemDrive }",
      "Checkpoint-Computer -Description \"System Restore Point created by Optimization Way\" -RestorePointType MODIFY_SETTINGS",
    ],
    disableScript: [],
  },
  {
    id: "WPFTweaksDisableStoreSearch",
    title: "Microsoft Store Recommended Search Results - Disable",
    description: "Will not display recommended Microsoft Store apps when searching for apps in the Start menu.",
    category: "Essential Tweaks",
    enableScript: [
      "icacls \"$Env:LocalAppData\\Packages\\Microsoft.WindowsStore_8wekyb3d8bbwe\\LocalState\\store.db\" /deny Everyone:F",
    ],
    disableScript: [
      "icacls \"$Env:LocalAppData\\Packages\\Microsoft.WindowsStore_8wekyb3d8bbwe\\LocalState\\store.db\" /grant Everyone:F",
    ],
  },
  {
    id: "WPFTweaksEndTaskOnTaskbar",
    title: "End Task With Right Click - Enable",
    description: "Enables option to end task when right clicking a program in the taskbar.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings", name: "TaskbarEndTask", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksDeBloat",
    title: "Unwanted Pre-Installed Apps - Remove",
    description: "This will remove a bunch of Windows pre-installed applications which most people dont want on their system.",
    category: "Essential Tweaks",
    enableScript: [
      "@(\"Microsoft.WindowsFeedbackHub\",\"Microsoft.BingNews\",\"Microsoft.BingSearch\",\"Microsoft.BingWeather\",\"Clipchamp.Clipchamp\",\"Microsoft.Todos\",\"Microsoft.PowerAutomateDesktop\",\"Microsoft.MicrosoftSolitaireCollection\",\"Microsoft.WindowsSoundRecorder\",\"Microsoft.MicrosoftStickyNotes\",\"Microsoft.Windows.DevHome\",\"Microsoft.Paint\",\"Microsoft.OutlookForWindows\",\"Microsoft.WindowsAlarms\",\"Microsoft.StartExperiencesApp\",\"Microsoft.GetHelp\",\"Microsoft.ZuneMusic\",\"MicrosoftCorporationII.QuickAssist\",\"MSTeams\") | ForEach-Object { Get-AppxPackage $_ -AllUsers | Remove-AppxPackage -AllUsers }",
      "$TeamsPath = \"$Env:LocalAppData\\Microsoft\\Teams\\Update.exe\"",
      "if (Test-Path $TeamsPath) { Start-Process $TeamsPath -ArgumentList '-uninstall' -Wait; Remove-Item $TeamsPath -Recurse -Force }",
    ],
    disableScript: [],
  },
  {
    id: "WPFTweaksWidget",
    title: "Widgets - Remove",
    description: "Removes the annoying widgets in the bottom left of the Taskbar.",
    category: "Essential Tweaks",
    enableScript: [
      "Get-Process *Widget* | Stop-Process",
      "Get-AppxPackage Microsoft.WidgetsPlatformRuntime -AllUsers | Remove-AppxPackage -AllUsers",
      "Get-AppxPackage MicrosoftWindows.Client.WebExperience -AllUsers | Remove-AppxPackage -AllUsers",
    ],
    disableScript: [
      "Add-AppxPackage -Register \"C:\\Program Files\\WindowsApps\\Microsoft.WidgetsPlatformRuntime*\\AppxManifest.xml\" -DisableDevelopmentMode",
      "Add-AppxPackage -Register \"C:\\Program Files\\WindowsApps\\MicrosoftWindows.Client.WebExperience*\\AppxManifest.xml\" -DisableDevelopmentMode",
    ],
  },
  {
    id: "WPFTweaksDisableExplorerAutoDiscovery",
    title: "File Explorer Automatic Folder Discovery - Disable",
    description: "Windows Explorer automatically tries to guess the type of the folder based on its contents, slowing down the browsing experience. WARNING! Will disable File Explorer grouping.",
    category: "Essential Tweaks",
    requiresReboot: true,
    enableScript: [
      "$bags = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\"",
      "$bagMRU = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\BagMRU\"",
      "Remove-Item -Path $bags -Recurse -Force",
      "Remove-Item -Path $bagMRU -Recurse -Force",
      "$allFolders = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\\AllFolders\\Shell\"",
      "if (!(Test-Path $allFolders)) { New-Item -Path $allFolders -Force }",
      "New-ItemProperty -Path $allFolders -Name \"FolderType\" -Value \"NotSpecified\" -PropertyType String -Force",
    ],
    disableScript: [
      "$bags = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\"",
      "$bagMRU = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\BagMRU\"",
      "Remove-Item -Path $bags -Recurse -Force",
      "Remove-Item -Path $bagMRU -Recurse -Force",
    ],
  },
  {
    id: "WPFTweaksDiskCleanup",
    title: "Disk Cleanup - Run",
    description: "Runs Disk Cleanup on Drive C: and aggressively strips obsolete component data blocks from old Windows Updates.",
    category: "Essential Tweaks",
    commands: [
      "cleanmgr.exe /d C: /VERYLOWDISK",
      "Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase",
    ],
  },
  {
    id: "WPFTweaksWPBT",
    title: "Windows Platform Binary Table (WPBT) - Disable",
    description: "If enabled, WPBT allows your computer vendor to execute programs at boot time, such as anti-theft software, software drivers, as well as force install software without user consent. Poses potential security risk.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager", name: "DisableWpbtExecution", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksHiber",
    title: "Hibernation - Disable",
    description: "Hibernation saves what is in memory before turning the PC off. Disabling it instantly frees up gigabytes of storage equivalent to your system RAM.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\System\\CurrentControlSet\\Control\\Session Manager\\Power", name: "HibernateEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FlyoutMenuSettings", name: "ShowHibernateOption", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "powercfg.exe /hibernate off",
    ],
    disableScript: [
      "powercfg.exe /hibernate on",
    ],
  },
  {
    id: "WPFTweaksLocation",
    title: "Location Tracking - Disable",
    description: "Disables Windows Location Tracking infrastructure, sensors, and map auto-updates to prevent telemetry overhead.",
    category: "Essential Tweaks",
    services: [
      { name: "lfsvc", startup_type: "Disable" },
    ],
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location", name: "Value", value: "Deny", type_: "String" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Sensor\\Overrides\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}", name: "SensorPermissionState", value: "0", type_: "DWord" },
      { path: "HKLM\\SYSTEM\\Maps", name: "AutoUpdateEnabled", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksBlockAdobeNet",
    title: "Adobe URL Block List - Enable",
    description: "Reduces user interruptions by selectively blocking connections to Adobe's activation and telemetry servers. Credit: Ruddernation-Designs",
    category: "Advanced Tweaks",
    enableScript: [
      "$hostsUrl = \"https://github.com/Ruddernation-Designs/Adobe-URL-Block-List/raw/refs/heads/master/hosts\"",
      "$hosts = \"$Env:SystemRoot\\System32\\drivers\\etc\\hosts\"",
      "Move-Item $hosts \"$hosts.bak\"",
      "Invoke-WebRequest $hostsUrl -OutFile $hosts",
      "ipconfig /flushdns",
    ],
    disableScript: [
      "$hosts = \"$Env:SystemRoot\\System32\\drivers\\etc\\hosts\"",
      "Remove-Item $hosts",
      "Move-Item \"$hosts.bak\" $hosts",
      "ipconfig /flushdns",
    ],
  },
  {
    id: "WPFTweaksDisableBGapps",
    title: "Background Apps - Disable",
    description: "Disables all Microsoft Store apps from running in the background, which has to be done individually since Windows 11.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications", name: "GlobalUserDisabled", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksBraveDebloat",
    title: "Brave Browser - Debloat",
    description: "Disables various annoyances like Brave Rewards, Leo AI, Crypto Wallet and VPN.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveRewardsDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveWalletDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveVPNDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveAIChatEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveStatsPingEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveNewsDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveTalkDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "TorDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveP3AEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "UrlKeyedAnonymizedDataCollectionEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "SafeBrowsingExtendedReportingEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "MetricsReportingEnabled", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksRemoveHome",
    title: "File Explorer Home and Gallery - Disable",
    description: "Removes the Home and Gallery from Explorer and sets This PC as default.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\Software\\Classes\\CLSID\\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}", name: "System.IsPinnedToNameSpaceTree", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "LaunchTo", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksDisableFSO",
    title: "Fullscreen Optimizations - Disable",
    description: "Disables FSO in all applications. NOTE: This will disable Color Management in Exclusive Fullscreen.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\System\\GameConfigStore", name: "GameDVR_DXGIHonorFSEWindowsCompatible", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksDisableIPv6",
    title: "IPv6 - Disable",
    description: "Disables IPv6.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters", name: "DisabledComponents", value: "255", type_: "DWord" },
    ],
    enableScript: [
      "Disable-NetAdapterBinding -Name * -ComponentID ms_tcpip6",
    ],
    disableScript: [
      "Enable-NetAdapterBinding -Name * -ComponentID ms_tcpip6",
    ],
  },
  {
    id: "WPFTweaksIPv46",
    title: "IPv6 - Set IPv4 as Preferred",
    description: "Setting the IPv4 preference can have latency and security benefits on private networks where IPv6 is not configured.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters", name: "DisabledComponents", value: "32", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksEdgeDebloat",
    title: "Microsoft Edge - Debloat",
    description: "Disables various Edge annoyances such as startup boost, sleeping tabs, shopping, password manager, sidebar, and more.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "StartupBoostEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "SleepingTabsEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "BackgroundModeEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "PersonalizationReportingEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "PasswordManagerEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "AutofillCreditCardEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "AddressBarEditingEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "ShoppingListEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "EdgeShoppingAssistantEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "CollectionsServicesAndExportsEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "WalletServiceEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "HubSidebarEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "ShowRecommendationsEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "FamilySafetyEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "EdgeDigitalWalletEnabled", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksRemoveEdge",
    title: "Microsoft Edge - Remove",
    description: "Unblocks Microsoft Edge uninstaller restrictions then uses the uninstaller to remove Edge.",
    category: "Advanced Tweaks",
    enableScript: [
      "Stop-Process -Name msedge, edgeupdate -Force -ErrorAction SilentlyContinue",
      "$edgeSetup = Get-ChildItem -Path 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application' -Filter 'setup.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1",
      "if ($edgeSetup) { Start-Process $edgeSetup.FullName -ArgumentList '--uninstall --system-level --force-uninstall --delete-profile' -Wait -NoNewWindow }",
      "@('C:\\Program Files (x86)\\Microsoft\\Edge', 'C:\\Program Files (x86)\\Microsoft\\EdgeCore', 'C:\\Program Files (x86)\\Microsoft\\EdgeWebView', $env:LOCALAPPDATA+'\\Microsoft\\Edge', $env:LOCALAPPDATA+'\\Microsoft\\EdgeWebView', $env:APPDATA+'\\Microsoft\\Edge') | ForEach-Object { if (Test-Path $_) { Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue } }",
    ],
    disableScript: [
      "Write-Host 'Installing Microsoft Edge...'",
      "winget install Microsoft.Edge --source winget",
    ],
  },
  {
    id: "WPFTweaksRemoveOneDrive",
    title: "Microsoft OneDrive - Remove",
    description: "Denies permission to remove OneDrive user files, then uses its own uninstaller to remove it and restores the original permission afterward.",
    category: "Advanced Tweaks",
    enableScript: [
      "Stop-Process -Name FileCoAuth -Force -ErrorAction SilentlyContinue",
      "Start-Process 'C:\\Windows\\System32\\OneDriveSetup.exe' -ArgumentList '/uninstall' -Wait",
      "Stop-Process -Name FileCoAuth, Explorer -Force -ErrorAction SilentlyContinue",
      "Remove-Item \"$env:LOCALAPPDATA\\Microsoft\\OneDrive\" -Recurse -Force -ErrorAction SilentlyContinue",
      "Remove-Item \"C:\\ProgramData\\Microsoft OneDrive\" -Recurse -Force -ErrorAction SilentlyContinue",
      "Set-Service -Name OneSyncSvc -StartupType Disabled",
    ],
    disableScript: [
      "Write-Host 'Installing OneDrive...'",
      "winget install Microsoft.OneDrive --source winget",
      "Set-Service -Name OneSyncSvc -StartupType Automatic",
    ],
  },
  {
    id: "WPFTweaksRazerBlock",
    title: "Razer Software Auto-Install - Disable",
    description: "Blocks ALL Razer Software installations. The hardware works fine without any software.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DriverSearching", name: "SearchOrderConfig", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Device Installer", name: "DisableCoInstallers", value: "1", type_: "DWord" },
    ],
    enableScript: [
      "$RazerPath = 'C:\\Windows\\Installer\\Razer'",
      "if (Test-Path $RazerPath) { Remove-Item $RazerPath\\* -Recurse -Force } else { New-Item -Path $RazerPath -ItemType Directory -Force }",
      "icacls $RazerPath /deny 'Everyone:(W)'",
    ],
    disableScript: [
      "icacls 'C:\\Windows\\Installer\\Razer' /remove:d Everyone",
    ],
  },
  {
    id: "WPFTweaksDisableBitLocker",
    title: "BitLocker - Disable",
    description: "Disables BitLocker encryption on the main system drive.",
    category: "Essential Tweaks",
    requiresConfirmation: true,
    confirmTitle: "Disable BitLocker?",
    confirmMessage: "This will decrypt your system drive. The process may take several minutes depending on drive size. Your data will remain accessible during and after decryption.",
    enableScript: [
      "Disable-BitLocker -MountPoint $Env:SystemDrive",
    ],
    disableScript: [
      "Enable-BitLocker -MountPoint $Env:SystemDrive",
    ],
  },
];

const presets: Preset[] = [
  {
    id: "simple",
    label: "Simple Tweak",
    description: "Essential privacy and performance tweaks",
    icon: Zap,
    tweaks: ["WPFTweaksActivity", "WPFTweaksTelemetry", "WPFTweaksPowershell7Tele", "WPFTweaksDisableStoreSearch", "WPFTweaksDeleteTempFiles", "WPFTweaksDeBloat", "WPFTweaksEndTaskOnTaskbar"],
  },
  {
    id: "balanced",
    label: "Balanced Tweak",
    description: "Moderate optimizations for daily use",
    icon: Gauge,
    tweaks: ["WPFTweaksActivity", "WPFTweaksTelemetry", "WPFTweaksPowershell7Tele", "WPFTweaksDisableStoreSearch", "WPFTweaksDeleteTempFiles", "WPFTweaksDeBloat", "WPFTweaksWidget", "WPFTweaksEndTaskOnTaskbar", "WPFTweaksConsumerFeatures", "WPFTweaksRevertStartMenu", "WPFTweaksRestorePoint", "WPFTweaksDisableExplorerAutoDiscovery", "WPFTweaksDiskCleanup", "WPFTweaksWPBT", "WPFTweaksHiber", "WPFTweaksLocation"],
  },
  {
    id: "extreme",
    label: "Extreme Plus Tweak",
    description: "Maximum system optimization",
    icon: Mountain,
    tweaks: ["WPFTweaksActivity", "WPFTweaksTelemetry", "WPFTweaksPowershell7Tele", "WPFTweaksDisableStoreSearch", "WPFTweaksDeleteTempFiles", "WPFTweaksDeBloat", "WPFTweaksWidget", "WPFTweaksEndTaskOnTaskbar", "WPFTweaksConsumerFeatures", "WPFTweaksRevertStartMenu", "WPFTweaksRestorePoint", "WPFTweaksDisableExplorerAutoDiscovery", "WPFTweaksDiskCleanup", "WPFTweaksWPBT", "WPFTweaksHiber", "WPFTweaksLocation", "WPFTweaksDisableBitLocker"],
  },
];

const categories = [...new Set(tweaks.map(t => t.category))];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

export default function TweaksHub() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<TweakDefinition | null>(null);
  const { toast } = useToast();

  const toggleCheck = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActivePreset(null);
  };

  const applyPreset = (preset: Preset) => {
    setSelected(new Set(preset.tweaks));
    setActivePreset(preset.id);
  };

  const runSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast("info", "No tweaks selected");
      return;
    }

    const confirmTweak = tweaks.find(t => t.requiresConfirmation && selected.has(t.id));
    if (confirmTweak) {
      setConfirm(confirmTweak);
      return;
    }

    await executeBatch(ids);
  };

  const executeBatch = async (ids: string[]) => {
    setRunning(true);
    let success = 0;
    let fail = 0;
    const errors: string[] = [];

    for (const id of ids) {
      setApplying(prev => new Set(prev).add(id));
      const tweak = tweaks.find(t => t.id === id)!;

      try {
        if (tweak.registry) {
          await invoke<string>("apply_registry_tweak", { entries: tweak.registry, enabled: true });
        }
        if (tweak.enableScript && tweak.disableScript) {
          await invoke<string>("execute_powershell_tweak", {
            enabled: true,
            enableScript: tweak.enableScript,
            disableScript: tweak.disableScript,
          });
        }
        if (tweak.commands) {
          await invoke<string>("execute_native_commands", { commands: tweak.commands });
        }
        if (tweak.services) {
          await invoke<string>("configure_services", { entries: tweak.services });
        }
        success++;
      } catch (e) {
        fail++;
        errors.push(`${tweak.title}: ${e}`);
      }

      setApplying(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }

    setRunning(false);

    if (fail > 0) {
      toast("error", `Applied ${success}/${ids.length} tweaks — ${fail} failed`);
    } else {
      toast("success", `Applied all ${success} tweaks successfully`);
    }
  };

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto">
        <motion.div variants={child} className="mb-8">
          <h1 className="text-xl font-semibold text-white/90 tracking-tight">Tweaks Hub</h1>
          <p className="text-sm text-white/25 mt-1">Select tweaks or use a preset, then run all at once</p>
        </motion.div>

        <motion.div variants={child} className="flex gap-3 mb-6">
          {presets.map(p => {
            const Icon = p.icon;
            const isActive = activePreset === p.id;
            const count = p.tweaks.filter(id => selected.has(id)).length;
            return (
              <div
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`flex-1 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-neon/[0.06] border-neon/30"
                    : "bg-frosted/80 backdrop-blur-xl border-white/[0.05] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? "bg-neon/[0.12]" : "bg-white/[0.04]"
                  }`}>
                    <Icon size={15} strokeWidth={1.5} className={isActive ? "text-neon" : "text-white/30"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isActive ? "text-white/90" : "text-white/60"}`}>{p.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isActive ? "text-white/25" : "text-white/[0.15]"}`}>{count}/28 selected</div>
                  </div>
                </div>
                <div className={`text-[11px] leading-relaxed ${isActive ? "text-white/30" : "text-white/[0.15]"}`}>{p.description}</div>
              </div>
            );
          })}
        </motion.div>

        {categories.map(cat => (
          <motion.div key={cat} variants={child} className="bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <History size={14} strokeWidth={1.5} className="text-white/20" />
              <span className="text-[11px] text-white/20 uppercase tracking-widest">{cat}</span>
            </div>
            <div className="space-y-1">
              {tweaks.filter(t => t.category === cat).map(tweak => {
                const isChecked = selected.has(tweak.id);
                const isApplying = applying.has(tweak.id);
                return (
                  <div
                    key={tweak.id}
                    onClick={() => !running && toggleCheck(tweak.id)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border transition-all duration-200 ${
                      running ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-white/[0.04]"
                    } ${isChecked ? "border-white/[0.08]" : "border-white/[0.04]"}`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0 ${
                      isApplying
                        ? "border-neon/40 bg-neon/[0.1]"
                        : isChecked
                          ? "bg-neon/[0.15] border-neon/40"
                          : "border-white/[0.12] hover:border-white/25"
                    }`}>
                      {isApplying ? (
                        <div className="w-3 h-3 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
                      ) : isChecked ? (
                        <Check size={12} strokeWidth={3} className="text-neon" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium transition-colors duration-200 ${isChecked ? "text-white/80" : "text-white/50"}`}>
                        {tweak.title}
                      </div>
                      <div className="text-[11px] text-white/20 mt-0.5">{tweak.description}</div>
                    </div>
                    {tweak.requiresReboot && (
                      <RotateCw size={12} strokeWidth={1.5} className="text-neon/40 shrink-0" />
                    )}
                    {tweak.requiresConfirmation && (
                      <AlertTriangle size={12} strokeWidth={1.5} className="text-white/15 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

        <motion.div variants={child} className="pb-8">
          <button
            onClick={runSelected}
            disabled={running || selected.size === 0}
            className="relative w-full py-3.5 rounded-2xl bg-neon/15 border border-neon/25 text-neon text-sm font-medium hover:bg-neon/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon/[0.04] to-transparent group-hover:via-neon/[0.08] transition-all duration-500" />
            <span className="relative flex items-center gap-2.5">
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
                  Running Optimization…
                </>
              ) : (
                <>
                  <Sparkles size={15} strokeWidth={1.5} />
                  Run Optimization Way Engine
                  <span className="text-[11px] text-neon/40 font-normal">({selected.size})</span>
                </>
              )}
            </span>
          </button>
        </motion.div>
      </motion.div>

      {confirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirm(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={e => e.stopPropagation()}
            className="bg-frosted/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-crimson/[0.12] flex items-center justify-center">
                <ShieldOff size={16} strokeWidth={1.5} className="text-crimson" />
              </div>
              <div>
                <div className="text-sm font-medium text-white/80">{confirm.confirmTitle}</div>
                <div className="text-[11px] text-white/25 mt-0.5">This action requires confirmation</div>
              </div>
            </div>
            <p className="text-xs text-white/40 leading-relaxed mb-6">{confirm.confirmMessage}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirm(null);
                  executeBatch(Array.from(selected));
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-crimson/80 hover:bg-crimson transition-all duration-200"
              >
                Disable BitLocker
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
