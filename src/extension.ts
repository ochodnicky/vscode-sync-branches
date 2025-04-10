import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    let syncCommand = vscode.commands.registerCommand('extension.syncBranches', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const config = vscode.workspace.getConfiguration('syncBranches');
        const defaultSourceBranch = config.get('defaultSourceBranch', '');
        const defaultTargetBranch = config.get('defaultTargetBranch', '');
        const targetBranchSuffix = config.get('targetBranchSuffix', '-sync');
        const alwaysPromptForBranches = config.get('alwaysPromptForBranches', false);

        const sourceBranch = await vscode.window.showInputBox({
            prompt: 'Enter source branch',
            value: alwaysPromptForBranches ? defaultSourceBranch : ''
        });

        if (!sourceBranch) {
            vscode.window.showErrorMessage('Source branch is required');
            return;
        }

        const targetBranch = await vscode.window.showInputBox({
            prompt: 'Enter target branch',
            value: alwaysPromptForBranches ? defaultTargetBranch : ''
        });

        if (!targetBranch) {
            vscode.window.showErrorMessage('Target branch is required');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Syncing branches',
            cancellable: false
        }, async (progress) => {
            const execPromise = (command: string): Promise<string> => {
                return new Promise((resolve, reject) => {
                    exec(command, { cwd: workspacePath }, (error, stdout, stderr) => {
                        if (error) {
                            reject(stderr);
                        } else {
                            resolve(stdout);
                        }
                    });
                });
            };

            try {
                // Check for changes and stash if needed
                progress.report({ message: 'Checking for changes...' });
                const status = await execPromise('git status --porcelain');
                if (status) {
                    const stashResponse = await vscode.window.showQuickPick(['Yes', 'No'], {
                        placeHolder: 'Do you want to stash your changes?'
                    });

                    if (stashResponse === 'Yes') {
                        const stashName = await vscode.window.showInputBox({
                            prompt: 'Enter a name for your stash (optional)',
                            value: ''
                        }) || 'WIP';
                        progress.report({ message: 'Stashing changes...' });
                        await execPromise(`git stash push -m "${stashName}"`);
                    } else {
                        vscode.window.showErrorMessage('Please commit your changes or stash them before switching branches.');
                        return;
                    }
                }

                // Checkout and update source branch
                progress.report({ message: `Checking out ${sourceBranch} branch...` });
                await execPromise(`git checkout ${sourceBranch}`);
                progress.report({ message: `Pulling latest changes from ${sourceBranch} branch...` });
                await execPromise(`git pull origin ${sourceBranch}`);

                // Handle target branch
                const targetExists = await execPromise(`git rev-parse --verify ${targetBranch}`).catch(() => false);
                if (targetExists) {
                    progress.report({ message: `Checking out ${targetBranch} branch...` });
                    await execPromise(`git checkout ${targetBranch}`);
                    progress.report({ message: `Pulling latest changes from ${targetBranch} branch...` });
                    await execPromise(`git pull origin ${targetBranch}`);
                } else {
                    progress.report({ message: `Creating ${targetBranch} branch...` });
                    await execPromise(`git checkout -b ${targetBranch}`);
                }

                // Handle sync branch
                const syncBranchName = `${targetBranch}${targetBranchSuffix}`;
                const syncExists = await execPromise(`git rev-parse --verify ${syncBranchName}`).catch(() => false);
                if (syncExists) {
                    progress.report({ message: `Deleting existing ${syncBranchName} branch...` });
                    await execPromise(`git branch -D ${syncBranchName}`);
                }

                progress.report({ message: `Creating ${syncBranchName} branch...` });
                await execPromise(`git checkout -b ${syncBranchName}`);

                progress.report({ message: `Merging ${sourceBranch} into ${syncBranchName}...` });
                await execPromise(`git merge ${sourceBranch}`).catch(async (error) => {
                    vscode.window.showErrorMessage(`Merge conflict occurred: ${error}. Please resolve the conflicts and commit the changes.`);
                    throw error;
                });

                vscode.window.showInformationMessage('Branch sync completed successfully! Please push the branch and create a pull request.');
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        });
    });

    let configureCommand = vscode.commands.registerCommand('extension.configureSyncBranches', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'syncBranches');
    });

    context.subscriptions.push(syncCommand, configureCommand);
}

export function deactivate() {}
