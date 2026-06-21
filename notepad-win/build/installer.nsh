!macro customInstall
  WriteRegStr HKCU "Software\Classes\*\shell\Edit with I Love Notepad" "" "Edit with I Love Notepad"
  WriteRegStr HKCU "Software\Classes\*\shell\Edit with I Love Notepad" "Icon" "$INSTDIR\I Love Notepad.exe,0"
  WriteRegStr HKCU "Software\Classes\*\shell\Edit with I Love Notepad\command" "" '"$INSTDIR\I Love Notepad.exe" "%1"'
!macroend

!macro customUninstall
  DeleteRegKey HKCU "Software\Classes\*\shell\Edit with I Love Notepad"
!macroend
