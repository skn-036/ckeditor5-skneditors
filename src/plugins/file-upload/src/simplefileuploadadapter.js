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
        // const options = this.editor.config.get('simpleFileUpload');

        // if (!options?.url) {
        //     return;
        // }

        this.editor.plugins.get(FileRepository).createUploadAdapter = (
            loader
        ) => {
            return new FileUploadAdapter(loader, this.editor);
        };
    }
}

class FileUploadAdapter {
    constructor(loader, editor) {
        // The file loader instance to use during the upload.
        this.loader = loader;
        this.imageUploadOptions = editor.config.get('simpleUpload');
        this.fileUploadOptions = editor.config.get('simpleFileUpload');
    }

    // Starts the upload process.
    async upload() {
        const file = await this.loader.file;

        if (file.type.includes('image/')) {
            return this.imageUpload(file);
        } else {
            return this.fileUpload(file);
        }
    }

    fileUpload(file) {
        return new Promise((resolve, reject) => {
            this._initFileUploadRequest();
            this._initFileUploadListeners(resolve, reject, file);
            this._sendFileUploadRequest(file);
        });
    }

    imageUpload(file) {
        return new Promise((resolve, reject) => {
            this._initImageUploadRequest();
            this._initImageUploadListeners(resolve, reject, file);
            this._sendImageUploadRequest(file);
        });
    }

    // Aborts the upload process.
    abort() {
        if (this.xhr) {
            this.xhr.abort();
        }
    }

    // Initializes the XMLHttpRequest object using the URL passed to the constructor.
    _initFileUploadRequest() {
        const xhr = (this.xhr = new XMLHttpRequest());

        xhr.open('POST', this.fileUploadOptions?.uploadUrl, true);
        xhr.responseType = 'json';
    }

    // Initializes XMLHttpRequest listeners.
    _initFileUploadListeners(resolve, reject, file) {
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

            resolve(response);
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
    _sendFileUploadRequest(file) {
        // set header request
        const headers = this.fileUploadOptions.headers || {};

        // Use the withCredentials if exist.
        const withCredentials = this.fileUploadOptions.withCredentials || false;

        for (const headerName of Object.keys(headers)) {
            this.xhr.setRequestHeader(headerName, headers[headerName]);
        }

        this.xhr.withCredentials = withCredentials;

        // Prepare the form data.
        const data = new FormData();

        data.append('upload', file);

        if (this.fileUploadOptions?.additionalRequestPayload) {
            Object.entries(
                this.fileUploadOptions?.additionalRequestPayload
            ).forEach(([key, val]) => {
                data.append(key, val);
            });
        }

        // Send the request.
        this.xhr.send(data);
    }

    _initImageUploadRequest() {
        const xhr = (this.xhr = new XMLHttpRequest());
        xhr.open('POST', this.imageUploadOptions?.uploadUrl, true);
        xhr.responseType = 'json';
    }

    _initImageUploadListeners(resolve, reject, file) {
        const xhr = this.xhr;
        const loader = this.loader;
        const genericErrorText = `Couldn't upload file: ${file.name}.`;
        xhr.addEventListener('error', () => reject(genericErrorText));
        xhr.addEventListener('abort', () => reject());
        xhr.addEventListener('load', () => {
            const response = xhr.response;
            if (!response || response.error) {
                return reject(
                    response && response.error && response.error.message
                        ? response.error.message
                        : genericErrorText
                );
            }
            const urls = response.url
                ? { default: response.url }
                : response.urls;

            resolve({
                ...response,
                urls,
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

    _sendImageUploadRequest(file) {
        const headers = this.imageUploadOptions?.headers || {};
        const withCredentials =
            this.imageUploadOptions?.withCredentials || false;
        for (const headerName of Object.keys(headers)) {
            this.xhr.setRequestHeader(headerName, headers[headerName]);
        }
        this.xhr.withCredentials = withCredentials;

        const data = new FormData();
        data.append('upload', file);

        if (this.imageUploadOptions?.additionalRequestPayload) {
            Object.entries(
                this.fileUploadOptions?.additionalRequestPayload
            ).forEach(([key, val]) => {
                data.append(key, val);
            });
        }

        this.xhr.send(data);
    }
}
