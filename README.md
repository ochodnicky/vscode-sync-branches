# Sync branches

Synch branches is a Visual Studio Code extension designed to facilitate branch synchronization in Git repositories.

## Features

- Synchronize between specified branches.
- Stash uncommitted changes
- Set default source and target branches.
- Automatically create a branch named like `defaultTargetBranch-targetBranchSuffix` for creating a PR into target branch.

## Usage

1. Open the command palette (Ctrl+Shift+P or Cmd+Shift+P on macOS).
2. Type `Sync branches` and follow the prompts.

## Settings

- `syncBranches.defaultSourceBranch`: Default source branch for syncing. Leave empty to always prompt.
- `syncBranches.defaultTargetBranch`: Default target branch for syncing. Leave empty to always prompt.
- `syncBranches.targetBranchSuffix`: Target branch suffix for syncing.
- `syncBranches.alwaysPromptForBranches`: Always prompt for branches even if defaults are set.

## Installation

1. Download the `.vsix` file.
2. Open Visual Studio Code.
3. Go to the Extensions view.
4. Click on the three dots in the top right corner and select "Install from VSIX...".
5. Select the downloaded `.vsix` file to install.

## Requirements

- Visual Studio Code version 1.96.2 or higher.

## Contributing

Feel free to submit issues or pull requests for improvements and bug fixes.
