import { logWarning } from '@ckeditor/ckeditor5-utils';

export default class SimpleFileDeleteAdapter {
    constructor(editor, element) {
        this.editor = editor;
        this.element = element;

        this.options = this.editor.config.get('simpleFileUpload');

        if (!this.options) {
            return;
        }

        if (!this.options.deleteUrl) {
            logWarning(
                'delete-url-property-is-missing-on-simple-file-upload-config'
            );
            return;
        }
    }

    deleteFile() {
        return new Promise((resolve, reject) => {
            this._initRequest();
            this._initListeners(resolve, reject);
            this._sendRequest();
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

        xhr.open('DELETE', this.options.deleteUrl, true);
        xhr.responseType = 'json';
    }

    // Initializes XMLHttpRequest listeners.
    _initListeners(resolve, reject) {
        const xhr = this.xhr;
        const genericErrorText = `Couldn't delete file: ${this.element?._attrs.get(
            'fileName'
        )}.`;

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
    }

    // Prepares the data and sends the request.
    _sendRequest() {
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
        for (const [key, value] of this.element._attrs) {
            data.append(key, value);
        }

        // Send the request.
        this.xhr.send(data);
    }
}
