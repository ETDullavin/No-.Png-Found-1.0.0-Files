# Ctrl + Shift + B to sync folder contents to Minecraft Bedrock Addon development folders
# --- CONFIGURATION ---
$AddonName = "No .png Found" 
$SourcePath = Get-Location
$MinecraftPath = "$env:APPDATA\Minecraft Bedrock\Users\Shared\games\com.mojang"

Write-Host "------------------------------------------------" -ForegroundColor Gray
Write-Host "STARTING CLEAN SYNC FOR: $AddonName" -ForegroundColor Cyan

# --- SYNC LOGIC ---

# Sync Behavior Pack
$BPPath = "$SourcePath\NoPngFound_BP"
if (Test-Path $BPPath) {
    $DestBP = "$MinecraftPath\development_behavior_packs\$AddonName"
    
    # NEW: Delete existing contents first
    if (Test-Path $DestBP) {
        Write-Host "Cleaning destination: $DestBP" -ForegroundColor DarkGray
        Remove-Item -Path "$DestBP\*" -Recurse -Force
    }
    else {
        New-Item -ItemType Directory -Path $DestBP -Force | Out-Null
    }

    Copy-Item -Path "$BPPath\*" -Destination $DestBP -Recurse -Force
    Write-Host "SUCCESS: Behavior Pack cleaned and updated." -ForegroundColor Green
}

# Sync Resource Pack (Assuming folder name is NoPngFound_RP)
$RPPath = "$SourcePath\NoPngFound_RP"
if (Test-Path $RPPath) {
    $DestRP = "$MinecraftPath\development_resource_packs\$AddonName"
    
    # NEW: Delete existing contents first
    if (Test-Path $DestRP) {
        Write-Host "Cleaning destination: $DestRP" -ForegroundColor DarkGray
        Remove-Item -Path "$DestRP\*" -Recurse -Force
    }
    else {
        New-Item -ItemType Directory -Path $DestRP -Force | Out-Null
    }

    Copy-Item -Path "$RPPath\*" -Destination $DestRP -Recurse -Force
    Write-Host "SUCCESS: Resource Pack cleaned and updated." -ForegroundColor Green
}

Write-Host "------------------------------------------------" -ForegroundColor Gray
Write-Host "Sync Complete!" -ForegroundColor Magenta