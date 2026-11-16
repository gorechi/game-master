; Выбор языка при первой установке.
;
; Настройки приложения лежат в %APPDATA%\Game Master\settings.json.
; Если файла ещё нет, показываем страницу выбора языка и записываем локаль.
; При обновлении и повторной установке настройки не трогаем.

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER

Var AppLocaleRadioRu
Var AppLocaleRadioEn
Var AppLocaleChoice

Function DetectDefaultAppLocale
  ; 1049 — русский язык интерфейса Windows.
  System::Call 'kernel32::GetUserDefaultUILanguage() i .r0'
  ${If} $0 == 1049
    StrCpy $AppLocaleChoice "ru"
  ${Else}
    StrCpy $AppLocaleChoice "en"
  ${EndIf}
FunctionEnd

Function WriteInitialAppSettings
  ${If} $AppLocaleChoice == ""
    Call DetectDefaultAppLocale
  ${EndIf}

  IfFileExists "$APPDATA\${PRODUCT_NAME}\settings.json" settingsReady
    CreateDirectory "$APPDATA\${PRODUCT_NAME}"
    FileOpen $0 "$APPDATA\${PRODUCT_NAME}\settings.json" w
    FileWrite $0 '{"schemaVersion":1,"theme":"dark","locale":"$AppLocaleChoice"}'
    FileClose $0
  settingsReady:
FunctionEnd

Function AppLanguagePageCreate
  ; Первая установка: приложения ещё нет, настроек тоже.
  ; Если что-то из этого уже существует, это обновление или переустановка.
  ${If} ${FileExists} "$INSTDIR\${PRODUCT_NAME}.exe"
    Abort
  ${EndIf}
  ${If} ${FileExists} "$APPDATA\${PRODUCT_NAME}\settings.json"
    Abort
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "Application language" "Язык приложения"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 26u "Choose the language of the app interface. You can change it later in Settings.$\r$\nВыберите язык интерфейса. Его можно изменить позже в настройках."
  Pop $0

  ${NSD_CreateRadioButton} 0 36u 100% 12u "English"
  Pop $AppLocaleRadioEn

  ${NSD_CreateRadioButton} 0 54u 100% 12u "Русский"
  Pop $AppLocaleRadioRu

  Call DetectDefaultAppLocale
  ${If} $AppLocaleChoice == "ru"
    ${NSD_Check} $AppLocaleRadioRu
  ${Else}
    ${NSD_Check} $AppLocaleRadioEn
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function AppLanguagePageLeave
  ${NSD_GetState} $AppLocaleRadioRu $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $AppLocaleChoice "ru"
  ${Else}
    StrCpy $AppLocaleChoice "en"
  ${EndIf}
FunctionEnd

!macro customPageAfterChangeDir
  Page custom AppLanguagePageCreate AppLanguagePageLeave
!macroend

!macro customInstall
  ; Страховка для тихой установки, где страницы не показываются.
  Call WriteInitialAppSettings
!macroend

!endif
