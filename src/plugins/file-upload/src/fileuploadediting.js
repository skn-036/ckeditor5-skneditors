import { Plugin } from 'ckeditor5/src/core';
import { Widget, toWidget } from '@ckeditor/ckeditor5-widget';

import { Notification } from 'ckeditor5/src/ui';
import { FileRepository } from 'ckeditor5/src/upload';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon';

import PlaceholderToolbarView from '../theme/placeholdertoolbarview';
import SimpleFileDeleteAdapter from './simplefiledeleteadapter';

import FileUploadCommand from './fileuploadcommand';
import { isDarkColor } from './utils';
import { formatDistanceToNow, isValid } from 'date-fns';

export default class FileUploadEditing extends Plugin {
    /**
     * @inheritDoc
     */
    static get requires() {
        return [FileRepository, Notification, Widget, ContextualBalloon];
    }

    static get pluginName() {
        return 'FileUploadEditing';
    }

    /**
     * @inheritDoc
     */
    constructor(editor) {
        super(editor);

        this._uploadFileElements = new Map();
        this.fileUploadStatus = new Map();

        this.toolbarBallon = null;
        this.toolbarBallonView = null;
        this.config = editor.config.get('simpleFileUpload');
    }

    /**
     * @inheritDoc
     */
    init() {
        const editor = this.editor;
        const doc = editor.model.document;
        const fileRepository = editor.plugins.get(FileRepository);

        this._defineSchema();
        this._defineConverters();
        this._disableKeyboardActions();

        const uploadFileCommand = new FileUploadCommand(editor);

        // Register `uploadImage` command and add `imageUpload` command as an alias for backward compatibility.
        editor.commands.add('fileUpload', uploadFileCommand);

        this.listenTo(
            editor.editing.view.document,
            'clipboardInput',
            (evt, data) => {
                // Skip if non empty HTML data is included.
                // https://github.com/ckeditor/ckeditor5-upload/issues/68
                if (isHtmlIncluded(data.dataTransfer)) {
                    return;
                }

                const files = Array.from(data.dataTransfer.files).filter(
                    (file) => {
                        // See https://github.com/ckeditor/ckeditor5-image/pull/254.
                        if (!file) {
                            return false;
                        }
                        if (!this.config?.fileTypes?.length) return true;
                        return this.config.fileTypes.includes(file.type);
                    }
                );

                if (!files.length) {
                    return;
                }

                evt.stop();

                editor.model.change((writer) => {
                    // Set selection to paste target.
                    if (data.targetRanges) {
                        writer.setSelection(
                            data.targetRanges.map((viewRange) =>
                                editor.editing.mapper.toModelRange(viewRange)
                            )
                        );
                    }

                    // Upload file after the selection has changed in order to ensure the command's state is refreshed.
                    editor.model.enqueueChange(() => {
                        editor.execute('fileUpload', { file: files });
                    });
                });
            }
        );

        // Prevents from the browser redirecting to the dropped image.
        editor.editing.view.document.on('dragover', (evt, data) => {
            data.preventDefault();
        });

        // toggole the toolbar
        this.listenTo(editor.model.document.selection, 'change:range', () => {
            const selectedElement =
                editor.model.document.selection.getSelectedElement();

            if (
                selectedElement &&
                selectedElement.is('element', 'fileUploadPlaceholder') &&
                selectedElement._attrs.get('filePath')
            ) {
                this._setupContextualToolbar(selectedElement);
            } else {
                this._destroyContextualToolbar();
            }
        });

        // Upload placeholder images that appeared in the model.
        doc.on('change', () => {
            // Note: Reversing changes to start with insertions and only then handle removals. If it was the other way around,
            // loaders for **all** images that land in the $graveyard would abort while in fact only those that were **not** replaced
            // by other images should be aborted.
            const changes = doc.differ
                .getChanges({ includeChangesInGraveyard: true })
                .reverse();

            const insertedFilesIds = new Set();

            for (const entry of changes) {
                if (entry.type == 'insert') {
                    const item = entry.position.nodeAfter;

                    const isInsertedInGraveyard =
                        entry.position.root.rootName == '$graveyard';

                    for (const file of getFileLinksFromChangeItem(
                        editor,
                        item
                    )) {
                        // Check if the image element still has upload id.
                        const uploadId = file.getAttribute('fileUid');

                        if (!uploadId) {
                            continue;
                        }

                        // Check if the image is loaded on this client.
                        const loader = fileRepository.loaders.get(uploadId);

                        if (!loader) {
                            continue;
                        }

                        if (isInsertedInGraveyard) {
                            // If the image was inserted to the graveyard for good (**not** replaced by another image),
                            // only then abort the loading process.
                            if (!insertedFilesIds.has(uploadId)) {
                                loader.abort();
                            }
                        } else {
                            // Remember the upload id of the inserted image. If it acted as a replacement for another
                            // image (which landed in the $graveyard), the related loader will not be aborted because
                            // this is still the same image upload.
                            insertedFilesIds.add(uploadId);

                            // Keep the mapping between the upload ID and the image model element so the upload
                            // can later resolve in the context of the correct model element. The model element could
                            // change for the same upload if one image was replaced by another (e.g. image type was changed),
                            // so this may also replace an existing mapping.
                            this._uploadFileElements.set(uploadId, file);

                            if (loader.status == 'idle') {
                                // If the image was inserted into content and has not been loaded yet, start loading it.
                                this._readAndUpload(loader, file);
                            }
                        }
                    }
                }
            }
        });

        // need implementation

        // Set the default handler for feeding the image element with `src` and `srcset` attributes.
        this.on(
            'uploadComplete',
            (evt, data) => {
                if (typeof this.config?.onUploadSuccess === 'function') {
                    this.config?.onUploadSuccess(evt, data);
                }
            },
            { priority: 'low' }
        );
    }

    _defineSchema() {
        const schema = this.editor.model.schema;

        schema.register('fileUploadPlaceholder', {
            inheritAllFrom: '$blockObject',
            isLimit: true,
            allowAttributes: [
                'fileUid',
                'filePath',
                'fileName',
                'fileSize',
                'uploadedAt',
                'uploadedBy',
                'uploadedById',
                'uploadedByColor',
                'uploadStatus',
                'uploadPercent',
            ],
        });
    }

    _defineConverters() {
        const conversion = this.editor.conversion;

        conversion.for('upcast').elementToElement({
            view: {
                name: 'div',
                classes: 'skn-file-upload-placeholder',
                attributes: [
                    'data-file-uid',
                    'data-file-path',
                    'data-file-name',
                ],
            },
            model: (viewElement, { writer: modelWriter }) => {
                const fileUid = viewElement.getAttribute('data-file-uid');
                const filePath = viewElement.getAttribute('data-file-path');
                const fileName = viewElement.getAttribute('data-file-name');
                const fileSize = viewElement.getAttribute('data-file-size');
                const uploadedAt = viewElement.getAttribute('data-uploaded-at');
                const uploadedBy = viewElement.getAttribute('data-uploaded-by');
                const uploadedById = viewElement.getAttribute(
                    'data-uploaded-by-id'
                );
                const uploadedByColor = viewElement.getAttribute(
                    'data-uploaded-by-color'
                );

                const fileUploadPlaceholder = modelWriter.createElement(
                    'fileUploadPlaceholder',
                    {
                        fileUid,
                        filePath,
                        fileName,
                        fileSize,
                        uploadedAt,
                        uploadedBy,
                        uploadedById,
                        uploadedByColor,
                    }
                );

                return fileUploadPlaceholder;
            },

            converterPriority: 'high',
        });

        conversion.for('dataDowncast').elementToElement({
            model: 'fileUploadPlaceholder',
            view: (modelAttributeValue, { writer }) => {
                if (!modelAttributeValue) {
                    return;
                }
                return this._downcastElement(modelAttributeValue, writer);
            },
            converterPriority: 'high',
        });

        conversion.for('editingDowncast').elementToElement({
            model: 'fileUploadPlaceholder',
            view: (modelAttributeValue, { writer }) => {
                if (!modelAttributeValue) {
                    return;
                }
                const divElement = this._downcastElement(
                    modelAttributeValue,
                    writer,
                    true
                );

                return toWidget(divElement, writer, {
                    label: 'simple box widget',
                });
            },
            converterPriority: 'high',
        });
    }

    _downcastElement(modelAttributeValue, viewWriter, isEditing = false) {
        const attrs = modelAttributeValue._attrs;
        const fileId = attrs.get('fileUid');

        let childrens = [];

        const fileNameElement = createFileNameElement(
            viewWriter,
            attrs,
            isEditing
        );
        childrens.push(fileNameElement);

        const fileStatus = this.fileUploadStatus.get(fileId);

        if (isEditing) {
            if (attrs.get('filePath')) {
                const fileInfoElement = createFileInformationElement(
                    viewWriter,
                    attrs
                );
                childrens.push(fileInfoElement);
            } else if (['uploading'].includes(fileStatus?.uploadStatus)) {
                const progressBarElement = createProgressbarElement(
                    viewWriter,
                    fileStatus?.uploadPercent
                );
                childrens.push(progressBarElement);
            } else {
                const pendingElement = createPendingElement(viewWriter);
                childrens.push(pendingElement);
            }
        } else {
            const fileInfoElement = createFileInformationElement(
                viewWriter,
                attrs
            );
            childrens.push(fileInfoElement);
        }

        const divElement = viewWriter.createContainerElement(
            'div',
            {
                class: 'skn-file-upload-placeholder',
                'data-file-uid': attrs.get('fileUid'),
                'data-file-path': attrs.get('filePath'),
                'data-file-name': attrs.get('fileName'),
                'data-file-size': attrs.get('fileSize'),
                'data-uploaded-at': attrs.get('uploadedAt'),
                'data-uploaded-by': attrs.get('uploadedBy'),
                'data-uploaded-by-id': attrs.get('uploadedById'),
                'data-uploaded-by-color': attrs.get('uploadedByColor'),
            },
            childrens,
            {
                // Make attribute to be wrapped by other attribute elements.
                priority: 20,
                // Prevent merging blocks together.
                id: modelAttributeValue._attrs.get('fileUid'),
            }
        );

        return divElement;
    }

    _readAndUpload(loader) {
        const editor = this.editor;
        const model = editor.model;
        const t = editor.locale.t;
        const fileRepository = editor.plugins.get(FileRepository);
        const notification = editor.plugins.get(Notification);
        const fileUploadElements = this._uploadFileElements;

        model.enqueueChange({ isUndoable: false }, (writer) => {
            // writer.setAttribute(
            //     'uploadStatus',
            //     'reading',
            //     fileUploadElements.get(loader.id)
            // );

            this._updatePlaceholderUploading(loader, '0', 'reading');
        });

        loader.on('change:uploadedPercent', (evt, name, value) => {
            model.enqueueChange({ isUndoable: false }, (writer) => {
                this._updatePlaceholderUploading(loader, value?.toFixed(1));
            });
        });

        return loader
            .read()
            .then(() => {
                const promise = loader.upload();

                model.enqueueChange({ isUndoable: false }, (writer) => {
                    this._updatePlaceholderUploading(
                        loader,
                        undefined,
                        'uploading'
                    );
                });

                return promise;
            })
            .then(async (response) => {
                model.enqueueChange({ isUndoable: false }, (writer) => {
                    const fileElement = fileUploadElements.get(loader.id);
                    writer.setAttributes(
                        {
                            filePath: response.url,
                        },
                        fileElement
                    );

                    this.fire('uploadComplete', { response, fileElement });
                });

                clean();
                this._updatePlaceholderUploading(loader, '', null);
                this.fileUploadStatus.delete(loader.id);
            })
            .catch((error) => {
                // If status is not 'error' nor 'aborted' - throw error because it means that something else went wrong,
                // it might be generic error and it would be real pain to find what is going on.
                if (loader.status !== 'error' && loader.status !== 'aborted') {
                    throw error;
                }

                // Might be 'aborted'.
                if (loader.status == 'error' && error) {
                    notification.showWarning(error, {
                        title: t('Upload failed'),
                        namespace: 'upload',
                    });
                }

                // Permanently remove image from insertion batch.
                model.enqueueChange({ isUndoable: false }, (writer) => {
                    writer.remove(fileUploadElements.get(loader.id));
                });

                clean();
            });

        function clean() {
            model.enqueueChange({ isUndoable: false }, (writer) => {
                // writer.removeAttribute('uploadPercent', fileElement);

                fileUploadElements.delete(loader.id);
            });

            fileRepository.destroyLoader(loader);
        }
    }

    _updatePlaceholderUploading(loader, uploadPercent = '0', uploadStatus) {
        let data = this.fileUploadStatus.get(loader.id)
            ? this.fileUploadStatus.get(loader.id)
            : {};

        if (uploadPercent !== undefined) data = { ...data, uploadPercent };
        if (uploadStatus !== undefined) data = { ...data, uploadStatus };

        this.fileUploadStatus.set(loader.id, data);

        const rootElement = this.editor.model.document.getRoot();

        for (const { item } of this.editor.model.createRangeIn(rootElement)) {
            if (
                item.is('element', 'fileUploadPlaceholder') &&
                item._attrs.get('fileUid') === loader.id
            ) {
                this.editor.editing.reconvertItem(item);
            }
        }
    }

    _disableKeyboardActions() {
        const safeKeys = [
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Enter',
            'Tab',
        ];

        ['keyup', 'keydown', 'dragstart'].forEach((eventName) => {
            if (
                !this.config?.disableRemoveByKeyboard &&
                ['keyup', 'keydown'].includes(eventName)
            ) {
                return;
            }
            if (
                !this.config?.disableDrag &&
                ['dragstart'].includes(eventName)
            ) {
                return;
            }
            this.editor.editing.view.document.on(
                eventName,
                (evt, data) => {
                    const selection = this.editor.model.document.selection;
                    const selectedEl = selection?.getSelectedElement();
                    if (!selectedEl) return;

                    const isPlaceholderBlock = selectedEl?.is(
                        'element',
                        'fileUploadPlaceholder'
                    );

                    if (
                        !isPlaceholderBlock ||
                        safeKeys.includes(data?.domEvent?.key)
                    )
                        return;

                    data?.preventDefault();
                    evt.stop();
                },
                { priority: 'high' }
            );
        });
    }

    _setupContextualToolbar(element) {
        const editor = this.editor;

        this.toolbarPlaceholderView = new PlaceholderToolbarView(editor.locale);

        if (!this.toolbarBallon) {
            this.toolbarBallon = editor.plugins.get(ContextualBalloon);
        }

        const id = element._attrs.get('fileUid');
        const target = document.querySelector(`[data-file-uid="${id}"]`);

        this.toolbarBallon.add({
            view: this.toolbarPlaceholderView,
            singleViewMode: true,
            position: {
                target,
            },
        });

        this.toolbarPlaceholderView.on('download-file', () => {
            const filePath = element._attrs.get('filePath');
            const fileName = element._attrs.get('fileName');

            const document = window.document;
            const link = document.createElement('a');
            link.href = filePath;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this._destroyContextualToolbar();
        });

        this.toolbarPlaceholderView.on('delete-file', async () => {
            await this._deleteFilePermanently(element);
        });
    }

    _destroyContextualToolbar() {
        if (!this.toolbarBallon) return;
        // if (typeof this.toolbarBallon?.view?.hide === 'function')
        //     this.toolbarBallon.view.hide();

        if (this.toolbarBallon?.view) {
            this.toolbarBallon.view.hide();
            this.toolbarBallon.view.unpin();
        }
    }

    async _deleteFilePermanently(element) {
        let deleted = false;

        if (typeof this.config?.onDelete === 'function') {
            deleted = await this.config?.onDelete(element._attrs, element);
        } else if (this.config?.deleteUrl) {
            const adapter = new SimpleFileDeleteAdapter(this.editor, element);
            deleted = await adapter.deleteFile();

            if (!deleted) {
                window.alert('Failed to delete!!!');
                return;
            }
        } else {
            deleted = true;
        }

        if (deleted) {
            this.editor.model.enqueueChange({ isUndoable: false }, (writer) => {
                writer.remove(element);
                this._destroyContextualToolbar();
            });
        }
    }
}

// Returns `true` if non-empty `text/html` is included in the data transfer.
//
// @param {module:engine/view/datatransfer~DataTransfer} dataTransfer
// @returns {Boolean}
export function isHtmlIncluded(dataTransfer) {
    return (
        Array.from(dataTransfer.types).includes('text/html') &&
        dataTransfer.getData('text/html') !== ''
    );
}

function getFileLinksFromChangeItem(editor, item) {
    if (!item?.parent) return [];
    return Array.from(editor.model.createRangeOn(item))
        .filter((value) => value.item.hasAttribute('fileUid'))
        .map((value) => value.item);
}

function createFileNameElement(viewWriter, attrs, isEditing) {
    return viewWriter.createRawElement(
        'div',
        {
            class: 'skn-file-upload-placeholder__title-container',
        },
        function (domElement) {
            const downloadSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

            const html = `
                <div class="skn-file-upload-placeholder__title-wrapper">
                    <div class="skn-file-upload-placeholder__title">${attrs.get(
                        'fileName'
                    )} (${attrs.get('fileSize')})</div>
                    ${
                        isEditing
                            ? ''
                            : `
                        <a href="${attrs.get(
                            'filePath'
                        )}" download="${attrs.get(
                                  'fileName'
                              )}" target="_blank" class="skn-file-upload-placeholder__link">
                            ${downloadSvg}
                        </a>
                    `
                    }
                </div>
            `;
            domElement.innerHTML = html;
        }
    );
}

function createFileInformationElement(viewWriter, attrs) {
    return viewWriter.createRawElement(
        'div',
        { class: 'skn-file-upload-placeholder__file_info' },
        function (domElement) {
            const userColor = attrs.get('uploadedByColor');
            const userName = attrs.get('uploadedBy');
            const uploadDate = isValid(new Date(attrs.get('uploadedAt')))
                ? formatDistanceToNow(new Date(attrs.get('uploadedAt')))
                : '';
            const html = `
            <div class="skn-file-upload-placeholder__file_info__container">
                ${
                    userColor
                        ? `<div class="skn-file-upload-placeholder__file_info__avatar" style="background: ${userColor}; color: ${
                              isDarkColor(userColor) ? '#ffffff' : '#121212'
                          }">${Array.from(userName)[0]}</div>`
                        : ''
                }
                <div class="skn-file-upload-placeholder__file_info__desc">
                    Uploaded by ${userName} ${
                uploadDate ? `${uploadDate} ago` : ''
            }
                <div>
            </div>
            `;

            domElement.innerHTML = html;
        }
    );
}

function createProgressbarElement(viewWriter, uploadPercent) {
    return viewWriter.createRawElement(
        'div',
        { class: 'skn-file-upload-placeholder__file_progress__container' },
        function (domElement) {
            const html = `
                <div class="skn-file-upload-placeholder__file_progress__progressbar">
                    <div class="skn-file-upload-placeholder__file_progress__progressbar_progress" style="width: ${
                        uploadPercent ? `${uploadPercent}%` : null
                    }"></div>
                </div>
                <div  class="skn-file-upload-placeholder__file_progress__progressbar_percent">${
                    uploadPercent ? `${uploadPercent}%` : ''
                }</div>
            `;
            domElement.innerHTML = html;
        }
    );
}

function createPendingElement(viewWriter) {
    return viewWriter.createRawElement(
        'div',
        {
            class: 'skn-file-upload-placeholder__pending',
        },
        function (domElement) {
            domElement.innerText = 'pending...';
        }
    );
}
