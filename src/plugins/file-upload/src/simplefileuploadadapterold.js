import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';
import { logWarning } from '@ckeditor/ckeditor5-utils';

export default class SimpleFileUploadAdapter extends Plugin {
    /**
     * @inheritDoc
     */
    static get requires() {
        return [FileRepository];
    }

    /**
     * @inheritDoc
     */
    static get pluginName() {
        return 'SimpleFileUploadAdapter';
    }

    /**
     * @inheritDoc
     */
    init() {
        const options = this.editor.config.get('simpleFileUpload');

        if (!options?.url) {
            return;
        }

        this.editor.plugins.get(FileRepository).createUploadAdapter = (
            loader
        ) => {
            console.log(loader.id, 'const');
            return new FileUploadAdapter(loader, this.editor);
        };
    }
}

class FileUploadAdapter {
    constructor(loader, editor) {
        // The file loader instance to use during the upload.
        this.loader = loader;
        this.imageUploadOptions = editor.config.get('');
        this.options = options;
    }

    // Starts the upload process.
    async upload() {
        const file = await this.loader.file;
        if (file.type.includes('image/')) {
            console.log('Tried to uplaod a image');
            return;
        }

        return new Promise((resolve, reject) => {
            this._initRequest();
            this._initListeners(resolve, reject, file);
            this._sendRequest(file);
        });
    }

    // Aborts the upload process.
    abort() {
        if (this.xhr) {
            this.xhr.abort();
        }
    }

    // Initializes the XMLHttpRequest object using the URL passed to the constructor.
    _initRequest() {
        const xhr = (this.xhr = new XMLHttpRequest());

        xhr.open('POST', this.options.url, true);
        xhr.responseType = 'json';
    }

    // Initializes XMLHttpRequest listeners.
    _initListeners(resolve, reject, file) {
        const xhr = this.xhr;
        const loader = this.loader;
        const genericErrorText = `Couldn't upload file: ${file.name}.`;

        xhr.addEventListener('error', () => reject(genericErrorText));
        xhr.addEventListener('abort', () => reject());
        xhr.addEventListener('load', () => {
            const response = xhr.response;

            if (!response || response.error) {
                return reject(
                    response && response.error
                        ? response.error.message
                        : genericErrorText
                );
            }

            resolve({
                // ...response,
                filePath: response.url,
            });
        });

        if (xhr.upload) {
            xhr.upload.addEventListener('progress', (evt) => {
                if (evt.lengthComputable) {
                    loader.uploadTotal = evt.total;
                    loader.uploaded = evt.loaded;
                }
            });
        }
    }

    // Prepares the data and sends the request.
    _sendRequest(file) {
        // set header request
        const headers = this.options.headers || {};

        // Use the withCredentials if exist.
        const withCredentials = this.options.withCredentials || false;

        for (const headerName of Object.keys(headers)) {
            this.xhr.setRequestHeader(headerName, headers[headerName]);
        }

        this.xhr.withCredentials = withCredentials;

        // Prepare the form data.
        const data = new FormData();

        data.append('upload', file);
        if (this.options?.additionalRequestPayload) {
            Object.entries(this.options?.additionalRequestPayload).forEach(
                ([key, val]) => {
                    data.append(key, val);
                }
            );
        }

        // Send the request.
        this.xhr.send(data);
    }
}
