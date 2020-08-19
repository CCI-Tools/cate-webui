import copyToClipboard from 'copy-to-clipboard';
import {
    DesktopActions,
    MessageBoxOptions,
    MessageBoxResult,
    OpenDialogOptions,
    OpenDialogResult,
    SaveDialogOptions, SaveDialogResult
} from './types';
import electron from './electron';

const newDesktopActions = (): DesktopActions => {

    if (electron) {
        return {
            isNativeUI: true,

            showFileOpenDialog: (openDialogOptions: OpenDialogOptions, onClose: (result: OpenDialogResult) => any): void => {
                const actionName = 'show-open-dialog';
                electron.ipcRenderer.send(actionName, openDialogOptions, false);
                electron.ipcRenderer.once(actionName + '-reply', (event, result: OpenDialogResult) => {
                    onClose(result);
                });
            },

            showFileSaveDialog: (saveDialogOptions: SaveDialogOptions, onClose: (result: SaveDialogResult) => any): void => {
                const actionName = 'show-save-dialog';
                electron.ipcRenderer.send(actionName, saveDialogOptions, false);
                electron.ipcRenderer.once(actionName + '-reply', (event, result: SaveDialogResult) => {
                    onClose(result);
                });
            },

            showMessageBox: (messageBoxOptions: MessageBoxOptions, onClose: (result: MessageBoxResult | null) => any): void => {
                const actionName = 'show-message-box';
                if (!messageBoxOptions.buttons) {
                    messageBoxOptions = {...messageBoxOptions, buttons: ['OK']};
                }
                electron.ipcRenderer.send(actionName, messageBoxOptions, false);
                electron.ipcRenderer.once(actionName + '-reply', (event, buttonIndex: number, checkboxChecked: boolean) => {
                    onClose({buttonIndex, checkboxChecked});
                });
            },

            showItemInFolder: (fullPath: string): Promise<boolean> => {
                return Promise.resolve(electron.shell.showItemInFolder(fullPath));
            },

            openItem: (fullPath: string): Promise<boolean> => {
                return Promise.resolve(electron.shell.openItem(fullPath));
            },

            openExternal: (url: string): Promise<boolean> => {
                return Promise.resolve(electron.shell.openExternal(url));
            },

            copyTextToClipboard: (text: string): Promise<boolean> => {
                return electron.clipboard.writeText(text);
            },
        }
    } else {
        // noinspection JSUnusedLocalSymbols
        return {
            isNativeUI: false,

            showFileOpenDialog: (openDialogOptions: OpenDialogOptions, onClose: (result: OpenDialogResult) => any): void => {
                // UI generated by React component MessageBox
            },


            showFileSaveDialog: (saveDialogOptions: SaveDialogOptions, onClose: (result: SaveDialogResult) => any): void => {
                // UI generated by React
            },

            showMessageBox: (messageBoxOptions: MessageBoxOptions, onClose: (result: MessageBoxResult | null) => any): void => {
                // UI generated by React
            },

            showItemInFolder: (fullPath: string): Promise<boolean> => {
                // UI generated by React
                return Promise.resolve(true);
            },

            copyTextToClipboard: (text: string): Promise<boolean> => {
                return new Promise((callback: (result: boolean) => any) => {
                    copyToClipboard(text, {onCopy: () => callback(true)});
                });
            },
        }
    }
};

export default newDesktopActions();