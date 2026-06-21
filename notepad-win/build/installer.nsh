!macro customInstall
  WriteRegStr HKLM "Software\Classes\*\shell\Edit with I Love Notepad" "" "Edit with I Love Notepad"
  WriteRegStr HKLM "Software\Classes\*\shell\Edit with I Love Notepad" "Icon" "$INSTDIR\I Love Notepad.exe,0"
  WriteRegStr HKLM "Software\Classes\*\shell\Edit with I Love Notepad\command" "" '"$INSTDIR\I Love Notepad.exe" "%1"'
!macroend

!macro customUninstall
  DeleteRegKey HKLM "Software\Classes\*\shell\Edit with I Love Notepad"
!macroend
