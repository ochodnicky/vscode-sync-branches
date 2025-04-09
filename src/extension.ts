import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    let syncCommand = vscode.commands.registerCommand('extension.syncBranches', () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;

        const config = vscode.workspace.getConfiguration('syncBranches');
        const defaultSourceBranch = config.get('defaultSourceBranch', '');
        const defaultTargetBranch = config.get('defaultTargetBranch', '');
        const alwaysPromptForBranches = config.get('alwaysPromptForBranches', false);

        const sourceBranchPromise = vscode.window.showInputBox({
            prompt: 'Enter source branch',
            value: alwaysPromptForBranches ? defaultSourceBranch : ''
        });

        sourceBranchPromise.then(sourceBranch => {
            if (!sourceBranch) {
                vscode.window.showErrorMessage('Source branch is required');
                return;
            }

            const targetBranchPromise = vscode.window.showInputBox({
                prompt: 'Enter target branch',
                value: alwaysPromptForBranches ? defaultTargetBranch : ''
            });

            targetBranchPromise.then(targetBranch => {
                if (!targetBranch) {
                    vscode.window.showErrorMessage('Target branch is required');
                    return;
                }

                const script = `
                    #!/bin/bash
                    cd "${workspacePath}"
                    if [[ $(git status --porcelain) ]]; then
                      echo "Stashing changes...\n"
                      git stash
                    else
                      echo "No changes to stash.\n"
                    fi
                    echo "Checking out ${sourceBranch} branch...\n"
                    git checkout ${sourceBranch}
                    echo "Pulling latest changes from ${sourceBranch} branch...\n"
                    git pull origin ${sourceBranch}

                    # Check if target branch exists
                    if git rev-parse --verify ${targetBranch}; then
                      echo "Checking out ${targetBranch} branch...\n"
                      git checkout ${targetBranch}
                      echo "Pulling latest changes from ${targetBranch} branch...\n"
                      git pull origin ${targetBranch}
                    else
                      echo "Target branch ${targetBranch} does not exist. Creating it...\n"
                      git checkout -b ${targetBranch}
                    fi

                    # Check if sync branch exists
                    if git rev-parse --verify ${targetBranch}-sync; then
                      echo "Branch ${targetBranch}-sync already exists. Deleting it...\n"
                      git branch -D ${targetBranch}-sync
                    fi

                    echo "Creating a new branch ${targetBranch}-sync from ${targetBranch}...\n"
                    git checkout -b ${targetBranch}-sync

                    echo "Merging ${sourceBranch} branch into ${targetBranch}-sync...\n"
                    if git merge ${sourceBranch}; then
                      echo "Merge completed successfully.\n"
                    else
                      echo "Merge conflict detected. Please resolve conflicts and try again.\n"
                      exit 1
                    fi

                    echo "All done! Please resolve conflicts and create a pull request\n"
                `;
                exec(script, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Error: ${stderr}`);
                    } else {
                        vscode.window.showInformationMessage(stdout);
                    }
                });
            });
        });
    });

    let configureCommand = vscode.commands.registerCommand('extension.configureSyncBranches', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'syncBranches');
    });

    context.subscriptions.push(syncCommand, configureCommand);
}

export function deactivate() {}
