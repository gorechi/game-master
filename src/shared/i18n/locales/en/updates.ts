export const enUpdatesMessages = {
  notice: {
    available: 'A new version {version} is available',
    hint: 'You have {current}. You can download the installer on the releases page.',
    releases: 'Releases page',
    dismiss: 'Dismiss notification',
    dismissLabel: 'Dismiss new version notification'
  },
  section: {
    title: 'Updates',
    description:
      'The app checks the latest release on GitHub. There is no automatic installation: you need to download the installer and run it manually.',
    checkingTitle: 'Checking for updates…',
    checkingHint: 'Requesting the latest release from GitHub.',
    availableTitle: 'A new version {version} is available',
    availableHint:
      'You have {current}. Download the installer on the releases page and run it — your data and settings will be preserved.',
    latestTitle: 'You are on the latest version',
    latestHint: 'Version {version} is the newest.',
    errorTitle: 'Could not check for updates',
    errorHint: 'Check your internet connection and try again.',
    idleTitle: 'No check has run yet',
    idleHint: 'Current version {version}.',
    releases: 'Releases page',
    checkYourself: 'Check manually',
    checkedAt: 'Checked {date}',
    notChecked: 'Never checked',
    checking: 'Checking…',
    checkAgain: 'Check again'
  },
  errors: {
    network: 'Could not reach GitHub',
    timeout: 'GitHub response timed out',
    http: 'GitHub responded with code {status}',
    badVersion: 'GitHub returned a release without a clear version number'
  }
}
