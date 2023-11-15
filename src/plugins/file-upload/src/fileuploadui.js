import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileDialogButtonView from '@ckeditor/ckeditor5-upload/src/ui/filedialogbuttonview';
import fileUploadIcon from '../theme/icons/fileupload.svg';

/**
 * The file upload button plugin.
 *
 * Adds the `'fileUpload'` button to the {@link module:ui/componentfactory~ComponentFactory UI component factory}.
 *
 * @extends module:core/plugin~Plugin
 */
export default class FileUploadUI extends Plugin {
    /**
     * @inheritDoc
     */
    init() {
        const editor = this.editor;
        const t = editor.t;

        // Setup `fileUpload` button.
        editor.ui.componentFactory.add('fileUpload', (locale) => {
            const view = new FileDialogButtonView(locale);
            const command = editor.commands.get('fileUpload');

            const config = editor.config.get('simpleFileUpload');
            const fileTypes = config?.fileTypes;

            const acceptedType = fileTypes?.length
                ? fileTypes.map((type) => `${type}`).join(',')
                : null;

            view.set({
                acceptedType,
                allowMultipleFiles: true,
            });

            view.buttonView.set({
                label: t('Insert file'),
                icon: fileUploadIcon,
                tooltip: true,
            });

            view.buttonView.bind('isEnabled').to(command);

            view.on('done', (evt, file) => {
                if (!config?.url) return;
                const fileToUpload = file;

                if (fileToUpload.length) {
                    editor.execute('fileUpload', { file: fileToUpload });
                }
            });

            return view;
        });
    }
}
