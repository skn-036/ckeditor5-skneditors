import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';
import Command from '@ckeditor/ckeditor5-core/src/command';
// import { format } from 'date-fns';
import { insertFileLink, isFileAllowed, getFileSize } from './utils';

export default class FileUploadCommand extends Command {
    /**
     * @inheritDoc
     */

    constructor(editor) {
        super(editor);
        this.config = this.editor.config.get('simpleFileUpload');
    }

    refresh() {
        const hasUrl = Boolean(this.config?.uploadUrl);
        this.isEnabled = hasUrl;
    }

    /**
     * Executes the command.
     *
     * @fires execute
     * @param {Object} options Options for the executed command.
     * @param {File|Array.<File>} options.file The file or an array of files to upload.
     */
    execute(options) {
        const editor = this.editor;
        const model = editor.model;

        const fileRepository = editor.plugins.get(FileRepository);

        const filesToUpload = options.file;

        model.change((writer) => {
            for (const file of filesToUpload) {
                this._uploadFile(writer, model, fileRepository, file);
            }
        });
    }

    _uploadFile(writer, model, fileRepository, file) {
        const loader = fileRepository.createLoader(file);

        const config = this.editor.config.get('simpleFileUpload');
        const user = Object.assign(
            { id: '', name: '', variantColor: '' },
            typeof config?.uploadedBy === 'function' ? config.uploadedBy() : {}
        );

        let attributes = {
            fileUid: loader.id,
            filePath: '',
            fileName: file.name,
            fileSize: getFileSize(file.size),
            uploadedAt: new Date().toString(),
            uploadedBy: user?.name,
            uploadedById: user?.id,
            uploadedByColor: user?.variantColor,
        };

        // Do not throw when upload adapter is not set. FileRepository will log an error anyway.
        if (!loader) {
            return;
        }

        const placeholder = this._insertPlaceholder(writer, attributes);

        model.insertObject(placeholder, null, null, {
            setSelection: 'after',
        });
    }

    _insertPlaceholder(writer, attributes) {
        const placeholder = writer.createElement(
            'fileUploadPlaceholder',
            attributes
        );
        return placeholder;
    }
}
