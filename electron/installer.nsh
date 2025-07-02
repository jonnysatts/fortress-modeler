# Custom NSIS installer script for professional appearance
# This adds custom branding and messaging to the installer

!macro customInstall
  # Create application data directory
  CreateDirectory "$APPDATA\Fortress Financial Modeler"
  
  # Set up file associations (optional)
  WriteRegStr HKCR ".fmmodel" "" "FortressModel"
  WriteRegStr HKCR "FortressModel" "" "Fortress Financial Model"
  WriteRegStr HKCR "FortressModel\shell\open\command" "" '"$INSTDIR\Fortress Financial Modeler.exe" "%1"'
!macroend

!macro customUnInstall
  # Clean up registry entries
  DeleteRegKey HKCR ".fmmodel"
  DeleteRegKey HKCR "FortressModel"
  
  # Remove application data (optional - ask user)
  MessageBox MB_YESNO "Do you want to remove all application data and models?" IDNO skip_data_removal
    RMDir /r "$APPDATA\Fortress Financial Modeler"
  skip_data_removal:
!macroend

# Custom installer pages
!macro customHeader
  !define MUI_WELCOMEPAGE_TITLE "Welcome to Fortress Financial Modeler Setup"
  !define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Fortress Financial Modeler.$\r$\n$\r$\nA professional financial modeling and analysis tool for creating comprehensive business models, projections, and reports."
  
  !define MUI_FINISHPAGE_TITLE "Fortress Financial Modeler Installation Complete"
  !define MUI_FINISHPAGE_TEXT "Fortress Financial Modeler has been successfully installed on your computer.$\r$\n$\r$\nClick Finish to close this wizard and start using the application."
!macroend